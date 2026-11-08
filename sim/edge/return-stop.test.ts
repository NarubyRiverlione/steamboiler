import { describe, expect, test } from "vitest"
import { CstSimulation } from "../../src/context/const"
import { runScenario } from "../scenario"
import { ReturnStopAt, returnStop } from "../scenarios/return-stop"

const { CstBoiler } = CstSimulation

describe("return-stop", () => {
  const samples = runScenario(returnStop)
  const before = samples.filter((s) => s.time < ReturnStopAt)
  const after = samples.filter((s) => s.time > ReturnStopAt + 1)
  // The burner trips on low-low level some time after the stop, as the drum loses its feed; judge the firing part
  const firingAfter = after.filter((s) => s.state.Boiler.gasFlow > 0)
  const peak = (list: typeof samples): number => Math.max(...list.map((s) => s.state.Boiler.pressure))

  test("runs at full gas, with the economizer heating the Return before the stop", () => {
    const flowing = before[before.length - 1].state
    expect(flowing.Boiler.gasFlow).toBe(CstBoiler.MaxGasFlow)
    expect(flowing.Condenser.returnRate).toBeGreaterThan(0)
    expect(flowing.Boiler.returnTemperatureOut).toBeGreaterThan(flowing.Condenser.hotwellTemperature + 30)
  })

  test("the Return stops, the economizer recovers nothing and the efficiency falls to about 79% in one tick", () => {
    for (const { state } of after) {
      expect(state.Condenser.returnRate).toBe(0)
      expect(state.Boiler.returnTemperatureOut).toBe(state.Condenser.hotwellTemperature)
    }
    expect(firingAfter.length).toBeGreaterThan(0)
    for (const { state } of firingAfter) expect(state.Boiler.stackTemperature).toBeGreaterThan(400)
    const settledEfficiency = firingAfter[firingAfter.length - 1].state.Boiler.boilerEfficiency
    expect(settledEfficiency).toBeGreaterThan(0.75)
    expect(settledEfficiency).toBeLessThan(0.85)
    const stopped = samples.find((s) => s.time === ReturnStopAt + 1)
    expect(stopped?.state.Boiler.boilerEfficiency).toBeLessThan(0.8)
  })

  test("the pressure stays controlled: the relief valve holds it, and it never goes higher after the stop", () => {
    // one tick's rise past the opening pressure, at most
    expect(peak(samples)).toBeLessThanOrEqual(CstBoiler.ReliefOpenPressure + 1)
    expect(peak(samples)).toBeLessThan(CstBoiler.DesignPressure)
    expect(peak(after)).toBeLessThanOrEqual(CstBoiler.ReliefOpenPressure + 1)
    expect(before.length).toBeGreaterThan(0)
  })

  test("the pressure rises after the stop, because the Return no longer costs heat, and stays under design", () => {
    // A Return of cold water held the pressure down; without it all the heat goes into steam (ADR 0030)
    const justBefore = before[before.length - 1].state.Boiler.pressure
    expect(peak(firingAfter)).toBeGreaterThan(justBefore + 10)
    expect(peak(firingAfter)).toBeLessThan(CstBoiler.DesignPressure)
    expect(firingAfter.some((s) => s.state.Boiler.reliefValveOpen)).toBe(true)
  })
})
