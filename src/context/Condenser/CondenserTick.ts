import { CondenserState } from "../PowerPlantState"
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
  boilerPressure: number,
  steamFromBypass: { flow: number; temp: number },
  steamFromTurbine: { flow: number; temp: number },
): CondenserState {
  // console.log("1")
  // Calculate the pressure based on the CAR & SJAE
  const { newPressure, newIsSjaeEnabled } = calculatePressure(condenserState, boilerPressure)

  // Calculate turbine to condenser flow rate based on boiler steam flow and condenser vacuum pressure.
  // The vacuum pressure affects the efficiency of steam flow from turbine to condenser.
  const intakeFromTurbineRate = calculateIntakeFlowRate(steamFromTurbine.flow, newPressure)
  // always use the bypass flow rate, doesn't need a vacuum as it has pressure (energy is not spend)
  const totalIntakeRate = intakeFromTurbineRate + steamFromBypass.flow
  // Calculate steam volume change.
  // const steamVolumeChange = Math.min(steamFlow, totalIntakeRate)
  //calculateSteamVolumeChange(steamFlow, newIntakeFlowRate)
  const newSteamVolume = condenserState.steamVolume + totalIntakeRate

  // steam temp inside the condenser is combination of the steam from the bypass and the turbine
  //  take into account the flow(volume) of the steam
  const totalFlow = steamFromBypass.flow + steamFromTurbine.flow
  const steamTemp =
    totalFlow > 0
      ? (steamFromBypass.flow * steamFromBypass.temp + steamFromTurbine.flow * steamFromTurbine.temp) /
        totalFlow
      : 0

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
    intakeFlowRate: totalIntakeRate,
    // recirculationPumpFlowRate: newRecirculationPumpFlowRate,
    steamVolume: steamVolumeAfterCondensation,
    hotwellWaterVolume: newHotwellWaterVolume,
    deltaWaterVolume: newHotwellWaterVolume - condenserState.hotwellWaterVolume,
    returnRate: condensatePumpVolume,
  }
}
