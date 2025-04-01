import { CondenserState } from "./CondenserTypes"
import {
  calculateCondensation,
  calculateSteamVolumeChange,
  calculateIntakeFlowRate,
  calculatePressure,
  calculateRecirculationPumpFlowRate,
  CalculateCondensationFlow,
} from "../../utils/condenserCalculation"

/**
 * Simulates the condenser vacuum behavior over time
 *
 * @param condenserState Current condenser state
 * @param boilerSteamFlow Steam flow from the boiler (kg/s)
 * @param deltaTime Time elapsed since last tick (seconds)
 * @returns Action to update the condenser state
 */
export function CondenserTick(condenserState: CondenserState, boilerSteamFlow: number): CondenserState {
  // Calculate the pressure based on the CAR & SJAE
  const { newPressure, newIsSjaeEnabled } = calculatePressure(condenserState, boilerSteamFlow)

  // Calculate turbine to condenser flow rate based on boiler steam flow and condenser vacuum pressure.
  // The vacuum pressure affects the efficiency of steam flow from turbine to condenser.
  const newIntakeFlowRate = calculateIntakeFlowRate(boilerSteamFlow, newPressure)

  // Calculate steam volume change.
  const steamVolumeChange = calculateSteamVolumeChange(boilerSteamFlow, newIntakeFlowRate)
  const newSteamVolume = condenserState.steamVolume + steamVolumeChange

  // Calculate recirculation pump flow rate based on valve position.
  const newRecirculationPumpFlowRate = calculateRecirculationPumpFlowRate(
    condenserState.recirculationPumpValvePosition,
  )

  // Calculate water level based on recirculation pump flow rate.
  const { steamVolumeAfterCondensation, waterVolumeAfterCondensation } = calculateCondensation(
    newSteamVolume,
    condenserState.hotwellWaterVolume,
    newRecirculationPumpFlowRate,
  )

  // Condensation pump transfer: remove water from hotwell based on pump valve setting.
  const { condensatePumpVolume, newHotwellWaterVolume } = CalculateCondensationFlow(
    condenserState.condensationPumpValvePosition,
    waterVolumeAfterCondensation,
  )

  return {
    ...condenserState,
    pressure: newPressure,
    isSjaeEnabled: newIsSjaeEnabled,
    intakeFlowRate: newIntakeFlowRate,
    recirculationPumpFlowRate: newRecirculationPumpFlowRate,
    steamVolume: steamVolumeAfterCondensation,
    hotwellWaterVolume: newHotwellWaterVolume,
    deltaWaterVolume: newHotwellWaterVolume - condenserState.hotwellWaterVolume,
    returnRate: condensatePumpVolume,
  }
}
