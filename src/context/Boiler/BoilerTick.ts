import {
  calculateBoilerPressure,
  calculateFlashedMass,
  calculateWaterVolume,
  calculateGasEnergy,
} from "../../utils/boilerCalculations"
import { CriticalTemperature, getLatentHeat, getWaterDensity, getWaterSpecificHeat } from "../../utils/steamTable"
import { CstSimulation, CstPhysics } from "../const"
import { BoilerState, TurbineState } from "../PowerPlantState"

const { CstBoiler, CstTurbine } = CstSimulation

function BoilerTick(boilerState: BoilerState): BoilerState {
  // console.log("5")
  let newWaterVolume = boilerState.waterVolume
  let energyChange = 0
  let drained = 0
  // let removedSteamMass = 0
  // let steamRemovalEnergyLoss = 0

  // Handle draining; the boiler is fed only by the condensation pump
  if (boilerState.drainValveOpen) {
    const drainAmount = CstBoiler.TotalVolume * CstBoiler.DrainingRate * CstSimulation.DeltaTime

    // Calculate the ratio of water being drained
    const originalVolume = boilerState.waterVolume
    newWaterVolume = Math.max(0, newWaterVolume - drainAmount)
    drained = originalVolume - newWaterVolume

    if (originalVolume > 0) {
      // Temperature doesn't change when draining (assuming uniform temperature)
      // But total energy is reduced proportionally
      const drainRatio = drainAmount / originalVolume
      // Remove the same proportion of energy
      energyChange -= boilerState.energy * drainRatio
    }
  }

  // Water mass (kg) after draining, from the temperature-dependent density
  const waterDensity =
    boilerState.temperature < 80 ? CstPhysics.Water_Density : getWaterDensity(boilerState.temperature)
  const waterMass = (newWaterVolume * waterDensity) / 1000

  // Energy from the gas actually flowing
  const gasEnergy = calculateGasEnergy(boilerState.gasFlow) * CstSimulation.DeltaTime
  energyChange += gasEnergy

  // Natural cooling - use temperature-dependent specific heat; it stops at ambient so energy keeps matching temperature
  const specificHeat = getWaterSpecificHeat(boilerState.temperature)
  const energyAboveAmbient = Math.max(0, waterMass * specificHeat * (boilerState.temperature - CstPhysics.AmbientTemperature))
  const coolingEnergyLoss = Math.min(
    energyAboveAmbient,
    waterMass * specificHeat * CstBoiler.CoolingRate * CstSimulation.DeltaTime,
  )
  energyChange -= coolingEnergyLoss

  // The net heat warms the water (water-only thermal mass, #13 adds the metal)
  // and stops at the critical point, where the saturated model ends (a boiler run dry would otherwise run away)
  const heatedTemperature =
    waterMass <= 0
      ? boilerState.temperature
      : Math.min(
          CriticalTemperature,
          boilerState.temperature + (gasEnergy - coolingEnergyLoss) / (waterMass * specificHeat),
        )

  // The steam space holds saturated steam; water flashes to steam (or steam condenses) to restore that inventory,
  // and the latent heat comes from, or returns to, the water. A steam draw leaves a deficit, so it cools the water.
  const flashedMass = calculateFlashedMass(heatedTemperature, waterMass, newWaterVolume, boilerState.steamMass)
  const flashEnergy = flashedMass * getLatentHeat(heatedTemperature)
  energyChange -= flashEnergy

  // The liquid lost to steam, at the volume 1 kg of water takes at the current temperature
  newWaterVolume = Math.min(
    CstBoiler.TotalVolume,
    Math.max(0, newWaterVolume - flashedMass * calculateWaterVolume(1, heatedTemperature)),
  )

  const newEnergy = Math.max(0, boilerState.energy + energyChange)
  const newSteamMass = Math.max(0, boilerState.steamMass + flashedMass)

  // Natural cooling never goes below ambient
  const newTemperature =
    waterMass <= 0
      ? boilerState.temperature
      : Math.max(CstPhysics.AmbientTemperature, heatedTemperature - flashEnergy / (waterMass * specificHeat))

  const newPressure = calculateBoilerPressure(newTemperature)

  // average the values for a better UX
  return {
    ...boilerState,
    waterVolume: newWaterVolume,
    drainedTotal: boilerState.drainedTotal + drained,
    temperature: newTemperature,
    pressure: newPressure, //averageTwo(boilerState.pressure, newPressure),
    steamMass: newSteamMass, // averageTwo(boilerState.steamMass, newSteamMass),
    energy: newEnergy,
    energyDelta: energyChange / CstSimulation.DeltaTime, // averageTwo(boilerState.energyDelta, energyChange / CstSimulation.DeltaTime),
    // deltaWaterVolume: newWaterVolume - boilerState.waterVolume, // averageTwo(boilerState.deltaWaterVolume, newWaterVolume - boilerState.waterVolume),
    deltaSteamMass: flashedMass / CstSimulation.DeltaTime, // kg/s flashed to steam (negative: condensing)
  }
}

// --- Steam Removal Calculation ---
export function BoilerRemoveSteam(
  boilerState: BoilerState,
  turbineState: TurbineState,
  removeBy: "BYPASS" | "TURBINE" | "VENT",
): { boilerState: BoilerState; turbineState: TurbineState } {
  // console.log("4")
  const { steamMass } = boilerState

  const {
    mainSteamValve,
    bypassValvePosition,
    bypassSteamFlowOut,
    turbineValvePosition,
    turbineSteamFlowOut,
  } = turbineState

  const valvePosition =
    removeBy === "BYPASS" ? bypassValvePosition : removeBy === "TURBINE" ? turbineValvePosition : 0

  // Only attempt to remove steam if the main steam valve is open
  if (!mainSteamValve) {
    return {
      boilerState,
      turbineState: {
        ...turbineState,
        turbineSteamFlowOut: 0,
        bypassSteamFlowOut: 0,
      },
    }
  }

  // The valve passes at most its rate (kg/s) over one tick, and never more than the boiler holds
  const valveMassPerTick = valvePosition * CstTurbine.MaxSteamRemovalRate * CstSimulation.DeltaTime
  const removedSteamMass = Math.min(steamMass, valveMassPerTick)
  const newSteamMass = steamMass - removedSteamMass

  return {
    boilerState: {
      ...boilerState,
      steamMass: newSteamMass,
    },
    turbineState: {
      ...turbineState,
      turbineSteamFlowOut:
        removeBy === "TURBINE" ? removedSteamMass / CstSimulation.DeltaTime : turbineSteamFlowOut,
      bypassSteamFlowOut:
        removeBy === "BYPASS" ? removedSteamMass / CstSimulation.DeltaTime : bypassSteamFlowOut,
    },
  }
}

export default BoilerTick
