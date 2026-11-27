import PowerPlantAction from "../../src/context/PowerPlantActions"
import { withEmyFeedingVital } from "../../src/context/EmergencyDiesel"
import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { Scenario } from "../scenario"

export const RunAt = 0 // s: the diesel starts, on the Vital bus' cooling power (the EMY diesel runs)
export const CloseAt = 15 // s: the diesel runs; its breaker closes onto the dead bus with the small start-up load
export const OverloadAt = 30 // s: the operator opens the feed pump and the recirculation pump past what the diesel can carry
export const ReclosedAt = 40 // s: the operator recloses with the load still too high

const act = (at: number, action: PowerPlantAction) => ({ at, action })

// Edge (#169, #199, ADR 0053): the diesel is the sole supply and the pumps are opened past its rating. The diesel breaker opens on that tick and the
// diesel keeps running (not a latched trip); a reclose with the load unchanged opens it again. Goal: breaker open, diesel running, bus dead.
export const dieselOverload: Scenario = {
  name: "diesel-overload",
  description: "The diesel feeds a dead bus; the feed and recirculation pumps opened at 30 s pass its rating, the diesel breaker opens and the diesel keeps running",
  duration: 60,
  sampleEvery: 0.1,
  // The EMY diesel already feeds the Vital bus: the big diesel's cooling power (#199); without it the overload would kill the Vital bus and stop the diesel
  initial: withEmyFeedingVital({ ...makeInitialState(), gridSupplyBreaker: false }),
  actions: [
    act(RunAt, { type: "SET_DIESEL_RUN", payload: { run: true } }),
    act(CloseAt, { type: "CLOSE_DIESEL_BREAKER" }),
    act(OverloadAt, { type: "SET_FEED_PUMP_VALVE_POSITION", payload: { feedPumpValvePosition: 1 } }),
    act(OverloadAt, { type: "SET_RECIRCULATION_PUMP_VALVE_POSITION", payload: { recirculationPumpValvePosition: 1 } }),
    act(ReclosedAt, { type: "CLOSE_DIESEL_BREAKER" }),
  ],
}
