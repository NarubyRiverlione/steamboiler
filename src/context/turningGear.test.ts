import { describe, expect, test } from "vitest"
import { CstOil, CstTurningGear } from "./const"
import { makeInitialState, powerPlantReducer } from "./PowerPlantReducer"
import PowerPlantState from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"

const plant = (headerPressure: number, turbine: Partial<PowerPlantState["Turbine"]> = {}): PowerPlantState => {
  const base: PowerPlantState = makeInitialState()
  return { ...base, Condenser: { ...base.Condenser, pressure: 50 }, Oil: { pumpRunning: true, headerPressure }, Turbine: { ...base.Turbine, ...turbine } }
}
const engage = (state: PowerPlantState, engaged = true): PowerPlantState =>
  powerPlantReducer(state, { type: "SET_TURNING_GEAR", payload: { engaged } })
const openValve = (state: PowerPlantState, step: number): PowerPlantState =>
  powerPlantReducer(state, { type: "ADJUST_STEAM_TURBINE_VALVE", payload: { turbineValvePosition: step } })

describe("turning gear (ADR 0051)", () => {
  test("the cold plant starts with the gear disengaged", () => {
    expect(makeInitialState().Turbine.turningGearEngaged).toBe(false)
  })

  describe("engage", () => {
    test("is refused below the oil permissive and allowed at it", () => {
      const low: PowerPlantState = plant(CstOil.PermissivePressure - 0.01)
      expect(engage(low)).toBe(low)
      expect(engage(plant(CstOil.PermissivePressure)).Turbine.turningGearEngaged).toBe(true)
    })

    test("is refused on a turning rotor and allowed at standstill speed", () => {
      const rolling: PowerPlantState = plant(CstOil.NominalPressure, { rpm: CstTurningGear.StandstillRpm + 1 })
      expect(engage(rolling)).toBe(rolling)
      expect(engage(plant(CstOil.NominalPressure, { rpm: CstTurningGear.StandstillRpm })).Turbine.turningGearEngaged).toBe(true)
    })

    test("disengaging is always allowed, with no oil", () => {
      expect(engage(plant(0, { turningGearEngaged: true }), false).Turbine.turningGearEngaged).toBe(false)
    })
  })

  describe("valve", () => {
    test("cannot be opened on a stopped rotor off the gear, can on the gear and above standstill speed", () => {
      const stopped: PowerPlantState = plant(CstOil.NominalPressure)
      expect(openValve(stopped, 0.1)).toBe(stopped)
      expect(openValve(engage(stopped), 0.1).Turbine.turbineValvePosition).toBeCloseTo(0.1)
      const turning: PowerPlantState = plant(CstOil.NominalPressure, { rpm: CstTurningGear.StandstillRpm + 1 })
      expect(openValve(turning, 0.1).Turbine.turbineValvePosition).toBeCloseTo(0.1)
    })

    test("the Ramp up PID does not open the valve on a stopped rotor off the gear", () => {
      const stopped: PowerPlantState = plant(CstOil.NominalPressure, { mainSteamValve: true, speedMode: "rampUp", runUpPoint: 500 })
      let state: PowerPlantState = stopped
      for (let i = 0; i < 30; i++) state = PowerPlantTick(state)
      expect(state.Turbine.turbineValvePosition).toBe(0)
    })
  })

  describe("rotor", () => {
    test("the stopped rotor is held at gear speed, not above", () => {
      let state: PowerPlantState = engage(plant(CstOil.NominalPressure))
      for (let i = 0; i < 10; i++) state = PowerPlantTick(state)
      expect(state.Turbine.rpm).toBeCloseTo(CstTurningGear.Rpm, 5)
    })

    test("a disengaged rotor stays at standstill", () => {
      let state: PowerPlantState = plant(CstOil.NominalPressure)
      for (let i = 0; i < 10; i++) state = PowerPlantTick(state)
      expect(state.Turbine.rpm).toBe(0)
    })

    test("the gear drops out when the oil falls below the permissive, not before", () => {
      const onGear: PowerPlantState = engage(plant(CstOil.NominalPressure))
      const held: PowerPlantState = PowerPlantTick({ ...onGear, Oil: { pumpRunning: true, headerPressure: CstOil.PermissivePressure + 0.05 } })
      expect(held.Turbine.turningGearEngaged).toBe(true)
      const low: PowerPlantState = PowerPlantTick({ ...onGear, Oil: { pumpRunning: false, headerPressure: CstOil.PermissivePressure - 0.01 } })
      expect(low.Turbine.turningGearEngaged).toBe(false)
    })

    test("after the disengage the stopped rotor reads 0 again", () => {
      let state: PowerPlantState = PowerPlantTick(engage(plant(CstOil.NominalPressure)))
      expect(state.Turbine.rpm).toBeCloseTo(CstTurningGear.Rpm, 5)
      state = engage(state, false)
      expect(state.Turbine.rpm).toBe(0)
      for (let i = 0; i < 100; i++) state = PowerPlantTick(state)
      expect(state.Turbine.rpm).toBe(0)
    })

    test("the gear throws itself out when the rotor passes the standstill speed, and the rotor keeps its speed", () => {
      const fast: PowerPlantState = plant(CstOil.NominalPressure, { turningGearEngaged: true, rpm: CstTurningGear.StandstillRpm + 5 })
      const after: PowerPlantState = PowerPlantTick(fast)
      expect(after.Turbine.turningGearEngaged).toBe(false)
      expect(after.Turbine.rpm).toBeGreaterThan(CstTurningGear.StandstillRpm)
      const slow: PowerPlantState = plant(CstOil.NominalPressure, { turningGearEngaged: true, rpm: CstTurningGear.StandstillRpm })
      expect(PowerPlantTick(slow).Turbine.turningGearEngaged).toBe(true)
    })

    test("a rotor above gear speed keeps its speed when the gear is disengaged", () => {
      const state: PowerPlantState = plant(CstOil.NominalPressure, { turningGearEngaged: true, rpm: CstTurningGear.StandstillRpm })
      expect(engage(state, false).Turbine.rpm).toBe(CstTurningGear.StandstillRpm)
    })
  })
})
