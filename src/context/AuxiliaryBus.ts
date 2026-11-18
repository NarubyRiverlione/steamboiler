/**
 * Auxiliary bus (#141, ADR 0053): the bus that powers the pumps is fed by the grid supply breaker, by the generator
 * breaker, or both. With both open the bus is dead and every pump stops (flow 0), while the stored valve positions and
 * switches stay as the operator set them, so the pumps resume when the bus is fed again, with no reset step.
 */
import PowerPlantState, { CondenserState, DeaeratorState, OilState } from "./PowerPlantState"

// Derived every tick, never stored: either breaker feeds the bus
export const isBusLive = ({ gridSupplyBreaker, Turbine }: PowerPlantState): boolean => gridSupplyBreaker || Turbine.generatorBreaker

// Why the operator cannot open the grid supply breaker, or undefined when it can: the generator must carry the bus (the actual output,
// not the setpoint, because the load follows the setpoint at the load rate). The reducer refuses on it and the UI shows it.
export function gridSupplyOpenRefusal({ gridSupplyBreaker, auxiliaryLoad, Turbine }: PowerPlantState): string | undefined {
  if (!gridSupplyBreaker) return undefined
  if (!Turbine.generatorBreaker) return "Close the generator breaker first"
  if (Turbine.electricOutput < auxiliaryLoad) return "The electric output is below the auxiliary load"
  return undefined
}

// Why a load setpoint cannot be set while the grid supply breaker is open (the generator must carry the auxiliary load), or undefined
export function loadSetpointFloorRefusal({ gridSupplyBreaker, auxiliaryLoad }: PowerPlantState, loadSetpoint: number): string | undefined {
  return !gridSupplyBreaker && loadSetpoint < auxiliaryLoad ? "The load setpoint cannot go below the auxiliary load with the grid supply breaker open" : undefined
}

export type BusPumps = { Deaerator: DeaeratorState; Condenser: CondenserState; Oil: OilState }

// The plant as the tick sees it on a dead bus: every pump stopped
export const stopPumps = ({ Deaerator, Condenser, Oil }: BusPumps): BusPumps => ({
  Deaerator: { ...Deaerator, feedPumpValvePosition: 0 },
  Condenser: { ...Condenser, condensationPumpValvePosition: 0, recirculationPumpValvePosition: 0, isAirExtractionPumpEnabled: false },
  Oil: { ...Oil, pumpRunning: false },
})

// After a tick on a dead bus: the operator's positions and switches come back. A pump the tick itself tripped or shut (a protection)
// stays shut, as on a live bus; a switch the tick did not touch is as the operator set it.
export function restorePumps(before: BusPumps, ticked: BusPumps, feedPumpShutByLevel: boolean, condensationPumpShutByLevel: boolean): BusPumps {
  return {
    Deaerator: { ...ticked.Deaerator, feedPumpValvePosition: ticked.Deaerator.feedPumpTripped || feedPumpShutByLevel ? 0 : before.Deaerator.feedPumpValvePosition },
    Condenser: {
      ...ticked.Condenser,
      condensationPumpValvePosition: ticked.Condenser.condensationPumpTripped || condensationPumpShutByLevel ? 0 : before.Condenser.condensationPumpValvePosition,
      recirculationPumpValvePosition: before.Condenser.recirculationPumpValvePosition,
      isAirExtractionPumpEnabled: before.Condenser.isAirExtractionPumpEnabled && !ticked.Condenser.airPumpTripped,
    },
    Oil: { ...ticked.Oil, pumpRunning: before.Oil.pumpRunning },
  }
}

