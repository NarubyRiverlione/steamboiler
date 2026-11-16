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

    test("is refused above gear speed and with the valve open", () => {
      const rolling: PowerPlantState = plant(CstOil.NominalPressure, { rpm: CstTurningGear.Rpm + 1 })
      expect(engage(rolling)).toBe(rolling)
      const open: PowerPlantState = plant(CstOil.NominalPressure, { turbineValvePosition: 0.1 })
      expect(engage(open)).toBe(open)
    })

    test("disengaging is always allowed, with no oil", () => {
      expect(engage(plant(0, { turningGearEngaged: true }), false).Turbine.turningGearEngaged).toBe(false)
    })
  })

  describe("valve", () => {
    test("cannot be opened while the gear is engaged, and can once disengaged", () => {
      const onGear: PowerPlantState = engage(plant(CstOil.NominalPressure))
      expect(openValve(onGear, 0.1)).toBe(onGear)
      expect(openValve(engage(onGear, false), 0.1).Turbine.turbineValvePosition).toBeCloseTo(0.1)
    })

    test("the Ramp up PID does not open the valve on gear", () => {
      const onGear: PowerPlantState = plant(CstOil.NominalPressure, { turningGearEngaged: true, mainSteamValve: true, speedMode: "rampUp", runUpPoint: 500 })
      let state: PowerPlantState = onGear
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

    test("the gear drops out when the oil falls below the trip limit", () => {
      let state: PowerPlantState = engage(plant(CstOil.NominalPressure))
      state = { ...state, Oil: { pumpRunning: false, headerPressure: CstOil.TripPressure - 0.01 } }
      state = PowerPlantTick(state)
      expect(state.Turbine.turningGearEngaged).toBe(false)
    })
  })
})
