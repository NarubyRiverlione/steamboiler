import { CondenserState } from "../PowerPlantState"
import {
  calculateCondensation,
  calculateVacuumByReducers,
  CalculateCondensationFlow,
  calculateHotwellExchange,
  saturationTemperature,
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

  // Room (kg) left in the hotwell; condensation and makeup stop there. Sized at the hotter of the hotwell and the
  // condensate, which takes more volume per kg, so the mix stays within the hotwell volume
  const hotwellRoom = roomInKg(
    CstSimulation.CstCondenser.TotalVolume,
    condenserState.hotwellWaterVolume,
    Math.max(condenserState.hotwellTemperature, saturationTemperature(newPressure)),
  )

  // Calculate water level based on recirculation pump flow rate and update the temperature
  // of the condensed water returning to the boiler.
  const { steamMassAfterCondensation, waterMassAfterCondensation, newOutletTemperature } = calculateCondensation(
    newSteamMass,
    condenserState.hotwellWaterMass,
    condenserState.recirculationPumpValvePosition,
    newPressure,
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

  // High-high: the overfill clamp forces the reject fully open, the stored valve position stays as set
  const { HotwellHighHigh } = CstSimulation.CstCondenser
  const rejectValvePosition: number =
    condenserState.hotwellWaterVolume / CstSimulation.CstCondenser.TotalVolume >= HotwellHighHigh
      ? 1
      : condenserState.rejectValvePosition

  // Makeup in and reject out, before the condensation pump draws from the hotwell
  const exchange = calculateHotwellExchange(
    waterMassAfterCondensation,
    condensateTemperature,
    condenserState.makeupValvePosition,
    rejectValvePosition,
    Math.max(0, hotwellRoom - condensed),
  )

  // Low-low: the pump may not run dry, so it trips (valve shut, flag set) and returns nothing this tick
  const { TotalVolume, HotwellLowLow } = CstSimulation.CstCondenser
  const pumpTripped: boolean =
    condenserState.condensationPumpTripped || condenserState.hotwellWaterVolume / TotalVolume < HotwellLowLow
  const pumpValvePosition: number = pumpTripped ? 0 : condenserState.condensationPumpValvePosition

  // Condensation pump transfer: the return, limited by the hotwell and the room in the boiler
  const { condensatePumpMass, newHotwellWaterMass } = CalculateCondensationFlow(
    pumpValvePosition,
    exchange.mass,
    exchange.temperature,
    boilerRoom,
  )

  return {
    ...condenserState,
    pressure: newPressure,
    isSjaeEnabled: newIsSjaeEnabled,
    condensationPumpValvePosition: pumpValvePosition,
    condensationPumpTripped: pumpTripped,
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
