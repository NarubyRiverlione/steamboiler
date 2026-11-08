import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { airMassOf } from "../../src/utils/condenserCalculation"
import { holdLoop } from "./loop-operator"

// The air at which the shell sits just under the vacuum limit (327 mbar) at the sync-idle vapour pressure of about 25 mbar (21 °C):
// about 300 mbar of air. The sourced in-leakage (0.0022 kg/s) takes 5 to 60 hours to get there from the design vacuum
// (ADR 0035), so the scenario starts a few minutes short of the trip.
const AirJustUnderTheLimit = airMassOf(298, 21)

// Edge (#91): the air extraction pump and the SJAE both off. Nothing removes the in-leakage, the air builds up and the
// pressure rises until the turbine trips on the vacuum limit (ADR 0003). The loop operator's holds keep running, so the boiler is held after the trip;
// nobody touches the vacuum system again.
export const vacuumLoss: Scenario = {
  name: "vacuum-loss",
  description:
    "From the turbine-sync snapshot with the shell nearly at the vacuum limit and the pump and SJAE off: the air in-leakage builds up and the turbine trips on the vacuum limit",
  duration: 1800,
  sampleEvery: 1,
  initial: (() => {
    const synced = loadSnapshot("turbine-sync")
    return { ...synced, Condenser: { ...synced.Condenser, airMass: AirJustUnderTheLimit } }
  })(),
  actions: [
    { at: 0, action: { type: "SET_AIR_EXTRACTION_PUMP_ENABLED", payload: { isAirExtractionPumpEnabled: false } } },
    { at: 0, action: { type: "SET_SJAE_ENABLED", payload: { isSjaeEnabled: false } } },
  ],
  operator: (state, time) => holdLoop(state, time),
}
