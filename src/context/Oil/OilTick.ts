/**
 * Turbine lube oil (ADR 0050): one oil pump builds the header pressure and the pressure decays when it stops, each as a
 * first-order lag. A dead bus stops the pump: AuxiliaryBus runs the tick with it off. Figures and their UNVERIFIED status: docs/research/2026-11-lube-oil.md.
 */
import { CstOil, CstSimulation } from "../const"
import { OilState, TurbineState } from "../PowerPlantState"

const { DeltaTime } = CstSimulation

// One tick: the header pressure moves toward the nominal pressure with the pump running, toward 0 without it
export function OilTick(oil: OilState): OilState {
  const target: number = oil.pumpRunning ? CstOil.NominalPressure : 0
  const timeConstant: number = oil.pumpRunning ? CstOil.BuildTimeConstant : CstOil.DecayTimeConstant
  return { ...oil, headerPressure: target + (oil.headerPressure - target) * Math.exp(-DeltaTime / timeConstant) }
}

// The turbine may be rolled (the valve opened) from the permissive pressure up
export const isAtOilPermissive = (oil: OilState): boolean => oil.headerPressure >= CstOil.PermissivePressure

// True below the trip limit: trips a running turbine, and blocks the trip reset while it lasts
export const isBelowOilTripLimit = (oil: OilState): boolean => oil.headerPressure < CstOil.TripPressure

// "Running" (ADR 0050): above the running speed or with the turbine valve open
export const isTurbineRunning = (turbine: TurbineState): boolean => turbine.rpm > CstOil.RunningRPM || turbine.turbineValvePosition > 0
