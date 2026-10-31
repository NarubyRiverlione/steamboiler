import {
  calculateBoilerPressure,
  calculateFlashedMass,
  calculateWaterVolume,
  calculateGasEnergy,
} from "../../utils/boilerCalculations"
import {
  CriticalTemperature,
  getBoilingPoint,
  getLatentHeat,
  getWaterDensity,
  getWaterSpecificHeat,
} from "../../utils/steamTable"
import { CstSimulation, CstPhysics } from "../const"
import { BoilerState, TurbineState } from "../PowerPlantState"

const { CstBoiler, CstTurbine } = CstSimulation

type Drain = { waterVolume: number; drained: number; energyLoss: number }

// The open drain removes a fixed share of the total volume per tick, with the same share of the energy
// (uniform temperature); the boiler is fed only by the condensation pump
export function drainBoiler({ drainValveOpen, waterVolume, energy }: BoilerState): Drain {
  if (!drainValveOpen || waterVolume <= 0) return { waterVolume, drained: 0, energyLoss: 0 }
  const drainAmount = CstBoiler.TotalVolume * CstBoiler.DrainingRate * CstSimulation.DeltaTime
  const newWaterVolume = Math.max(0, waterVolume - drainAmount)
  return {
    waterVolume: newWaterVolume,
    drained: waterVolume - newWaterVolume,
    energyLoss: energy * (drainAmount / waterVolume),
  }
}

// Water mass (kg) of a volume (L), from the temperature-dependent density (the table starts at 80 °C)
export function waterMassOf(waterVolume: number, temperature: number): number {
  const density = temperature < 80 ? CstPhysics.Water_Density : getWaterDensity(temperature)
  return (waterVolume * density) / 1000
}

// Temperature after an energy change (kJ) into a heat capacity (kJ/K); an empty boiler keeps its temperature
export function warmBy(temperature: number, energy: number, heatCapacity: number): number {
  return heatCapacity > 0 ? temperature + energy / heatCapacity : temperature
}

function BoilerTick(boilerState: BoilerState): BoilerState {
  const drain = drainBoiler(boilerState)
  const waterMass = waterMassOf(drain.waterVolume, boilerState.temperature)
  // kJ/K, water only (#13 adds the metal)
  const heatCapacity = waterMass * getWaterSpecificHeat(boilerState.temperature)

  // Energy from the gas actually flowing
  const gasEnergy = calculateGasEnergy(boilerState.gasFlow) * CstSimulation.DeltaTime

  // Natural cooling at a constant rate; it stops at ambient so energy keeps matching temperature
  const energyAboveAmbient = Math.max(
    0,
    heatCapacity * (boilerState.temperature - CstPhysics.AmbientTemperature),
  )
  const coolingEnergyLoss = Math.min(
    energyAboveAmbient,
    heatCapacity * CstBoiler.CoolingRate * CstSimulation.DeltaTime,
  )

  // The net heat warms the water and stops at the critical point, where the saturated model ends
  // (a boiler run dry would otherwise run away)
  const heatedTemperature = Math.min(
    CriticalTemperature,
    warmBy(boilerState.temperature, gasEnergy - coolingEnergyLoss, heatCapacity),
  )

  // The steam space holds saturated steam; water flashes to steam (or steam condenses) to restore that inventory,
  // and the latent heat comes from, or returns to, the water. A steam draw leaves a deficit, so it cools the water.
  const flashedMass = calculateFlashedMass(
    heatedTemperature,
    waterMass,
    drain.waterVolume,
    boilerState.steamMass,
  )
  const flashEnergy = flashedMass * getLatentHeat(heatedTemperature)
  const energyChange = gasEnergy - drain.energyLoss - coolingEnergyLoss - flashEnergy

  // The liquid lost to steam, at the volume 1 kg of water takes at the current temperature
  const newWaterVolume = Math.min(
    CstBoiler.TotalVolume,
    Math.max(0, drain.waterVolume - flashedMass * calculateWaterVolume(1, heatedTemperature)),
  )

  // Natural cooling never goes below ambient
  const newTemperature = Math.max(
    CstPhysics.AmbientTemperature,
    warmBy(heatedTemperature, -flashEnergy, heatCapacity),
  )

  return {
    ...boilerState,
    waterVolume: newWaterVolume,
    drainedTotal: boilerState.drainedTotal + drain.drained,
    temperature: newTemperature,
    pressure: calculateBoilerPressure(newTemperature),
    steamMass: Math.max(0, boilerState.steamMass + flashedMass),
    energy: Math.max(0, boilerState.energy + energyChange),
    energyDelta: energyChange / CstSimulation.DeltaTime,
    deltaSteamMass: flashedMass / CstSimulation.DeltaTime, // kg/s flashed to steam (negative: condensing)
  }
}

// Relief capacity (kg/s): the steam full gas makes at the opening pressure, with the capacity margin on top
export const ReliefCapacity =
  (CstBoiler.ReliefCapacityMargin * calculateGasEnergy(CstBoiler.MaxGasFlow)) /
  getLatentHeat(getBoilingPoint(CstBoiler.ReliefOpenPressure))

// The relief valve on the drum vents steam to the atmosphere, upstream of the main steam valve. It decides on the
// pressure at the start of the tick: fully open from the opening pressure until it falls to the closing pressure
// (the blowdown).
export function BoilerVent(boilerState: BoilerState): BoilerState {
  const { reliefValveOpen: wasOpen, pressure, steamMass } = boilerState
  const open = wasOpen ? pressure > CstBoiler.ReliefClosePressure : pressure >= CstBoiler.ReliefOpenPressure
  if (!open) return { ...boilerState, reliefValveOpen: false }
  const vented = Math.min(steamMass, ReliefCapacity * CstSimulation.DeltaTime)
  return {
    ...boilerState,
    reliefValveOpen: true,
    steamMass: steamMass - vented,
    ventedTotal: boilerState.ventedTotal + vented,
    reliefLifts: boilerState.reliefLifts + (wasOpen ? 0 : 1),
  }
}

type SteamOutlet = "BYPASS" | "TURBINE"

// Position of the valve the steam leaves through
export function valvePositionFor(turbineState: TurbineState, removeBy: SteamOutlet): number {
  return removeBy === "BYPASS" ? turbineState.bypassValvePosition : turbineState.turbineValvePosition
}

// Report the flow (kg/s) on the outlet it went through, leaving the other outlet's flow as it was
function withSteamFlowOut(turbineState: TurbineState, removeBy: SteamOutlet, flow: number): TurbineState {
  return removeBy === "TURBINE"
    ? { ...turbineState, turbineSteamFlowOut: flow }
    : { ...turbineState, bypassSteamFlowOut: flow }
}

// --- Steam Removal Calculation ---
export function BoilerRemoveSteam(
  boilerState: BoilerState,
  turbineState: TurbineState,
  removeBy: SteamOutlet,
): { boilerState: BoilerState; turbineState: TurbineState } {
  // Only attempt to remove steam if the main steam valve is open
  if (!turbineState.mainSteamValve) {
    return { boilerState, turbineState: { ...turbineState, turbineSteamFlowOut: 0, bypassSteamFlowOut: 0 } }
  }

  // The valve passes at most its rate (kg/s) over one tick, and never more than the boiler holds
  const valveMassPerTick =
    valvePositionFor(turbineState, removeBy) * CstTurbine.MaxSteamRemovalRate * CstSimulation.DeltaTime
  const removedSteamMass = Math.min(boilerState.steamMass, valveMassPerTick)

  return {
    boilerState: { ...boilerState, steamMass: boilerState.steamMass - removedSteamMass },
    turbineState: withSteamFlowOut(turbineState, removeBy, removedSteamMass / CstSimulation.DeltaTime),
  }
}

export default BoilerTick
