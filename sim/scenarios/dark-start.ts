import PowerPlantAction from "../../src/context/PowerPlantActions"
import { makeInitialState } from "../../src/context/PowerPlantReducer"
import { Scenario } from "../scenario"

export const PumpsAskedAt = 0 // s: the pumps asked for on a dead bus (the oil pump too)
export const UpsCloseAt = 50 // s: the operator closes the UPS breaker (it needs no power); the safety bus is live
export const CloseAt = 60 // s: the operator closes the grid supply breaker, the bus is live

const act = (at: number, action: PowerPlantAction) => ({ at, action })

// Edge (#141, ADR 0053, ADR 0016): the cold plant starts dark, the grid supply breaker open and the generator breaker open. The operator
// asks for the condensation and recirculation pumps and the lube oil pump at once; with no supply they deliver nothing. When the
// UPS breaker closes at 50 s (the grid supply breaker needs control power), the grid supply breaker at 60 s. When the grid breaker closes the pumps run at the positions set, with no reset. Goal: the pumps deliver flow after the close. The loop operator
// never closes the breaker, so the scenario sends the close itself.
export const darkStart: Scenario = {
  name: "dark-start",
  description: "Cold plant with the grid supply breaker open: the pumps asked for deliver nothing until the breaker is closed at 60 s",
  duration: 120,
  sampleEvery: 1,
  initial: { ...makeInitialState(), gridSupplyBreaker: false, upsBreaker: false },
  actions: [
    act(PumpsAskedAt, { type: "SET_CONDENSATION_PUMP_VALVE_POSITION", payload: { condensationPumpValvePosition: 0.1 } }),
    act(PumpsAskedAt, { type: "SET_RECIRCULATION_PUMP_VALVE_POSITION", payload: { recirculationPumpValvePosition: 1 } }),
    act(PumpsAskedAt, { type: "SET_OIL_PUMP", payload: { pumpRunning: true } }),
    act(UpsCloseAt, { type: "CLOSE_UPS_BREAKER" }),
    act(CloseAt, { type: "CLOSE_GRID_SUPPLY_BREAKER" }),
  ],
}
