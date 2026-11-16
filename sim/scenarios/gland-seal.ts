import PowerPlantAction from "../../src/context/PowerPlantActions"
import PowerPlantState from "../../src/context/PowerPlantState"
import { airMassOf } from "../../src/utils/condenserCalculation"
import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import { holdLoop } from "./loop-operator"
import { withStoppedRotor } from "./steps"

export const OilOnAt = 0 // s: the lube oil pump starts, the header builds
export const GearOnAt = 20 // s: the header has built and the turning gear takes the stopped rotor
export const RefusedAt = 10 // s: the gland steam asked for with the rotor stopped and the gear out: refused
export const GlandOnAt = 2500 // s: the vacuum has stalled; the operator admits the gland steam
export const StartAirMbar = 100 // mbar of air at the start: under the SJAE suction limit, as after the hogging
const act = (at: number, action: PowerPlantAction) => ({ at, action })

// Edge (#147, ADR 0047): from the settled bypass loop (turbine at standstill) with the shell at 100 mbar of air, the air pump
// off and the glands unsealed. The SJAE alone cannot hold the design vacuum against the open-gland leak, so the vacuum stalls
// well above it. The gear goes on, the gland steam is admitted, the leak drops to the sealed rate and the vacuum draws down.
export const glandSeal: Scenario = {
  name: "gland-seal",
  description: "From the bypass-loop snapshot with the glands unsealed and the pump off: the SJAE alone stalls the vacuum, then the gland steam goes on and it draws down",
  duration: 5500,
  sampleEvery: 10,
  initial: (() => {
    const loop: PowerPlantState = loadSnapshot("bypass-loop")
    const stopped: PowerPlantState = withStoppedRotor(loop)
    return {
      ...stopped,
      Condenser: { ...stopped.Condenser, isAirExtractionPumpEnabled: false, airMass: airMassOf(StartAirMbar, 25) },
    }
  })(),
  actions: [
    act(OilOnAt, { type: "SET_OIL_PUMP", payload: { pumpRunning: true } }),
    act(RefusedAt, { type: "SET_GLAND_STEAM", payload: { on: true } }), // the rotor is stopped, the gear out: refused
    act(GearOnAt, { type: "SET_TURNING_GEAR", payload: { engaged: true } }),
    act(GlandOnAt, { type: "SET_GLAND_STEAM", payload: { on: true } }),
  ],
  operator: (state: PowerPlantState, time: number): PowerPlantAction[] => holdLoop(state, time),
}
