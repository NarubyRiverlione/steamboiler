import { CondenserState } from "../PowerPlantState"
import {
  calculateCondensation,
  calculateVacuumByReducers,
  CalculateCondensationFlow,
  calculateHotwellExchange,
  mixTemperature,
} from "../../utils/condenserCalculation"
import { CstPhysics, CstSimulation } from "../const"

/**
 * Simulates the condenser vacuum behavior over time
 *
 * @param condenserState Current condenser state
 * @param steamFlow Steam flow from bypass or turbine (kg/s)
 * @param steamTemp Steam flow from bypass or turbine  (C)
 * @param steamPressure Steam flow from bypass or turbine  (bar)
 * @param boilerRoom Liters of liquid the boiler can still take, limits the return
 * @returns Action to update the condenser state
 */
export function CondenserTick(
  condenserState: CondenserState,
  boilerPressure: number,
  steamFromBypass: { flow: number; temp: number },
  steamFromTurbine: { flow: number; temp: number; pressure: number },
  boilerRoom: number,
): CondenserState {
  // console.log("1")

  // Calculate the pressure based on the CAR & SJAE
  const { vacuumByReducers, newIsSjaeEnabled } = calculateVacuumByReducers(condenserState, boilerPressure)
  // Pressure change by steam volume
  const pressureBySteam = condenserState.steamMass / 1000
  const newPressure = CstPhysics.AtmosphericPressure_mBar + pressureBySteam - vacuumByReducers

  // console.log(
  //   "pressureBySteam " + pressureBySteam.toFixed(1) + ", vacuumByReducers " + vacuumByReducers.toFixed(0),
  // )

  // All turbine exhaust and bypass steam enters the condenser; vacuum does not scale the mass flow
  const totalIntakeRate = steamFromTurbine.flow + steamFromBypass.flow
  const newSteamMass = condenserState.steamMass + totalIntakeRate * CstSimulation.DeltaTime

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
  const { steamVolumeAfterCondensation, waterVolumeAfterCondensation, newOutletTemperature } = calculateCondensation(
    newSteamMass,
    condenserState.hotwellWaterVolume,
    condenserState.recirculationPumpValvePosition,
    steamTemp,
  )

  // Condensate enters the hotwell at the outlet temperature
  const condensateTemperature = mixTemperature(
    condenserState.hotwellWaterVolume,
    condenserState.hotwellTemperature,
    waterVolumeAfterCondensation - condenserState.hotwellWaterVolume,
    newOutletTemperature,
  )

  // Makeup in and reject out, before the condensation pump draws from the hotwell
  const exchange = calculateHotwellExchange(
    waterVolumeAfterCondensation,
    condensateTemperature,
    condenserState.makeupValvePosition,
    condenserState.rejectValvePosition,
  )

  // Condensation pump transfer: the return, limited by the hotwell and the room in the boiler
  const { condensatePumpVolume, newHotwellWaterVolume } = CalculateCondensationFlow(
    condenserState.condensationPumpValvePosition,
    exchange.volume,
    boilerRoom,
  )

  return {
    ...condenserState,
    pressure: newPressure,
    isSjaeEnabled: newIsSjaeEnabled,
    intakeFlowRate: totalIntakeRate,
    // recirculationPumpFlowRate: newRecirculationPumpFlowRate,
    steamMass: steamVolumeAfterCondensation,
    hotwellWaterVolume: newHotwellWaterVolume,
    hotwellTemperature: exchange.temperature,
    makeupTotal: condenserState.makeupTotal + exchange.makeup,
    rejectTotal: condenserState.rejectTotal + exchange.reject,
    deltaWaterVolume: newHotwellWaterVolume - condenserState.hotwellWaterVolume,
    returnRate: condensatePumpVolume,
    condensationRate: (waterVolumeAfterCondensation - condenserState.hotwellWaterVolume) / CstSimulation.DeltaTime,
  }
}
