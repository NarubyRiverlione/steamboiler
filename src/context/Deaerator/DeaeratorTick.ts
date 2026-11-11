/**
 * Deaerator vessel (ADR 0036, ADR 0037): a lumped tank between the hotwell and the boiler, heated by steam to hold 3 bar.
 * The steam comes from the turbine tap first and from the boiler through the let-down valve for what the tap cannot give
 * (split range on one pressure loop). The tap steam of a tick is decided before the condenser runs, so it follows the demand
 * of the last tick; the let-down valve makes up the rest of this tick's demand. Pure function, no React.
 */
import { CstDeaerator, CstPhysics, CstSimulation } from "../const"
import { DeaeratorState } from "../PowerPlantState"
import { getBoilingPoint, getLiquidEnthalpy, getLiquidTemperature, getSaturationEnthalpies } from "../../utils/steamTable"
import { valveFlowFactor, waterMassOf, waterVolumeOf } from "../../utils/boilerCalculations"
import { airMassInGasSpace, airPressureOf, orificeFlow, saturationPressureOf, ventGasOf, VentGas } from "../../utils/deaeratorCalculations"

const { DeltaTime } = CstSimulation

// The temperature the 3 bar setpoint holds, and its liquid enthalpy (kJ/kg)
const SetTemperature: number = getBoilingPoint(CstDeaerator.Pressure)
const SetEnthalpy: number = getLiquidEnthalpy(SetTemperature)

export type DeaeratorInput = {
  intake: { mass: number; temperature: number } // kg of Return from the hotwell this tick, and its temperature
  drain: { mass: number; enthalpy: number } // kg of heater drain this tick, and its enthalpy (kJ/kg)
  tapSteam: { mass: number; enthalpy: number } // kg of steam the tap gave through the non-return valve this tick, and its enthalpy
  boiler: { pressure: number; steamMass: number; lowLevel: boolean } // bar, kg of steam the let-down valve may draw from, and the burner low-low trip of the boiler (the valve is shut while it holds)
}

export type DeaeratorResult = {
  state: DeaeratorState
  outflow: { mass: number; temperature: number } // kg toward the boiler this tick, and its temperature
  letDownMass: number // kg of steam taken from the boiler this tick
}

// Warnings and lamp from the air amount (ADR 0038): the lamp is the air partial pressure under the threshold (a lit lamp
// holds up to the release pressure); the flags are the two mistakes, the start-up vent closed while air is present and open
// with none left
function lampAndFlags(airPressure: number, startUpVentOpen: boolean, wasSafe: boolean) {
  const limit: number = wasSafe ? CstDeaerator.SafeToCloseRelease : CstDeaerator.SafeToClosePressure
  const safeToClose: boolean = airPressure < limit
  return { safeToClose, warnVentClosedWithAir: !startUpVentOpen && !safeToClose, warnVentOpenNoAir: startUpVentOpen && safeToClose }
}

// The vessel as filled cold: the cold fill level of the total volume, at ambient, full of air at atmospheric pressure (ADR 0037, ADR 0038)
export function makeColdDeaerator(): DeaeratorState {
  const volume: number = CstDeaerator.TotalVolume * CstDeaerator.StartLevel
  const temperature: number = CstPhysics.AmbientTemperature
  const saturationPressure: number = saturationPressureOf(temperature)
  const airPressure: number = CstPhysics.AtmosphericPressure_mBar / 1e3 - saturationPressure
  return {
    waterMass: waterMassOf(volume, temperature),
    waterVolume: volume,
    temperature,
    pressure: saturationPressure + airPressure,
    saturationPressure,
    airMass: airMassInGasSpace(airPressure, temperature, volume),
    airPressure,
    startUpVentOpen: false,
    reliefValveOpen: false,
    ventedTotal: 0,
    ...lampAndFlags(airPressure, false, false),
    extractionFlow: 0,
    tapDemand: CstDeaerator.ExtractionValveCapacity, // a cold vessel asks for all the steam the valve passes
    extractionValvePosition: 0,
    letDownFlow: 0,
    letDownValvePosition: 0,
    outflowMass: 0,
  }
}

// The vessel as it stands once hot: at the 3 bar setpoint with the air out and the start-up vent shut, at the volume given (litres)
export function makeHotDeaerator(volume: number): DeaeratorState {
  const waterMass: number = waterMassOf(volume, SetTemperature)
  return {
    ...makeColdDeaerator(),
    waterMass,
    waterVolume: volume,
    temperature: SetTemperature,
    pressure: CstDeaerator.Pressure,
    saturationPressure: CstDeaerator.Pressure,
    airMass: 0,
    airPressure: 0,
    ...lampAndFlags(0, false, true),
  }
}

// Steam (kg/s) the let-down valve passes: its capacity scaled with the boiler pressure like the steam valves (ADR 0026),
// and nothing while the boiler is at or below the deaerator pressure, so the pressure needed at start-up falls out of the physics
export function letDownCapacity(boilerPressure: number, deaeratorPressure: number): number {
  if (boilerPressure <= deaeratorPressure) return 0
  const choke: number = Math.min(1, (boilerPressure - deaeratorPressure) / deaeratorPressure)
  return CstDeaerator.LetDownCapacity * valveFlowFactor(boilerPressure) * choke
}

/**
 * One tick of the vessel. The heat that brings the stored water and the inflow to the setpoint is the steam demand; the
 * tap supplies it first, the let-down valve the rest. The steam that heats the stored water stays in the tank (the level
 * rises); the rest leaves with the inflow: out = intake + drain + the steam that heated them (until #112).
 */
export function DeaeratorTick(state: DeaeratorState, input: DeaeratorInput): DeaeratorResult {
  const { intake, drain, tapSteam, boiler } = input
  const storedEnthalpy: number = getLiquidEnthalpy(state.temperature)
  const intakeEnthalpy: number = getLiquidEnthalpy(intake.temperature)

  // Heat (kJ) to bring everything to the setpoint; steam adds mass at the setpoint, so each kg of steam gives its enthalpy less that
  const contentDemand: number = Math.max(0, state.waterMass * (SetEnthalpy - storedEnthalpy))
  const demand: number = contentDemand + intake.mass * (SetEnthalpy - intakeEnthalpy) + drain.mass * (SetEnthalpy - drain.enthalpy)

  const letDownEnthalpy: number = getSaturationEnthalpies(boiler.pressure).vapor
  const tapMass: number = Math.max(0, tapSteam.mass)
  let letDownMass = 0
  if (demand > 0) {
    const remaining: number = demand - tapMass * (tapSteam.enthalpy - SetEnthalpy)
    const valveMass: number = boiler.lowLevel ? 0 : letDownCapacity(boiler.pressure, state.pressure) * DeltaTime
    letDownMass = Math.min(Math.max(0, remaining) / (letDownEnthalpy - SetEnthalpy), valveMass, Math.max(0, boiler.steamMass))
  }
  const steamMass: number = tapMass + letDownMass

  // Perfect mixing: everything ends at one enthalpy
  const totalMass: number = state.waterMass + intake.mass + drain.mass + steamMass
  const totalEnthalpy: number =
    state.waterMass * storedEnthalpy +
    intake.mass * intakeEnthalpy +
    drain.mass * drain.enthalpy +
    tapMass * tapSteam.enthalpy +
    letDownMass * letDownEnthalpy
  const temperature: number = getLiquidTemperature(totalEnthalpy / totalMass)

  // The share of the steam that heated the stored water stays; the rest passes through with the inflow
  const retained: number = demand > 0 && steamMass > 0 ? steamMass * Math.min(1, contentDemand / demand) : 0
  const mixedMass: number = state.waterMass + retained
  const outflowMass: number = totalMass - mixedMass

  // Vents and relief (ADR 0038): flows from the pressure at the start of the tick, the mixture of air and steam of the gas space
  const gas: VentGas = ventGasOf(state.airPressure, state.saturationPressure, state.temperature)
  const reliefOpen: boolean = state.reliefValveOpen ? state.pressure > CstDeaerator.ReliefReseatPressure : state.pressure >= CstDeaerator.ReliefPressure
  const ventArea: number = CstDeaerator.OperatingVentArea + (state.startUpVentOpen ? CstDeaerator.StartUpVentArea : 0)
  const reliefFlow: number = reliefOpen ? (CstDeaerator.ReliefCapacity * state.pressure) / CstDeaerator.ReliefPressure : 0
  const ventedMixture: number = (orificeFlow(ventArea, gas.density, state.pressure) + reliefFlow) * DeltaTime
  const airOut: number = Math.min(state.airMass, ventedMixture * gas.airShare)
  const steamOut: number = ventedMixture * (1 - gas.airShare)

  // The vented steam leaves the mixed water as saturated vapour: everything that is left is cooler by its latent heat
  const waterMass: number = mixedMass - steamOut
  const waterEnthalpy: number = (totalEnthalpy - steamOut * getSaturationEnthalpies(saturationPressureOf(temperature)).vapor) / (totalMass - steamOut)
  const waterTemperature: number = steamOut > 0 ? getLiquidTemperature(waterEnthalpy) : temperature
  const waterVolume: number = waterVolumeOf(waterMass, waterTemperature)
  const airMass: number = state.airMass - airOut
  const saturationPressure: number = saturationPressureOf(waterTemperature)
  const airPressure: number = airPressureOf(airMass, waterTemperature, waterVolume)

  return {
    state: {
      waterMass,
      waterVolume,
      temperature: waterTemperature,
      pressure: saturationPressure + airPressure,
      saturationPressure,
      airMass,
      airPressure,
      startUpVentOpen: state.startUpVentOpen,
      reliefValveOpen: reliefOpen,
      ventedTotal: state.ventedTotal + steamOut,
      ...lampAndFlags(airPressure, state.startUpVentOpen, state.safeToClose),
      extractionFlow: tapMass / DeltaTime,
      tapDemand: Math.min(CstDeaerator.ExtractionValveCapacity, Math.max(0, demand) / (tapSteam.enthalpy - SetEnthalpy) / DeltaTime),
      extractionValvePosition: Math.min(1, tapMass / DeltaTime / CstDeaerator.ExtractionValveCapacity),
      letDownFlow: letDownMass / DeltaTime,
      letDownValvePosition: Math.min(1, letDownMass / DeltaTime / CstDeaerator.LetDownCapacity),
      outflowMass,
    },
    outflow: { mass: outflowMass, temperature: waterTemperature },
    letDownMass,
  }
}
