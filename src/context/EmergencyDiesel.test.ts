import { describe, expect, test } from "vitest"
import { CstEmergencyDiesel, CstSimulation } from "./const"
import { isReadyToClose } from "./EmergencyDiesel"
import { makeInitialState, powerPlantReducer } from "./PowerPlantReducer"
import PowerPlantState, { EmySelector } from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"
import { isSafetyBusLive, isVitalBusLive } from "./SafetyBus"

const base: PowerPlantState = makeInitialState()
const ticks = (state: PowerPlantState, seconds: number): PowerPlantState => {
  let s: PowerPlantState = state
  for (let i = 0; i < Math.round(seconds / CstSimulation.DeltaTime); i++) s = PowerPlantTick(s)
  return s
}
const gridLost = (selector: EmySelector = "AUTO"): PowerPlantState => ({ ...base, gridSupplyBreaker: false, emySelector: selector })
const select = (state: PowerPlantState, selector: EmySelector): PowerPlantState => powerPlantReducer(state, { type: "SET_EMY_SELECTOR", payload: { selector } })
const { StartTime, WarmUpTime } = CstEmergencyDiesel

describe("the EMY diesel (#198)", () => {
  test("the default: AUTO, stopped, breaker open", () => {
    expect(base.emySelector).toBe("AUTO")
    expect(base.EmergencyDiesel.status).toBe("stopped")
    expect(base.emyBreaker).toBe(false)
  })

  describe("the selector", () => {
    test("AUTO does not start on a live Vital bus", () => {
      expect(ticks(base, 20).EmergencyDiesel.status).toBe("stopped")
    })
    test("AUTO starts on a dead Vital bus and runs after the start time", () => {
      const s: PowerPlantState = ticks(gridLost(), 1)
      expect(s.EmergencyDiesel.status).toBe("starting")
      expect(ticks(gridLost(), StartTime + 1).EmergencyDiesel.status).toBe("running")
    })
    test("ON starts regardless of the Vital bus", () => {
      expect(ticks({ ...base, emySelector: "ON" }, StartTime + 1).EmergencyDiesel.status).toBe("running")
    })
    test("OFF never starts, even on a dead Vital bus", () => {
      expect(ticks(gridLost("OFF"), 30).EmergencyDiesel.status).toBe("stopped")
    })
    test("OFF stops a running set; back to AUTO on a live Vital bus leaves it stopped", () => {
      const running: PowerPlantState = ticks(gridLost(), StartTime + 1)
      const off: PowerPlantState = ticks(select(running, "OFF"), 1)
      expect(off.EmergencyDiesel.status).toBe("stopped")
      expect(off.emyBreaker).toBe(false)
    })
    test("AUTO keeps running after the hand-back to the Auxiliary bus", () => {
      const onEmy: PowerPlantState = ticks(gridLost(), StartTime + 1)
      const back: PowerPlantState = powerPlantReducer({ ...onEmy, gridSupplyBreaker: true }, { type: "CLOSE_VITAL_FEED_BREAKER" })
      expect(ticks(back, 30).EmergencyDiesel.status).toBe("running")
    })
  })

  describe("the EMY breaker", () => {
    test("closes on a dead Vital bus once the diesel runs, not before", () => {
      expect(ticks(gridLost(), StartTime - 1).emyBreaker).toBe(false)
      const s: PowerPlantState = ticks(gridLost(), StartTime + 1)
      expect(s.emyBreaker).toBe(true)
      expect(isVitalBusLive(s)).toBe(true)
    })
    test("never closes onto a live Vital bus (selector ON on a live Aux)", () => {
      expect(ticks({ ...base, emySelector: "ON" }, 30).emyBreaker).toBe(false)
    })
    test("closing Aux→Vital opens it on the same tick", () => {
      const onEmy: PowerPlantState = ticks(gridLost(), StartTime + 1)
      const closed: PowerPlantState = powerPlantReducer({ ...onEmy, gridSupplyBreaker: true }, { type: "CLOSE_VITAL_FEED_BREAKER" })
      expect(closed.emyBreaker).toBe(false)
      expect(closed.vitalFeedBreaker).toBe(true)
    })
  })

  describe("the warm-up and Ready to close", () => {
    test("Ready to close only after the warm-up on the EMY source", () => {
      expect(isReadyToClose(ticks(gridLost(), StartTime + WarmUpTime - 5))).toBe(false)
      expect(isReadyToClose(ticks(gridLost(), StartTime + WarmUpTime + 1))).toBe(true)
    })
    test("always ready with the Auxiliary bus as source", () => {
      expect(isReadyToClose(base)).toBe(true)
    })
    test("Vital→Safety does nothing before the warm-up on the EMY source, closes after", () => {
      const early: PowerPlantState = ticks(gridLost(), StartTime + 5)
      expect(early.safetyFeedBreaker).toBe(false)
      expect(powerPlantReducer(early, { type: "CLOSE_SAFETY_FEED_BREAKER" }).safetyFeedBreaker).toBe(false)
      const warm: PowerPlantState = ticks(gridLost(), StartTime + WarmUpTime + 1)
      expect(powerPlantReducer(warm, { type: "CLOSE_SAFETY_FEED_BREAKER" }).safetyFeedBreaker).toBe(true)
    })
    test("Vital→Safety closes at once on the Auxiliary source", () => {
      const open: PowerPlantState = { ...base, safetyFeedBreaker: false }
      expect(powerPlantReducer(open, { type: "CLOSE_SAFETY_FEED_BREAKER" }).safetyFeedBreaker).toBe(true)
    })
  })

  describe("the changeover test", () => {
    test("opening Aux→Vital with the selector on ON: the EMY breaker closes, the Safety bus never goes dead", () => {
      let s: PowerPlantState = ticks({ ...base, emySelector: "ON" }, StartTime + 1)
      s = powerPlantReducer(s, { type: "OPEN_VITAL_FEED_BREAKER" })
      expect(s.emyBreaker).toBe(true)
      expect(isVitalBusLive(s)).toBe(true)
      for (let i = 0; i < 100; i++) {
        expect(isSafetyBusLive(s)).toBe(true)
        s = PowerPlantTick(s)
      }
    })
    test("opening Aux→Vital before the diesel runs: the battery bridges the Safety bus", () => {
      const s: PowerPlantState = powerPlantReducer({ ...base, emySelector: "ON" }, { type: "OPEN_VITAL_FEED_BREAKER" })
      expect(isVitalBusLive(s)).toBe(false)
      expect(isSafetyBusLive(s)).toBe(true)
    })
  })
})
