import { describe, expect, test } from "vitest"
import { CstGlandSteam, CstSimulation, CstTurningGear } from "./const"
import { makeInitialState, powerPlantReducer } from "./PowerPlantReducer"
import PowerPlantState, { TurbineState } from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"
import { glandSteamMass, GlandSteamTick } from "./Turbine/GlandSteam"

const plant = (turbine: Partial<TurbineState> = {}): PowerPlantState => {
  const state: PowerPlantState = makeInitialState()
  return { ...state, Turbine: { ...state.Turbine, ...turbine } }
}
const switchTo = (state: PowerPlantState, on: boolean): PowerPlantState => powerPlantReducer(state, { type: "SET_GLAND_STEAM", payload: { on } })

describe("gland seal steam (ADR 0047)", () => {
  test("the cold state starts with the gland steam off", () => {
    expect(makeInitialState().Turbine.glandSteamOn).toBe(false)
  })

  describe("the switch", () => {
    test("is refused silently while the rotor is stopped with the gear out", () => {
      expect(switchTo(plant(), true).Turbine.glandSteamOn).toBe(false)
      expect(switchTo(plant({ rpm: CstTurningGear.StandstillRpm }), true).Turbine.glandSteamOn).toBe(false)
    })

    test("is admitted with the gear engaged", () => {
      expect(switchTo(plant({ rpm: CstTurningGear.StandstillRpm + 1 }), true).Turbine.glandSteamOn).toBe(true)
    })

    test("is admitted with the rotor above the standstill threshold, gear out", () => {
      expect(switchTo(plant({ rpm: CstTurningGear.StandstillRpm + 1 }), true).Turbine.glandSteamOn).toBe(true)
    })

    test("shuts off at any time", () => {
      expect(switchTo(plant({ glandSteamOn: true }), false).Turbine.glandSteamOn).toBe(false)
    })
  })

  describe("losing the rotor", () => {
    test("shuts the steam off when the rotor is not turning, with the main steam valve open or shut", () => {
      expect(GlandSteamTick(plant({ glandSteamOn: true, mainSteamValve: true }).Turbine).glandSteamOn).toBe(false)
      expect(GlandSteamTick(plant({ glandSteamOn: true }).Turbine).glandSteamOn).toBe(false)
    })

    test("keeps the steam while the gear or the speed turns the rotor", () => {
      expect(GlandSteamTick(plant({ glandSteamOn: true, turningGearEngaged: true }).Turbine).glandSteamOn).toBe(true)
      expect(GlandSteamTick(plant({ glandSteamOn: true, rpm: 500 }).Turbine).glandSteamOn).toBe(true)
    })

    test("the plant tick shuts it off and unseals the glands", () => {
      const after: PowerPlantState = PowerPlantTick(plant({ glandSteamOn: true }))
      expect(after.Turbine.glandSteamOn).toBe(false)
    })
  })

  describe("the flow", () => {
    test("is a fixed flow while on and nothing while off", () => {
      expect(glandSteamMass(plant({ glandSteamOn: true }).Turbine)).toBeCloseTo(CstGlandSteam.Flow * CstSimulation.DeltaTime, 12)
      expect(glandSteamMass(plant().Turbine)).toBe(0)
    })

    test("leaves the boiler steam and arrives in the hotwell: the water of the loop is conserved", () => {
      const start: PowerPlantState = plant({ glandSteamOn: true, rpm: CstTurningGear.StandstillRpm + 1 })
      const off: PowerPlantState = PowerPlantTick({ ...start, Turbine: { ...start.Turbine, glandSteamOn: false } })
      const on: PowerPlantState = PowerPlantTick(start)
      const water = (s: PowerPlantState): number => s.Boiler.waterMass + s.Boiler.steamMass + s.Condenser.hotwellWaterMass + s.Deaerator.waterMass
      expect(water(on)).toBeCloseTo(water(off), 6)
      expect(on.Condenser.hotwellWaterMass - off.Condenser.hotwellWaterMass).toBeCloseTo(glandSteamMass(start.Turbine), 6)
    })
  })

  test("the air in-leakage follows the seal through the plant tick", () => {
    const base: PowerPlantState = plant({ rpm: CstTurningGear.StandstillRpm + 1 })
    const shell = (glandSteamOn: boolean): PowerPlantState => ({
      ...base,
      Turbine: { ...base.Turbine, glandSteamOn },
      Condenser: { ...base.Condenser, pressure: 500, airMass: 1 },
    })
    expect(PowerPlantTick(shell(false)).Condenser.airMass).toBeGreaterThan(PowerPlantTick(shell(true)).Condenser.airMass)
  })
})
