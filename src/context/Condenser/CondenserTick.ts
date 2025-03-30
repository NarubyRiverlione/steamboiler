import { CondenserState } from "./CondenserTypes"
import {
  calculateCondensation,
  calculateHotwellLevelChange,
  calculateHotwellToCondenserFlowRate,
  calculatePressure,
  calculateRecirculationPumpFlowRate,
} from "../../utils/condenserCalculation"

/**
 * Simulates the condenser vacuum behavior over time
 *
 * @param condenserState Current condenser state
 * @param boilerSteamFlow Steam flow from the boiler (kg/s)
 * @param deltaTime Time elapsed since last tick (seconds)
 * @returns Action to update the condenser state
 */
export function CondenserTick(condenserState: CondenserState, boilerSteamFlow: number, deltaTime: number): CondenserState {
  const { newPressure, newIsSjaeEnabled } = calculatePressure(condenserState, boilerSteamFlow, deltaTime)

  // Calculate hotwell level change
  // Hotwell level increases with steam flow from boiler and decreases with flow to condenser
  const hotwellLevelChange = calculateHotwellLevelChange(boilerSteamFlow, condenserState.hotwellToCondenserFlowRate, deltaTime)
  const newHotwellLevel = condenserState.hotwellLevel + hotwellLevelChange

  // Calculate hotwell to condenser flow rate based on condenser pressure
  const newHotwellToCondenserFlowRate = calculateHotwellToCondenserFlowRate(newHotwellLevel, newPressure)

  // Calculate recirculation pump flow rate based on valve position
  const newRecirculationPumpFlowRate = calculateRecirculationPumpFlowRate(condenserState.recirculationPumpValvePosition)

  // Calculate condensation based on recirculation pump flow rate
  const { newCondenserSteamVolume, newCondenserLiquidVolume } = calculateCondensation(
    condenserState.condenserSteamVolume,
    condenserState.condenserLiquidVolume,
    newRecirculationPumpFlowRate,
    boilerSteamFlow,
    deltaTime,
  )

  return {
    ...condenserState,
    pressure: newPressure,
    isSjaeEnabled: newIsSjaeEnabled,
    hotwellLevel: newHotwellLevel,
    hotwellToCondenserFlowRate: newHotwellToCondenserFlowRate,
    recirculationPumpFlowRate: newRecirculationPumpFlowRate,
    condenserSteamVolume: newCondenserSteamVolume,
    condenserLiquidVolume: newCondenserLiquidVolume,
  }
}
