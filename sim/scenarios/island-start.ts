import PowerPlantAction from "../../src/context/PowerPlantActions"
import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { Scenario } from "../scenario"

export const PumpsAskedAt = 0 // s: the pumps asked for on a dead bus (the oil pump too)
export const RefusedRunAt = 2 // s: RUN on the big diesel with the Vital bus dead (no cooling power); it does nothing
export const EarlyUpsCloseAt = 30 // s: Vital→Safety close while the EMY diesel is still warming up; refused (the battery feeds the Safety bus)
export const UpsCloseAt = 72 // s: the EMY diesel is warmed up (10 s start, 60 s warm-up); Vital→Safety closes and the Safety bus is back on the Vital bus
export const RunAt = 75 // s: the operator starts the big diesel on the Vital bus' cooling power
export const EarlyCloseAt = 80 // s: a close while the big diesel is still starting; it is refused
export const CloseAt = 90 // s: the big diesel runs (10 s start time); the operator closes its breaker onto the dead Auxiliary bus
export const VitalFeedAt = 95 // s: Aux→Vital closes; the EMY breaker opens on the same tick
export const SelectorOffAt = 100 // s: the EMY selector goes to OFF; the EMY diesel stops

const act = (at: number, action: PowerPlantAction) => ({ at, action })

// Edge (#141, #169, #199, ADR 0053, ADR 0056, ADR 0016): the island start. Every source is dead (Aux→Vital and Vital→Safety open, the battery
// feeds, EMY selector AUTO) and the pumps are asked for at once; with no supply they deliver nothing. The EMY diesel starts by itself and closes
// onto the Vital bus; a RUN of the big diesel before that does nothing. After the warm-up Vital→Safety closes (a close during it is refused). The big
// diesel starts on the Vital bus' cooling power, its breaker closes onto the dead Auxiliary bus (a close during the start is refused), Aux→Vital closes
// (the EMY breaker opens on that tick) and the selector goes to OFF. The pumps run at the positions set, with no reset. The peak auxiliary load here
// sizes the big diesel (docs/plant/design-basis.md). Goal: the pumps deliver flow after the close. The loop operator never closes a breaker, so the
// scenario sends the closes itself.
export const islandStart: Scenario = {
  name: "island-start",
  description: "Every source dead: the EMY diesel gives the Vital bus, the big diesel's breaker closes onto the dead Auxiliary bus at 90 s, Aux→Vital takes over and the EMY selector goes OFF",
  duration: 150,
  sampleEvery: 1,
  initial: { ...makeInitialState(), gridSupplyBreaker: false, vitalFeedBreaker: false, safetyFeedBreaker: false },
  actions: [
    act(PumpsAskedAt, { type: "SET_CONDENSATION_PUMP_VALVE_POSITION", payload: { condensationPumpValvePosition: 0.1 } }),
    act(PumpsAskedAt, { type: "SET_RECIRCULATION_PUMP_VALVE_POSITION", payload: { recirculationPumpValvePosition: 1 } }),
    act(PumpsAskedAt, { type: "SET_AIR_EXTRACTION_PUMP_ENABLED", payload: { isAirExtractionPumpEnabled: true } }),
    act(PumpsAskedAt, { type: "SET_OIL_PUMP", payload: { pumpRunning: true } }),
    act(RefusedRunAt, { type: "SET_DIESEL_RUN", payload: { run: true } }),
    act(EarlyUpsCloseAt, { type: "CLOSE_SAFETY_FEED_BREAKER" }),
    act(UpsCloseAt, { type: "CLOSE_SAFETY_FEED_BREAKER" }),
    act(RunAt, { type: "SET_DIESEL_RUN", payload: { run: true } }),
    act(EarlyCloseAt, { type: "CLOSE_DIESEL_BREAKER" }),
    act(CloseAt, { type: "CLOSE_DIESEL_BREAKER" }),
    act(VitalFeedAt, { type: "CLOSE_VITAL_FEED_BREAKER" }),
    act(SelectorOffAt, { type: "SET_EMY_SELECTOR", payload: { selector: "OFF" } }),
  ],
}
