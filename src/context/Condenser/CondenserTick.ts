import { CondenserState } from "./CondenserTypes"
import {
  calculateCondensation,
  calculateSteamVolumeChange,
  calculateHotwellToCondenserFlowRate as calculateIntakeFlowRate,
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
  // Calculate the pressure base on the CAR & SJAE
  const { newPressure, newIsSjaeEnabled } = calculatePressure(condenserState, boilerSteamFlow, deltaTime)

  // Calculate turbine to condenser flow rate based on condenser (vacuum) pressure
  const newIntakeFlowRate = calculateIntakeFlowRate(boilerSteamFlow, newPressure)

  // Calculate steam volume change
  const steamVolumeChange = calculateSteamVolumeChange(boilerSteamFlow, newIntakeFlowRate, deltaTime)
  const newSteamVolume = condenserState.steamVolume + steamVolumeChange

  // Calculate recirculation pump flow rate based on valve position
  const newRecirculationPumpFlowRate = calculateRecirculationPumpFlowRate(condenserState.recirculationPumpValvePosition)

  // Calculate water level based on recirculation pump flow rate
  const { steamVolumeAfterCondensation, waterVolumeAfterCondensation } = calculateCondensation(
    newSteamVolume,
    condenserState.waterVolume,
    newRecirculationPumpFlowRate,
    boilerSteamFlow,
    deltaTime,
  )

  return {
    ...condenserState,
    pressure: newPressure,
    isSjaeEnabled: newIsSjaeEnabled,
    intakeFlowRate: newIntakeFlowRate,
    recirculationPumpFlowRate: newRecirculationPumpFlowRate,
    steamVolume: steamVolumeAfterCondensation,
    waterVolume: waterVolumeAfterCondensation,
  }
}
