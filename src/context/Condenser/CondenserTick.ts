import CondenserState from "./CondenserTypes"
import {
  calculateCondensation,
  calculateIntakeFlowRate,
  calculatePressure,
  CalculateCondensationFlow,
} from "../../utils/condenserCalculation"

/**
 * Simulates the condenser vacuum behavior over time
 *
 * @param condenserState Current condenser state
 * @param steamFlow Steam flow from bypass or turbine (kg/s)
 * @param steamTemp Steam flow from bypass or turbine  (C)
 * @param steamPressure Steam flow from bypass or turbine  (bar)
 * @returns Action to update the condenser state
 */
export function CondenserTick(
  condenserState: CondenserState,
  steamFlow: number,
  steamTemp: number,
  steamPressure: number,
): CondenserState {
  // Calculate the pressure based on the CAR & SJAE
  const { newPressure, newIsSjaeEnabled } = calculatePressure(condenserState, steamPressure)

  // Calculate turbine to condenser flow rate based on boiler steam flow and condenser vacuum pressure.
  // The vacuum pressure affects the efficiency of steam flow from turbine to condenser.
  const newIntakeFlowRate = calculateIntakeFlowRate(steamFlow, newPressure)

  // Calculate steam volume change.
  const steamVolumeChange = Math.min(steamFlow, newIntakeFlowRate)
  //calculateSteamVolumeChange(steamFlow, newIntakeFlowRate)
  const newSteamVolume = condenserState.steamVolume + steamVolumeChange

  // Calculate water level based on recirculation pump flow rate and update the temperature
  // of the condensed water returning to the boiler.
  const { steamVolumeAfterCondensation, waterVolumeAfterCondensation } = calculateCondensation(
    newSteamVolume,
    condenserState.hotwellWaterVolume,
    condenserState.recirculationPumpValvePosition,
    steamTemp,
    // steamPressure,
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
    // recirculationPumpFlowRate: newRecirculationPumpFlowRate,
    steamVolume: steamVolumeAfterCondensation,
    hotwellWaterVolume: newHotwellWaterVolume,
    deltaWaterVolume: newHotwellWaterVolume - condenserState.hotwellWaterVolume,
    returnRate: condensatePumpVolume,
  }
}
