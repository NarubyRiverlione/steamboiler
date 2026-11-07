import { CondenserState } from "../PowerPlantState"
import {
  calculateCondensation,
  calculateVacuumByReducers,
  CalculateCondensationFlow,
  calculateHotwellExchange,
  saturationTemperature,
  mixTemperature,
  hotwellLevel,
} from "../../utils/condenserCalculation"
import { roomInKg, waterVolumeOf } from "../../utils/boilerCalculations"
import { CstPhysics, CstSimulation } from "../const"

/**
 * Simulates the condenser vacuum behavior over time
 *
 * @param condenserState Current condenser state
 * @param boilerPressure Boiler pressure (bar), the motive steam of the SJAE
 * @param steamFromBypass Bypass steam flow (kg/s), all vapour
 * @param steamFromTurbine Turbine exhaust flow (kg/s) and its exhaust quality (vapour share by mass, 0-1)
 * @param boilerRoom kg of liquid the boiler can still take, limits the return
 * @returns Action to update the condenser state
 */
export function CondenserTick(
  condenserState: CondenserState,
  boilerPressure: number,
  steamFromBypass: { flow: number },
  steamFromTurbine: { flow: number; quality: number },
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

  // Room (kg) left in the hotwell; condensation and makeup stop there. Sized at the hotter of the hotwell and the
  // condensate, which takes more volume per kg, so the mix stays within the hotwell volume
  const hotwellRoom = roomInKg(
    CstSimulation.CstCondenser.TotalVolume,
    condenserState.hotwellWaterVolume,
    Math.max(condenserState.hotwellTemperature, saturationTemperature(newPressure)),
  )

  // Exhaust moisture is already liquid: it goes straight to the hotwell, only what does not fit joins the steam pool
  const moisture: number = steamFromTurbine.flow * (1 - steamFromTurbine.quality) * CstSimulation.DeltaTime
  const moistureToHotwell: number = Math.min(moisture, hotwellRoom)
  const newSteamMass: number =
    condenserState.steamMass + totalIntakeRate * CstSimulation.DeltaTime - moistureToHotwell

  // Calculate water level based on recirculation pump flow rate and update the temperature
  // of the condensed water returning to the boiler.
  const { steamMassAfterCondensation, waterMassAfterCondensation, newOutletTemperature } = calculateCondensation(
    newSteamMass,
    condenserState.hotwellWaterMass + moistureToHotwell,
    condenserState.recirculationPumpValvePosition,
    newPressure,
    hotwellRoom - moistureToHotwell,
  )
  // Everything that entered the hotwell this tick: the moisture and what condensed from the pool
  const condensed: number = waterMassAfterCondensation - condenserState.hotwellWaterMass

  // Condensate enters the hotwell at the outlet temperature
  const condensateTemperature = mixTemperature(
    condenserState.hotwellWaterMass,
    condenserState.hotwellTemperature,
    condensed,
    newOutletTemperature,
  )

  // High-high: the overfill clamp forces the reject fully open, the stored valve position stays as set
  const { HotwellHighHigh, HotwellLowLow } = CstSimulation.CstCondenser
  const level: number = hotwellLevel(condenserState.hotwellWaterVolume)
  const rejectValvePosition: number = level >= HotwellHighHigh ? 1 : condenserState.rejectValvePosition

  // Makeup in and reject out, before the condensation pump draws from the hotwell
  const exchange = calculateHotwellExchange(
    waterMassAfterCondensation,
    condensateTemperature,
    condenserState.makeupValvePosition,
    rejectValvePosition,
    Math.max(0, hotwellRoom - condensed),
  )

  // Low-low: the pump may not run dry, so it trips (valve shut, flag set) and returns nothing this tick
  const pumpTripped: boolean = condenserState.condensationPumpTripped || level < HotwellLowLow
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
