import {
  calculateBoilerPressure,
  calculateFlashedMass,
  waterMassOf,
  waterVolumeOf,
  calculateGasEnergy,
  valveFlowFactor,
} from "../../utils/boilerCalculations"
import {
  CriticalTemperature,
  getBoilingPoint,
  getLatentHeat,
  getLiquidEnthalpy,
  getWaterSpecificHeat,
} from "../../utils/steamTable"
import { CstSimulation, CstPhysics } from "../const"
import { BoilerState, TurbineState } from "../PowerPlantState"
import { calculateFlueGasHeatBalance } from "../../utils/flueGas"

const { CstBoiler, CstTurbine } = CstSimulation

// kJ/K of the drum and tube steel, which shares the water temperature (one lump)
export const MetalHeatCapacity = CstBoiler.MetalMass * CstPhysics.Steel_SpecificHeat

// Heat content (kJ) of the metal above 0 °C, the datum of the boiler energy
export function metalEnergyOf(temperature: number): number {
  return MetalHeatCapacity * temperature
}

// Gas rate (L/s per second) for a knob command from -1 to 1: nothing inside the dead zone, then a quadratic taper to
// GasRateMax at full deflection, so small turns trim and large turns ramp (#15)
export function gasRateOf(command: number): number {
  const deflection: number = Math.abs(command)
  if (deflection <= CstBoiler.GasRateDeadZone) return 0
  const live: number = Math.min(1, (deflection - CstBoiler.GasRateDeadZone) / (1 - CstBoiler.GasRateDeadZone))
  return Math.sign(command) * live * live * CstBoiler.GasRateMax
}

// The gas follows the knob: its flow is the integral of the rate, clamped to 0 to MaxGasFlow (the knob stays put)
function gasFlowAfter({ gasFlow, gasRateCommand }: BoilerState): number {
  return Math.min(
    CstBoiler.MaxGasFlow,
    Math.max(0, gasFlow + gasRateOf(gasRateCommand) * CstSimulation.DeltaTime),
  )
}

type Drain = { waterMass: number; drained: number; energyLoss: number }

// The open drain removes a fixed share of the total volume per tick, in kg at the boiler temperature, with the same
// share of the energy (uniform temperature) of the water, not of the metal; the boiler is fed only by the
// condensation pump
export function drainBoiler({ drainValveOpen, waterMass, temperature, energy }: BoilerState): Drain {
  if (!drainValveOpen || waterMass <= 0) return { waterMass, drained: 0, energyLoss: 0 }
  const drainVolume = CstBoiler.TotalVolume * CstBoiler.DrainingRate * CstSimulation.DeltaTime
  const drainAmount = Math.min(waterMass, waterMassOf(drainVolume, temperature))
  return {
    waterMass: waterMass - drainAmount,
    drained: drainAmount,
    energyLoss: (energy - metalEnergyOf(temperature)) * (drainAmount / waterMass),
  }
}

// Heat loss (kW) per kelvin above ambient, from the loss at design temperature
const HeatLossUA = CstBoiler.HeatLossAtDesign / (CstBoiler.DesignTemperature - CstPhysics.AmbientTemperature)

// Heat lost to the surroundings (kW), proportional to the difference with ambient; none at or below it
export function heatLossOf(temperature: number): number {
  return HeatLossUA * Math.max(0, temperature - CstPhysics.AmbientTemperature)
}

// Temperature after an energy change (kJ) into a heat capacity (kJ/K); an empty boiler keeps its temperature
export function warmBy(temperature: number, energy: number, heatCapacity: number): number {
  return heatCapacity > 0 ? temperature + energy / heatCapacity : temperature
}

// Rate of rise (K/s) smoothed with time constant HeatingRateWindow: each tick moves it a share of the way
// to this tick's rate
export function smoothHeatingRate(previous: number, temperatureChange: number): number {
  const instant = temperatureChange / CstSimulation.DeltaTime
  return previous + (instant - previous) * (CstSimulation.DeltaTime / CstBoiler.HeatingRateWindow)
}

// Heat (kJ) a Return mass (kg) at this temperature brings, against the same mass at the boiler temperature: negative
// when it is colder, positive when it is hotter. Saturated liquid enthalpy, so the rise of cp near the critical point counts.
export function returnHeatOf(mass: number, returnTemperature: number, boilerTemperature: number): number {
  return mass * (getLiquidEnthalpy(returnTemperature) - getLiquidEnthalpy(boilerTemperature))
}

// The Return as the economizer sees it: kg/s and the hotwell temperature it leaves at
export type ReturnFeed = { flow: number; temperature: number }

const NoReturn: ReturnFeed = { flow: 0, temperature: CstPhysics.AmbientTemperature }

function BoilerTick(previousState: BoilerState, returnFeed: ReturnFeed = NoReturn): BoilerState {
  // The gas of this tick is the gas after this tick's step of the knob
  const boilerState: BoilerState = { ...previousState, gasFlow: gasFlowAfter(previousState) }
  const drain = drainBoiler(boilerState)
  const waterMass = drain.waterMass
  // kJ/K, the water and the metal at one temperature
  const heatCapacity = waterMass * getWaterSpecificHeat(boilerState.temperature) + MetalHeatCapacity

  // Energy from the gas actually flowing: the fuel heat less the stack heat, the economizer included (ADR 0029)
  const balance = calculateFlueGasHeatBalance(
    boilerState.gasFlow,
    boilerState.temperature,
    returnFeed.flow,
    returnFeed.temperature,
  )
  // The boiler-stage share of that heat: the economizer heat is already in the Return's own enthalpy below
  const gasEnergy = (balance.heatIntoWater - balance.economizerHeat) * CstSimulation.DeltaTime

  // The Return pays its real enthalpy (ADR 0030): this tick's Return mass joined at the boiler temperature, and entered
  // at its temperature after the economizer. Enthalpy, not cp x dT: cp near 350 °C is more than double the cold value.
  const returnEnergy = returnHeatOf(
    returnFeed.flow * CstSimulation.DeltaTime,
    balance.returnTemperatureOut,
    boilerState.temperature,
  )

  // Heat lost to the surroundings this tick
  const heatLoss = heatLossOf(boilerState.temperature)
  const heatLossEnergy = heatLoss * CstSimulation.DeltaTime

  // The net heat warms the water and stops at the critical point, where the saturated model ends
  // (a boiler run dry would otherwise run away)
  const heatedTemperature = Math.min(
    CriticalTemperature,
    warmBy(boilerState.temperature, gasEnergy + returnEnergy - heatLossEnergy, heatCapacity),
  )

  // The steam space holds saturated steam; water flashes to steam (or steam condenses) to restore that inventory,
  // and the latent heat comes from, or returns to, the water. A steam draw leaves a deficit, so it cools the water.
  const flashedMass = calculateFlashedMass(heatedTemperature, waterMass, boilerState.steamMass)
  const flashEnergy = flashedMass * getLatentHeat(heatedTemperature)
  const energyChange = gasEnergy + returnEnergy - drain.energyLoss - heatLossEnergy - flashEnergy

  // The liquid lost to steam is exactly the steam made: mass is conserved, and a full drum is not clamped
  const newWaterMass = Math.max(0, waterMass - flashedMass)

  // Heat loss never takes the boiler below ambient
  const newTemperature = Math.max(
    CstPhysics.AmbientTemperature,
    warmBy(heatedTemperature, -flashEnergy, heatCapacity),
  )

  const heatingRate = smoothHeatingRate(boilerState.heatingRate, newTemperature - boilerState.temperature)

  return {
    ...boilerState,
    waterMass: newWaterMass,
    waterVolume: waterVolumeOf(newWaterMass, newTemperature), // derived here and nowhere else
    deltaWaterMass: newWaterMass - boilerState.waterMass,
    drainedTotal: boilerState.drainedTotal + drain.drained,
    temperature: newTemperature,
    pressure: calculateBoilerPressure(newTemperature),
    steamMass: Math.max(0, boilerState.steamMass + flashedMass),
    energy: Math.max(0, boilerState.energy + energyChange),
    energyDelta: energyChange / CstSimulation.DeltaTime,
    heatLoss,
    heatingRate,
    heatingRateOverLimit: heatingRate > CstBoiler.HeatingRateLimit,
    stackTemperature: balance.stackTemperature,
    boilerEfficiency: balance.efficiency,
    returnTemperatureOut: balance.returnTemperatureOut,
    deltaSteamMass: flashedMass / CstSimulation.DeltaTime, // kg/s flashed to steam (negative: condensing)
  }
}

// Worst case for the relief valve (ADR 0005, ADR 0030): full gas at the opening pressure with no Return. The Return
// costs heat now, so stopping it frees the most heat for steaming, and the economizer recovers nothing: the stack is
// hottest and the heat into the water is least, but all of it goes into latent heat.
const ReliefWorstCaseHeat: number = calculateGasEnergy(
  CstBoiler.MaxGasFlow,
  getBoilingPoint(CstBoiler.ReliefOpenPressure),
  0,
  CstPhysics.AmbientTemperature,
)

// Relief capacity (kg/s): the steam the worst-case heat makes at the opening pressure, with the capacity margin on top
export const ReliefCapacity =
  (CstBoiler.ReliefCapacityMargin * ReliefWorstCaseHeat) /
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

// True while the water is below the burner low-low level (share of the boiler volume)
export function isBelowBurnerLowLow(boilerState: BoilerState): boolean {
  return boilerState.waterVolume < CstBoiler.TotalVolume * CstBoiler.BurnerLowLowLevel
}

// The burner trip: below the burner low-low level at the start of the tick the gas is forced to 0, whatever the
// operator did. The knob is centred too; it stays 0 until the operator turns it up (ADR 0017).
export function BoilerBurnerTrip(boilerState: BoilerState): BoilerState {
  if (!isBelowBurnerLowLow(boilerState)) return boilerState
  return { ...boilerState, gasFlow: 0, gasRateCommand: 0, burnerTripped: true }
}

// True from the high-high level (share of the boiler volume), where the feed pump and the turbine trip (ADR 0041)
export function isAtBoilerHighHigh(boilerState: BoilerState): boolean {
  return boilerState.waterVolume >= CstBoiler.TotalVolume * CstBoiler.HighHighLevel
}

// The high-high trip flag: set at the start of the tick when the level is at the trip, until the feed pump is opened again.
// The burner is not touched.
export function BoilerLevelHighTrip(boilerState: BoilerState): BoilerState {
  if (!isAtBoilerHighHigh(boilerState)) return boilerState
  return { ...boilerState, boilerLevelHighTripped: true }
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

  // The valve passes its pressure-driven flow (kg/s, ADR 0026) over one tick, and never more than the boiler holds
  const valveMassPerTick =
    valvePositionFor(turbineState, removeBy) *
    CstTurbine.MaxSteamRemovalRate *
    valveFlowFactor(boilerState.pressure) *
    CstSimulation.DeltaTime
  const removedSteamMass = Math.min(boilerState.steamMass, valveMassPerTick)

  return {
    boilerState: { ...boilerState, steamMass: boilerState.steamMass - removedSteamMass },
    turbineState: withSteamFlowOut(turbineState, removeBy, removedSteamMass / CstSimulation.DeltaTime),
  }
}

export default BoilerTick
