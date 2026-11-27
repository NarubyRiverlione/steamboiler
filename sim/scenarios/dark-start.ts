import PowerPlantAction from "../../src/context/PowerPlantActions"
import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { Scenario } from "../scenario"

export const PumpsAskedAt = 0 // s: the pumps asked for on a dead bus (the oil pump too)
export const RunAt = 5 // s: the operator starts the diesel (it needs no bus)
export const UpsCloseAt = 8 // s: the operator tries to close Vital→Safety (it needs no power, but the Vital bus is dead, so it is refused); the battery already feeds the safety bus
export const EarlyCloseAt = 10 // s: a close while the diesel is still starting; it is refused
export const CloseAt = 20 // s: the diesel runs (10 s start time); the operator closes the diesel breaker onto the dead bus

const act = (at: number, action: PowerPlantAction) => ({ at, action })

// Edge (#141, #169, ADR 0053, ADR 0016): the cold plant starts dark, all three breakers open. The operator asks for the start-up flows
// (condensation, recirculation and air extraction pumps and the lube oil pump) at once; with no supply they deliver
// nothing. The diesel is started at 5 s, the battery feeds the safety bus from the start (the diesel breaker needs control power); a Vital→Safety close is refused, a close during the start is refused, and
// at 20 s the diesel breaker closes onto the dead bus. The pumps run at the positions set, with no reset. The peak auxiliary load here sizes the diesel
// (docs/plant/design-basis.md). Goal: the pumps deliver flow after the close. The loop operator never closes a breaker, so the scenario sends the closes itself.
export const darkStart: Scenario = {
  name: "dark-start",
  description: "Cold plant with every breaker open: the pumps asked for deliver nothing until the diesel runs and its breaker closes at 20 s",
  duration: 120,
  sampleEvery: 1,
  initial: { ...makeInitialState(), gridSupplyBreaker: false, vitalFeedBreaker: false, safetyFeedBreaker: false },
  actions: [
    act(PumpsAskedAt, { type: "SET_CONDENSATION_PUMP_VALVE_POSITION", payload: { condensationPumpValvePosition: 0.1 } }),
    act(PumpsAskedAt, { type: "SET_RECIRCULATION_PUMP_VALVE_POSITION", payload: { recirculationPumpValvePosition: 1 } }),
    act(PumpsAskedAt, { type: "SET_AIR_EXTRACTION_PUMP_ENABLED", payload: { isAirExtractionPumpEnabled: true } }),
    act(PumpsAskedAt, { type: "SET_OIL_PUMP", payload: { pumpRunning: true } }),
    act(RunAt, { type: "SET_DIESEL_RUN", payload: { run: true } }),
    act(UpsCloseAt, { type: "CLOSE_SAFETY_FEED_BREAKER" }),
    act(EarlyCloseAt, { type: "CLOSE_DIESEL_BREAKER" }),
    act(CloseAt, { type: "CLOSE_DIESEL_BREAKER" }),
  ],
}
