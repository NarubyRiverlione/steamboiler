/**
 * Extraction heater (ADR 0031): steam taken from the turbine at a tap heats the feedwater from the deaerator before the
 * economizer, and its drain cascades back into the deaerator (ADR 0036), so no water or heat is lost. Pure functions, no state.
 */
import { CstDeaerator, CstHeater, CstSimulation } from "../context/const"
import {
  getBoilingPoint,
  getInletEnthalpy,
  getInletIsentropicDrop,
  getLiquidEnthalpy,
  getLiquidTemperature,
} from "./steamTable"

const { CstCondenser, CstTurbine } = CstSimulation

// Pressure (bar) at the turbine tap: proportional to the turbine flow, the rated tap pressure at the rated flow
export const tapPressureOf = (turbineFlow: number): number =>
  (CstHeater.TapPressureAtRated * Math.max(0, turbineFlow)) / CstTurbine.RatedSteamFlow

// Pressure (bar) in the heater shell: the tap pressure less the line drop
export const heaterPressureOf = (tapPressure: number): number => tapPressure * (1 - CstHeater.LineDrop)

export type ExtractionInput = {
  turbineFlow: number // kg/s through the turbine valve
  workFraction: number // 0-1, the share of the work the shaft takes from the steam before the tap (shaftWorkFraction of the speed)
  boilerPressure: number // bar
  steamTemperature?: number // Celsius, the inlet steam (#113): the saturated steam when left out
  returnFlow: number // kg/s of Return from the hotwell
  returnTemperature: number // Celsius, the hotwell temperature
}

export type Extraction = {
  flow: number // kg/s taken at the tap
  tapPressure: number // bar
  heaterPressure: number // bar
  tapEnthalpy: number // kJ/kg of the steam at the tap, on the same expansion line as the exhaust
}

// Steam enthalpy (kJ/kg) at the tap: on the expansion line from the inlet, the share of the isentropic drop to the tap
// pressure that the shaft takes, at the isentropic efficiency (so at sync speed the same line as the exhaust)
function tapEnthalpyAt(boilerPressure: number, tapPressure: number, workFraction: number, steamTemperature: number): number {
  const inlet: number = getInletEnthalpy(boilerPressure, steamTemperature)
  const drop: number = Math.max(0, getInletIsentropicDrop(boilerPressure, tapPressure, steamTemperature))
  return inlet - workFraction * CstTurbine.IsentropicEfficiency * drop
}

/**
 * The steam the heater takes so the Return leaves a terminal temperature difference below the saturation temperature
 * of the heater pressure: heat given up by the steam (tap enthalpy to saturated liquid) equals the heat the water gains.
 * Nothing with no turbine flow or no Return, and the Return is never cooled.
 */
export function calculateExtraction({
  turbineFlow,
  workFraction,
  boilerPressure,
  steamTemperature = 0,
  returnFlow,
  returnTemperature,
}: ExtractionInput): Extraction {
  const tapPressure: number = tapPressureOf(turbineFlow)
  const heaterPressure: number = heaterPressureOf(tapPressure)
  const tapEnthalpy: number = tapEnthalpyAt(boilerPressure, tapPressure, workFraction, steamTemperature)
  const none: Extraction = { flow: 0, tapPressure, heaterPressure, tapEnthalpy }
  if (turbineFlow <= 0 || returnFlow <= 0) return none

  const saturation: number = getBoilingPoint(heaterPressure)
  const target: number = saturation - CstHeater.TerminalTemperatureDifference
  if (target <= returnTemperature) return none

  const heatPerKgSteam: number = tapEnthalpy - getLiquidEnthalpy(saturation)
  if (heatPerKgSteam <= 0) return none
  const waterHeat: number = returnFlow * (getLiquidEnthalpy(target) - getLiquidEnthalpy(returnTemperature))
  return { ...none, flow: Math.min(turbineFlow, waterHeat / heatPerKgSteam) }
}

// Enthalpy (kJ/kg) of the heater drain: saturated liquid at the heater pressure
export const drainEnthalpyOf = (heaterPressure: number): number => getLiquidEnthalpy(getBoilingPoint(heaterPressure))

/**
 * The feedwater after the heater: the water takes the heat the steam gives up from its tap enthalpy to the drain
 * (saturated liquid at the heater pressure). The drain does not join the water: it cascades back into the deaerator
 * (ADR 0036). The temperature is that of the heated enthalpy, never above the heater saturation (when a lagging
 * extraction meets less water than it expected, the excess heat is not kept).
 */
export function heatFeedwater(
  waterMass: number,
  waterTemperature: number,
  extractionMass: number,
  { tapEnthalpy, heaterPressure }: Pick<Extraction, "tapEnthalpy" | "heaterPressure">,
): number {
  if (extractionMass <= 0 || waterMass <= 0) return waterTemperature
  const enthalpy: number =
    getLiquidEnthalpy(waterTemperature) + (extractionMass * (tapEnthalpy - drainEnthalpyOf(heaterPressure))) / waterMass
  return Math.min(getBoilingPoint(heaterPressure), getLiquidTemperature(enthalpy))
}

/**
 * The isentropic enthalpy drop (kJ/kg) that gives the shaft the same work per kg of turbine flow as the two sections do:
 * the full flow expands to the tap, what is left expands on to the condenser. With no extraction it is the full drop.
 */
export function shaftDropWithExtraction(
  boilerPressure: number,
  condenserPressure: number,
  turbineFlow: number,
  extractionFlow: number,
  steamTemperature = 0,
): number {
  const total: number = getInletIsentropicDrop(boilerPressure, condenserPressure, steamTemperature)
  if (turbineFlow <= 0 || extractionFlow <= 0) return total
  const share: number = Math.min(1, extractionFlow / turbineFlow)
  const tapDrop: number = Math.min(total, Math.max(0, getInletIsentropicDrop(boilerPressure, tapPressureOf(turbineFlow), steamTemperature)))
  return total - share * (total - tapDrop)
}

/**
 * The share of the rated turbine flow the two extractions take at the rated state: the hotwell at the saturation
 * temperature of the design vacuum, the deaerator heating it to its setpoint with tap steam, the heater taking the
 * water on from there, the shaft at sync speed. The Return is the flow the extractions do not take, so with x kg of
 * steam per kg of Return the share is x / (1 + x). It sizes the rated output, which the extraction steam no longer produces.
 */
export const ratedExtractionShare: number = (() => {
  const hotwell: number = getBoilingPoint(CstCondenser.OptimalPressure / 1000)
  const heater: Extraction = calculateExtraction({
    turbineFlow: CstTurbine.RatedSteamFlow,
    workFraction: 1,
    boilerPressure: CstTurbine.ValveRatingPressure,
    steamTemperature: CstTurbine.RatedSteamTemperature,
    returnFlow: 1,
    returnTemperature: getBoilingPoint(CstDeaerator.Pressure),
  })
  const deaeratorSteam: number =
    (getLiquidEnthalpy(getBoilingPoint(CstDeaerator.Pressure)) - getLiquidEnthalpy(hotwell)) /
    (heater.tapEnthalpy - getLiquidEnthalpy(getBoilingPoint(CstDeaerator.Pressure)))
  const perKgReturn: number = heater.flow + deaeratorSteam
  return perKgReturn / (1 + perKgReturn)
})()
