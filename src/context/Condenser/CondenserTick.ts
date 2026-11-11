import { CondenserState } from "../PowerPlantState"
import {
  airPressureOf,
  calculateAirInventory,
  calculateCondensation,
  CalculateCondensationFlow,
  solveShellVapourPressure,
  SteamStream,
  calculateHotwellExchange,
  saturationTemperature,
  mixTemperature,
  hotwellLevel,
} from "../../utils/condenserCalculation"
import { roomInKg, waterVolumeOf } from "../../utils/boilerCalculations"
import { CstSimulation } from "../const"

/**
 * One condenser tick: the air inventory, the shell vapour pressure from the heat balance, the condensation and the hotwell (ADR 0035)
 *
 * @param condenserState Current condenser state
 * @param boilerPressure Boiler pressure (bar), the motive steam of the SJAE
 * @param steamFromBypass Bypass steam flow (kg/s) and its enthalpy (kJ/kg)
 * @param steamFromTurbine Turbine exhaust flow (kg/s) and its enthalpy (kJ/kg), what the shaft left in it
 * @param deaeratorRoom kg of liquid the deaerator can still take, limits the return
 * @returns Action to update the condenser state
 */
export function CondenserTick(
  condenserState: CondenserState,
  boilerPressure: number,
  steamFromBypass: { flow: number; enthalpy: number },
  steamFromTurbine: { flow: number; enthalpy: number },
  deaeratorRoom: number,
): CondenserState {
  const { DeltaTime, CstCondenser } = CstSimulation

  // Air first (ADR 0035): in-leakage, the air extraction pump and the SJAE
  const { airMass, newIsSjaeEnabled } = calculateAirInventory(condenserState, boilerPressure)

  // All turbine exhaust and bypass steam enters the condenser; vacuum does not scale the mass flow
  const totalIntakeRate = steamFromTurbine.flow + steamFromBypass.flow
  const streams: SteamStream[] = [steamFromBypass, steamFromTurbine]

  // Shell vapour pressure: where the exchanger takes the intake's heat. It stops at the hood relief, less the air there
  const coolingWaterFlow: number = condenserState.recirculationPumpValvePosition * CstCondenser.RecirculationPump_MaxFlowRate
  const airAtLastPressure: number = airPressureOf(airMass, saturationTemperature(condenserState.pressure))
  const vapourPressure: number = solveShellVapourPressure(
    streams,
    coolingWaterFlow,
    CstCondenser.HoodReliefPressure - airAtLastPressure,
    condenserState.hotwellTemperature,
  )
  const shellTemperature: number = saturationTemperature(vapourPressure)
  const newPressure: number = Math.min(
    CstCondenser.HoodReliefPressure,
    vapourPressure + airPressureOf(airMass, shellTemperature),
  )

  // Room (kg) left in the hotwell; condensation and makeup stop there. Sized at the hotter of the hotwell and the
  // condensate, which takes more volume per kg, so the mix stays within the hotwell volume
  const hotwellRoom = roomInKg(
    CstCondenser.TotalVolume,
    condenserState.hotwellWaterVolume,
    Math.max(condenserState.hotwellTemperature, shellTemperature),
  )

  // Every stream enters at its real enthalpy: moisture goes straight to the hotwell, the vapour and the heat above
  // saturated vapour load the cooling water (ADR 0032). What the exchanger or the hotwell cannot take leaves as vent
  const { condensed, vented, newOutletTemperature, coolingWaterOutletTemperature } = calculateCondensation(
    streams,
    condenserState.recirculationPumpValvePosition,
    vapourPressure,
    hotwellRoom,
  )
  const waterMassAfterCondensation: number = condenserState.hotwellWaterMass + condensed

  // Condensate enters the hotwell at the outlet temperature
  const condensateTemperature = mixTemperature(
    condenserState.hotwellWaterMass,
    condenserState.hotwellTemperature,
    condensed,
    newOutletTemperature,
  )

  // High-high: the overfill clamp forces the reject fully open, the stored valve position stays as set
  const { HotwellHighHigh, HotwellLowLow } = CstCondenser
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

  // Condensation pump transfer: the return, limited by the hotwell and the room in the deaerator
  const { condensatePumpMass, newHotwellWaterMass } = CalculateCondensationFlow(
    pumpValvePosition,
    exchange.mass,
    exchange.temperature,
    deaeratorRoom,
  )

  return {
    ...condenserState,
    pressure: newPressure,
    isSjaeEnabled: newIsSjaeEnabled,
    condensationPumpValvePosition: pumpValvePosition,
    condensationPumpTripped: pumpTripped,
    intakeFlowRate: totalIntakeRate,
    coolingWaterOutletTemperature,
    // recirculationPumpFlowRate: newRecirculationPumpFlowRate,
    airMass,
    ventedTotal: condenserState.ventedTotal + vented,
    hotwellWaterMass: newHotwellWaterMass,
    hotwellWaterVolume: waterVolumeOf(newHotwellWaterMass, exchange.temperature), // derived here and nowhere else
    hotwellTemperature: exchange.temperature,
    makeupTotal: condenserState.makeupTotal + exchange.makeup,
    rejectTotal: condenserState.rejectTotal + exchange.reject,
    deltaWaterMass: newHotwellWaterMass - condenserState.hotwellWaterMass,
    returnRate: condensatePumpMass,
    condensationRate: condensed / DeltaTime,
  }
}
