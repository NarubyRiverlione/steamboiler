/**
 * Flue gas heat balance (ADR 0029): the flue gas passes the boiler stage, then the economizer, and what it still holds
 * at the stack is the loss. Fuel heat = heat into the water + heat up the stack, with the fuel at its lower heating
 * value and the flue gas enthalpy taken relative to ambient. Pure functions, no state.
 */
import { CstFlueGas, CstPhysics, CstSimulation } from "../context/const"
import { getLiquidEnthalpy, getLiquidTemperature } from "./steamTable"

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
function boilerStageExit(gasFlow: number, waterTemperature: number, surface: number): number {
  const inlet: number = CstFlueGas.CombustionTemperature
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

// Heat (kW) the flue gas gives the Return, counterflow: the heat that closes the balance on both sides and equals
// surface × log-mean difference, never past what the Return may take or the gas can give (the gas does not cool below ambient). Bisection on the heat.
function economizerDuty({ gasFlow, gasInlet, surface, returnFlow, returnInlet, returnLimit }: EconomizerInput): number {
  if (returnFlow <= 0 || gasFlow <= 0 || returnLimit <= returnInlet) return 0
  const gasEnthalpy: number = flueGasEnthalpy(gasInlet)
  const returnEnthalpy: number = getLiquidEnthalpy(returnInlet)
  const returnCapacity: number = returnFlow * (getLiquidEnthalpy(returnLimit) - returnEnthalpy)
  const gasCapacity: number = gasFlow * (gasEnthalpy - flueGasEnthalpy(Math.max(returnInlet, Ambient)))
  const ceiling: number = Math.min(returnCapacity, gasCapacity)
  if (ceiling <= 0) return 0

  const shortfall = (duty: number): number => {
    const gasOutlet: number = flueGasTemperature(gasEnthalpy - duty / gasFlow)
    const returnOutlet: number = getLiquidTemperature(returnEnthalpy + duty / returnFlow)
    return duty - surface * logMeanDifference(gasInlet - returnOutlet, gasOutlet - returnInlet)
  }
  // The surface cannot pass the ceiling: the Return limit (or the gas) decides
  if (shortfall(ceiling) <= 0) return ceiling

  let low = 0
  let high: number = ceiling
  for (let i = 0; i < Iterations; i++) {
    const mid: number = (low + high) / 2
    if (shortfall(mid) > 0) high = mid
    else low = mid
  }
  return (low + high) / 2
}

// Sizing at full gas (ADR 0029): the boiler stage for flue gas BoilerApproachAtDesign above the water at
// DesignWaterTemperature, the economizer for the design stack with the design Return
const DesignGasFlow: number = flueGasFlowOf(MaxGasVolume)
const DesignBoilerExit: number = CstFlueGas.DesignWaterTemperature + CstFlueGas.BoilerApproachAtDesign

// kW/K
export const BoilerStageSurface: number =
  (DesignGasFlow * (flueGasEnthalpy(CstFlueGas.CombustionTemperature) - flueGasEnthalpy(DesignBoilerExit))) /
  logMeanDifference(
    CstFlueGas.CombustionTemperature - CstFlueGas.DesignWaterTemperature,
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
  boilerExitTemperature: number // °C, flue gas after the boiler stage
  economizerHeat: number // kW the Return takes from the flue gas
  returnTemperatureOut: number // °C, the Return after the economizer
  efficiency: number // 0-1, heat into the water over fuel heat
}

// The balance of one moment. gasFlow in L/s, boilerTemperature in °C (the water, and saturation), returnFlow in kg/s
// and returnTemperature in °C (the hotwell). No gas burns nothing and sends nothing up the stack; no Return takes no heat.
export function calculateFlueGasHeatBalance(
  gasFlow: number,
  boilerTemperature: number,
  returnFlow: number,
  returnTemperature: number,
): FlueGasBalance {
  const gasVolume: number = Math.max(0, gasFlow) / 1000
  if (gasVolume <= 0) {
    return {
      fuelHeat: 0,
      heatIntoWater: 0,
      stackHeat: 0,
      stackTemperature: Ambient,
      boilerExitTemperature: Ambient,
      economizerHeat: 0,
      returnTemperatureOut: returnTemperature,
      efficiency: 0,
    }
  }
  const fuelHeat: number = gasVolume * CstPhysics.GasEnergyDensity
  const flueGas: number = flueGasFlowOf(gasVolume)
  const boilerExitTemperature: number = boilerStageExit(
    flueGas,
    boilerTemperature,
    surfaceAt(BoilerStageSurface, gasVolume),
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
    boilerExitTemperature,
    economizerHeat,
    returnTemperatureOut:
      economizerHeat > 0
        ? getLiquidTemperature(getLiquidEnthalpy(returnTemperature) + economizerHeat / returnFlow)
        : returnTemperature,
    efficiency: heatIntoWater / fuelHeat,
  }
}
