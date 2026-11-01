import { CondenserState } from "../PowerPlantState"
import {
  calculateCondensation,
  calculateVacuumByReducers,
  CalculateCondensationFlow,
  calculateHotwellExchange,
  mixTemperature,
} from "../../utils/condenserCalculation"
import { roomInKg, waterVolumeOf } from "../../utils/boilerCalculations"
import { CstPhysics, CstSimulation } from "../const"

/**
 * Simulates the condenser vacuum behavior over time
 *
 * @param condenserState Current condenser state
 * @param steamFlow Steam flow from bypass or turbine (kg/s)
 * @param steamTemp Steam flow from bypass or turbine  (C)
 * @param steamPressure Steam flow from bypass or turbine  (bar)
 * @param boilerRoom kg of liquid the boiler can still take, limits the return
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

  // Room (kg) left in the hotwell at its temperature; condensation and makeup stop there
  const hotwellRoom = roomInKg(
    CstSimulation.CstCondenser.TotalVolume,
    condenserState.hotwellWaterVolume,
    condenserState.hotwellTemperature,
  )

  // Calculate water level based on recirculation pump flow rate and update the temperature
  // of the condensed water returning to the boiler.
  const { steamMassAfterCondensation, waterMassAfterCondensation, newOutletTemperature } = calculateCondensation(
    newSteamMass,
    condenserState.hotwellWaterMass,
    condenserState.recirculationPumpValvePosition,
    steamTemp,
    hotwellRoom,
  )
  const condensed: number = waterMassAfterCondensation - condenserState.hotwellWaterMass

  // Condensate enters the hotwell at the outlet temperature
  const condensateTemperature = mixTemperature(
    condenserState.hotwellWaterMass,
    condenserState.hotwellTemperature,
    condensed,
    newOutletTemperature,
  )

  // Makeup in and reject out, before the condensation pump draws from the hotwell
  const exchange = calculateHotwellExchange(
    waterMassAfterCondensation,
    condensateTemperature,
    condenserState.makeupValvePosition,
    condenserState.rejectValvePosition,
    Math.max(0, hotwellRoom - condensed),
  )

  // Condensation pump transfer: the return, limited by the hotwell and the room in the boiler
  const { condensatePumpMass, newHotwellWaterMass } = CalculateCondensationFlow(
    condenserState.condensationPumpValvePosition,
    exchange.mass,
    exchange.temperature,
    boilerRoom,
  )

  return {
    ...condenserState,
    pressure: newPressure,
    isSjaeEnabled: newIsSjaeEnabled,
    intakeFlowRate: totalIntakeRate,
    // recirculationPumpFlowRate: newRecirculationPumpFlowRate,
    steamMass: steamMassAfterCondensation,
    hotwellWaterMass: newHotwellWaterMass,
    hotwellWaterVolume: waterVolumeOf(newHotwellWaterMass, exchange.temperature), // derived here and nowhere else
    hotwellTemperature: exchange.temperature,
    makeupTotal: condenserState.makeupTotal + exchange.makeup,
    rejectTotal: condenserState.rejectTotal + exchange.reject,
    deltaWaterMass: newHotwellWaterMass - condenserState.hotwellWaterMass,
    returnRate: condensatePumpMass,
    condensationRate: condensed / CstSimulation.DeltaTime,
  }
}
