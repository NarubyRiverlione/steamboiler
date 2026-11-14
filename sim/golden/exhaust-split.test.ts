import { describe, expect, test } from "vitest"
import { finalState, Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import PowerPlantState from "../../src/context/PowerPlantState"
import { CstSimulation } from "../../src/context/const"

// Goal check of #81: from the settled bypass loop, the same 15% through the bypass or through the turbine valve.
// With the rotor at sync speed the shaft takes its full work and the exhaust is about a third moisture, so the two must
// no longer give the same condenser pressure (ADR 0028). At standstill the shaft takes none and the exhaust is like bypass steam
// (ADR 0032), so the rotor is set to sync speed here; the 3 s run is short enough for it to stay near it.
const settled: PowerPlantState = loadSnapshot("bypass-loop")
const { SyncRPM } = CstSimulation.CstTurbine
// 15% passes about 30 kg/s (50 kg/s at 25%, more than the unloaded rotor can take at 540 °C before it trips on overspeed): the tap pressure (about 1.3 bar) is under the deaerator setpoint, so nothing is extracted (#119)
const Opening = 0.15

const after3s = (bypassValvePosition: number, turbineValvePosition: number, rpm: number): PowerPlantState => {
  const scenario: Scenario = {
    name: "exhaust-split",
    description: "Same flow through the bypass or the turbine valve",
    duration: 3,
    sampleEvery: 1,
    initial: { ...settled, Turbine: { ...settled.Turbine, bypassValvePosition, turbineValvePosition, rpm } },
    actions: [],
  }
  return finalState(scenario)
}

describe("exhaust split", () => {
  const onBypass: PowerPlantState = after3s(Opening, 0, SyncRPM)
  const onTurbine: PowerPlantState = after3s(0, Opening, SyncRPM)
  const atStandstill: PowerPlantState = after3s(0, Opening, 0)

  test("both paths bring the same steam flow to the condenser: below the deaerator setpoint the tap gives nothing, the heater and the tap take none (ADR 0031, ADR 0036)", () => {
    for (const state of [onBypass, onTurbine]) {
      expect(state.Heater.extractionFlow).toBe(0)
      expect(state.Deaerator.extractionFlow).toBe(0)
    }
    expect(onTurbine.Condenser.intakeFlowRate).toBeCloseTo(onBypass.Condenser.intakeFlowRate, 0)
  })

  test("turbine exhaust, wetter than bypass steam and less of it, gives a lower condenser pressure", () => {
    expect(onTurbine.Condenser.pressure).toBeLessThan(onBypass.Condenser.pressure)
  })

  test("with its moisture counted, all of the intake reaches the hotwell on either path, none is vented", () => {
    for (const state of [onBypass, onTurbine]) {
      expect(state.Condenser.condensationRate).toBeCloseTo(state.Condenser.intakeFlowRate, 1)
      expect(state.Condenser.ventedTotal).toBeCloseTo(0, 3)
    }
  })

  test("at standstill the exhaust carries almost no moisture: more heat for the cooling water than at sync speed", () => {
    expect(atStandstill.Condenser.pressure).toBeGreaterThan(onTurbine.Condenser.pressure)
  })
})
