/**
 * Flue gas heat balance (ADR 0029): the flue gas passes the boiler stage, then the economizer, and what it still holds
 * at the stack is the loss. Fuel heat = heat into the water + heat up the stack, with the fuel at its lower heating
 * value and the flue gas enthalpy taken relative to ambient. Pure functions, no state.
 */
import { CstFlueGas, CstPhysics, CstSimulation, CstSuperheater } from "../context/const"
import {
  getBoilingPoint,
  getLiquidEnthalpy,
  getLiquidTemperature,
  getSaturationEnthalpies,
  getSteamEnthalpy,
} from "./steamTable"
import { superheatSteps } from "./steamSuperheatedData"

const { CstBoiler } = CstSimulation
const Ambient: number = CstPhysics.AmbientTemperature
const Iterations = 50 // bisection halvings: the brackets are a few hundred kelvin or MW wide, far below a milligram of rounding

// Quadratic through the three table points, h = c2·T² + c1·T + c0 (kJ/kg, T in °C), by Newton's divided differences
const [P0, P1, P2] = CstFlueGas.EnthalpyPoints
const Slope01: number = (P1[1] - P0[1]) / (P1[0] - P0[0])
const Slope12: number = (P2[1] - P1[1]) / (P2[0] - P1[0])
const C2: number = (Slope12 - Slope01) / (P2[0] - P0[0])
const C1: number = Slope01 - C2 * (P0[0] + P1[0])
const C0: number = P0[1] - C1 * P0[0] - C2 * P0[0] * P0[0]

const tableEnthalpy = (temperature: number): number => C0 + C1 * temperature + C2 * temperature * temperature

// Flue gas enthalpy (kJ/kg) above its enthalpy at ambient
export function flueGasEnthalpy(temperature: number): number {
  return tableEnthalpy(temperature) - tableEnthalpy(Ambient)
}

// Flue gas temperature (°C) of an enthalpy above ambient (kJ/kg), the inverse of flueGasEnthalpy on its rising branch
export function flueGasTemperature(enthalpy: number): number {
  const discriminant: number = C1 * C1 - 4 * C2 * (C0 - (enthalpy + tableEnthalpy(Ambient)))
  return (-C1 + Math.sqrt(Math.max(0, discriminant))) / (2 * C2)
}

// Log-mean temperature difference (K) of two end differences; none once an end has closed or crossed
function logMeanDifference(first: number, second: number): number {
  if (first <= 0 || second <= 0) return 0
  return Math.abs(first - second) < 1e-9 ? first : (first - second) / Math.log(first / second)
}

const MaxGasVolume: number = CstBoiler.MaxGasFlow / 1000 // m³/s

// Flue gas flow (kg/s) of a gas flow (m³/s)
const flueGasFlowOf = (gasVolume: number): number => gasVolume * CstFlueGas.MassPerGasVolume

// Surface (kW/K) of a heat exchanger at this gas flow, from its surface at full gas
function surfaceAt(designSurface: number, gasVolume: number): number {
  return designSurface * Math.pow(gasVolume / MaxGasVolume, CstFlueGas.SurfaceExponent)
}

// Flue gas temperature (°C) leaving a surface of this size (kW/K) when the water on the other side stays at one
// temperature: the heat the gas gives up equals surface × log-mean difference. Bisection on the exit temperature.
function boilerStageExit(gasFlow: number, waterTemperature: number, surface: number, inlet: number): number {
  const water: number = Math.min(waterTemperature, inlet - 1)
  const inletEnthalpy: number = flueGasEnthalpy(inlet)
  let low: number = water
  let high: number = inlet
  for (let i = 0; i < Iterations; i++) {
    const mid: number = (low + high) / 2
    const given: number = gasFlow * (inletEnthalpy - flueGasEnthalpy(mid))
    const exchanged: number = surface * logMeanDifference(inlet - water, mid - water)
    if (given > exchanged) low = mid
    else high = mid
  }
  return (low + high) / 2
}

type EconomizerInput = {
  gasFlow: number // kg/s of flue gas
  gasInlet: number // °C
  surface: number // kW/K
  returnFlow: number // kg/s
  returnInlet: number // °C
  returnLimit: number // °C, the hottest the Return may leave
}

// The most heat (kW) the economizer can pass: what the Return may take up to its limit or what the gas can give (it does
// not cool below ambient), whichever is less. Zero when there is no flow or no room to heat.
function economizerCeiling({ gasFlow, gasInlet, returnFlow, returnInlet, returnLimit }: EconomizerInput): number {
  if (returnFlow <= 0 || gasFlow <= 0 || returnLimit <= returnInlet) return 0
  const returnCapacity: number = returnFlow * (getLiquidEnthalpy(returnLimit) - getLiquidEnthalpy(returnInlet))
  const gasCapacity: number = gasFlow * (flueGasEnthalpy(gasInlet) - flueGasEnthalpy(Math.max(returnInlet, Ambient)))
  return Math.max(0, Math.min(returnCapacity, gasCapacity))
}

// The duty in (0, ceiling) where the shortfall changes sign, by bisection. The shortfall grows with the duty.
export function bisectDuty(shortfall: (duty: number) => number, ceiling: number): number {
  let low = 0
  let high: number = ceiling
  for (let i = 0; i < Iterations; i++) {
    const mid: number = (low + high) / 2
    if (shortfall(mid) > 0) high = mid
    else low = mid
  }
  return (low + high) / 2
}

// Heat (kW) the flue gas gives the Return, counterflow: the heat that closes the balance on both sides and equals
// surface × log-mean difference, never past the ceiling.
function economizerDuty(input: EconomizerInput): number {
  const { gasFlow, gasInlet, surface, returnFlow, returnInlet } = input
  const ceiling: number = economizerCeiling(input)
  if (ceiling <= 0) return 0
  const gasEnthalpy: number = flueGasEnthalpy(gasInlet)
  const returnEnthalpy: number = getLiquidEnthalpy(returnInlet)

  const shortfall = (duty: number): number => {
    const gasOutlet: number = flueGasTemperature(gasEnthalpy - duty / gasFlow)
    const returnOutlet: number = getLiquidTemperature(returnEnthalpy + duty / returnFlow)
    return duty - surface * logMeanDifference(gasInlet - returnOutlet, gasOutlet - returnInlet)
  }
  // The surface cannot pass the ceiling: the Return limit (or the gas) decides
  if (shortfall(ceiling) <= 0) return ceiling
  return bisectDuty(shortfall, ceiling)
}

export type SuperheaterOutput = {
  heat: number // kW the steam takes
  steamTemperature: number // °C of the steam leaving the superheater, before any spray (saturation with no flow)
  gasOutlet: number // °C of the flue gas leaving it, the boiler stage inlet
}

const SuperheaterTableSpan: number = superheatSteps[superheatSteps.length - 1] // K above saturation where the steam table ends

// The superheater (ADR 0044): a bank of tubes in the flue gas path before the boiler stage, no valve in the steam path. The
// steam of this flow leaves at the temperature where the heat the gas gives equals surface × log-mean difference (counterflow,
// the gas inlet at the combustion temperature). Bisection on the outlet temperature; it never passes the end of the steam table.
function superheaterDuty(gasFlow: number, surface: number, steamPressure: number, steamFlow: number): SuperheaterOutput {
  const inlet: number = CstFlueGas.CombustionTemperature
  const saturation: number = getBoilingPoint(steamPressure)
  const none: SuperheaterOutput = { heat: 0, steamTemperature: saturation, gasOutlet: inlet }
  if (gasFlow <= 0 || steamFlow <= 0) return none
  const saturated: number = getSaturationEnthalpies(steamPressure).vapor
  const gasEnthalpy: number = flueGasEnthalpy(inlet)
  const heatAt = (steamOutlet: number): number => steamFlow * (getSteamEnthalpy(steamPressure, steamOutlet) - saturated)
  const shortfall = (steamOutlet: number): number => {
    const heat: number = heatAt(steamOutlet)
    const gasOutlet: number = flueGasTemperature(gasEnthalpy - heat / gasFlow)
    return heat - surface * logMeanDifference(inlet - steamOutlet, gasOutlet - saturation)
  }
  let low: number = saturation
  let high: number = saturation + SuperheaterTableSpan
  // The gas cannot give more than it has above the saturation temperature: past that the log-mean difference closes
  for (let i = 0; i < Iterations; i++) {
    const mid: number = (low + high) / 2
    if (shortfall(mid) > 0) high = mid
    else low = mid
  }
  const steamOutlet: number = (low + high) / 2
  const heat: number = heatAt(steamOutlet)
  return { heat, steamTemperature: steamOutlet, gasOutlet: flueGasTemperature(gasEnthalpy - heat / gasFlow) }
}

// Sizing at full gas (ADR 0029): the boiler stage for flue gas BoilerApproachAtDesign above the water at
// DesignWaterTemperature, the economizer for the design stack with the design Return
const DesignGasFlow: number = flueGasFlowOf(MaxGasVolume)
const DesignBoilerExit: number = CstFlueGas.DesignWaterTemperature + CstFlueGas.BoilerApproachAtDesign

// The superheater is sized first, for CstSuperheater.SteamTemperature leaving at full gas and the design steam flow with no
// spray (ADR 0044): the heat the steam takes, the gas it leaves and the surface that passes it
const DesignSuperheaterSaturation: number = getBoilingPoint(CstSuperheater.DesignPressure)
const DesignSuperheaterHeat: number =
  CstSuperheater.DesignSteamFlow *
  (getSteamEnthalpy(CstSuperheater.DesignPressure, CstSuperheater.SteamTemperature) -
    getSaturationEnthalpies(CstSuperheater.DesignPressure).vapor)
const DesignSuperheaterExit: number = flueGasTemperature(
  flueGasEnthalpy(CstFlueGas.CombustionTemperature) - DesignSuperheaterHeat / DesignGasFlow,
)

// kW/K
export const SuperheaterSurface: number =
  DesignSuperheaterHeat /
  logMeanDifference(
    CstFlueGas.CombustionTemperature - CstSuperheater.SteamTemperature,
    DesignSuperheaterExit - DesignSuperheaterSaturation,
  )

// kW/K
export const BoilerStageSurface: number =
  (DesignGasFlow * (flueGasEnthalpy(DesignSuperheaterExit) - flueGasEnthalpy(DesignBoilerExit))) /
  logMeanDifference(
    DesignSuperheaterExit - CstFlueGas.DesignWaterTemperature,
    CstFlueGas.BoilerApproachAtDesign,
  )

const DesignEconomizerDuty: number =
  DesignGasFlow * (flueGasEnthalpy(DesignBoilerExit) - flueGasEnthalpy(CstFlueGas.EconomizerDesignStack))
const DesignReturnOutlet: number = getLiquidTemperature(
  getLiquidEnthalpy(CstFlueGas.EconomizerDesignReturnTemperature) +
    DesignEconomizerDuty / CstFlueGas.EconomizerDesignReturn,
)

// kW/K
export const EconomizerSurface: number =
  DesignEconomizerDuty /
  logMeanDifference(
    DesignBoilerExit - DesignReturnOutlet,
    CstFlueGas.EconomizerDesignStack - CstFlueGas.EconomizerDesignReturnTemperature,
  )

export type FlueGasBalance = {
  fuelHeat: number // kW at the lower heating value
  heatIntoWater: number // kW: fuel heat less the stack heat, the economizer heat included
  stackHeat: number // kW carried up the stack, above ambient
  stackTemperature: number // °C, flue gas after the economizer
  superheaterHeat: number // kW the steam takes in the superheater, before the boiler stage; part of heatIntoWater
  superheaterSteamTemperature: number // °C, the steam leaving the superheater before the spray
  superheaterExitTemperature: number // °C, flue gas after the superheater: the boiler stage inlet
  boilerExitTemperature: number // °C, flue gas after the boiler stage
  economizerHeat: number // kW the Return takes from the flue gas
  returnTemperatureOut: number // °C, the Return after the economizer
  efficiency: number // 0-1, heat into the water over fuel heat
}

// The balance of one moment. gasFlow in L/s, boilerTemperature in °C (the water, and saturation), returnFlow in kg/s
// and returnTemperature in °C (the hotwell). No gas burns nothing and sends nothing up the stack; no Return takes no heat.
// The steam the superheater heats: flow (kg/s) leaving the drum and the pressure (bar) it is at
export type SteamThroughSuperheater = { flow: number; pressure: number }
const NoSteam: SteamThroughSuperheater = { flow: 0, pressure: CstSuperheater.DesignPressure }

export function calculateFlueGasHeatBalance(
  gasFlow: number,
  boilerTemperature: number,
  returnFlow: number,
  returnTemperature: number,
  steam: SteamThroughSuperheater = NoSteam,
): FlueGasBalance {
  const gasVolume: number = Math.max(0, gasFlow) / 1000
  if (gasVolume <= 0) {
    return {
      fuelHeat: 0,
      heatIntoWater: 0,
      stackHeat: 0,
      stackTemperature: Ambient,
      superheaterHeat: 0,
      superheaterSteamTemperature: getBoilingPoint(steam.pressure),
      superheaterExitTemperature: Ambient,
      boilerExitTemperature: Ambient,
      economizerHeat: 0,
      returnTemperatureOut: returnTemperature,
      efficiency: 0,
    }
  }
  const fuelHeat: number = gasVolume * CstPhysics.GasEnergyDensity
  const flueGas: number = flueGasFlowOf(gasVolume)
  const superheater: SuperheaterOutput = superheaterDuty(
    flueGas,
    surfaceAt(SuperheaterSurface, gasVolume),
    steam.pressure,
    steam.flow,
  )
  const boilerExitTemperature: number = boilerStageExit(
    flueGas,
    boilerTemperature,
    surfaceAt(BoilerStageSurface, gasVolume),
    superheater.gasOutlet,
  )
  const economizerHeat: number = economizerDuty({
    gasFlow: flueGas,
    gasInlet: boilerExitTemperature,
    surface: surfaceAt(EconomizerSurface, gasVolume),
    returnFlow,
    returnInlet: returnTemperature,
    returnLimit: boilerTemperature - CstFlueGas.ReturnSaturationMargin,
  })
  const stackEnthalpy: number = flueGasEnthalpy(boilerExitTemperature) - economizerHeat / flueGas
  const stackHeat: number = flueGas * stackEnthalpy
  const heatIntoWater: number = fuelHeat - stackHeat
  return {
    fuelHeat,
    heatIntoWater,
    stackHeat,
    stackTemperature: flueGasTemperature(stackEnthalpy),
    superheaterHeat: superheater.heat,
    superheaterSteamTemperature: superheater.steamTemperature,
    superheaterExitTemperature: superheater.gasOutlet,
    boilerExitTemperature,
    economizerHeat,
    returnTemperatureOut:
      economizerHeat > 0
        ? getLiquidTemperature(getLiquidEnthalpy(returnTemperature) + economizerHeat / returnFlow)
        : returnTemperature,
    efficiency: heatIntoWater / fuelHeat,
  }
}
