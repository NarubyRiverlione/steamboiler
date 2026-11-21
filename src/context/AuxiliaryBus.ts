/**
 * Auxiliary bus (#141, ADR 0053): the bus that powers the pumps is fed by the grid supply breaker, by the generator
 * breaker, by the diesel breaker (#169), or any together. With all three open the bus is dead and every pump stops (flow 0), while the stored valve positions and
 * switches stay as the operator set them, so the pumps resume when the bus is fed again, with no reset step. Opening the grid supply
 * breaker is never refused (#182): with the generator breaker closed the plant runs on house load.
 */
import PowerPlantState, { CondenserState, DeaeratorState, OilState } from "./PowerPlantState"

// Derived every tick, never stored: any of the three breakers feeds the bus
export const isBusLive = ({ gridSupplyBreaker, dieselBreaker, Turbine }: PowerPlantState): boolean => gridSupplyBreaker || Turbine.generatorBreaker || dieselBreaker

// House load operation (#182, ADR 0053): the grid supply breaker open with the generator breaker closed. The generator carries the bus,
// so the auxiliary load is the shaft load; the load setpoint stays in state but is ignored (its command does nothing; the disabled control is #142).
export const isHouseLoad = ({ gridSupplyBreaker, Turbine }: PowerPlantState): boolean => !gridSupplyBreaker && Turbine.generatorBreaker

// Why the load setpoint does nothing, or undefined: in house load operation the generator follows the auxiliary load (#142 shows it as a lamp)
export const houseLoadRefusal = (state: PowerPlantState): string | undefined =>
  isHouseLoad(state) ? "House load operation: the grid supply breaker is open" : undefined

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

