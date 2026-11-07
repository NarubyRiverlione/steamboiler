import { describe, expect, test } from "vitest"
import { CstFlueGas, CstPhysics, CstSimulation } from "../context/const"
import {
  BoilerStageSurface,
  EconomizerSurface,
  bisectDuty,
  calculateFlueGasHeatBalance,
  flueGasEnthalpy,
  flueGasTemperature,
} from "./flueGas"

const { MaxGasFlow } = CstSimulation.CstBoiler
const { AmbientTemperature } = CstPhysics
const FullFuelHeat = (MaxGasFlow / 1000) * CstPhysics.GasEnergyDensity // kW
const DesignWater = CstFlueGas.DesignWaterTemperature

const designReturn = (gasShare = 1): ReturnType<typeof calculateFlueGasHeatBalance> =>
  calculateFlueGasHeatBalance(
    MaxGasFlow * gasShare,
    DesignWater,
    CstFlueGas.EconomizerDesignReturn * gasShare,
    CstFlueGas.EconomizerDesignReturnTemperature,
  )

describe("flue gas enthalpy", () => {
  // Research note: h(T) in kJ/kg from the Ganapathy table A7b quadratic, absolute values less the 20 °C one
  test.each([
    [160, 157.7],
    [350, 380.8],
    [450, 502.5],
    [500, 564.5],
  ])("%i °C holds %f kJ/kg above ambient", (temperature, enthalpy) => {
    expect(flueGasEnthalpy(temperature)).toBeCloseTo(enthalpy, 0)
  })

  test("is zero at ambient and the temperature function inverts it", () => {
    expect(flueGasEnthalpy(AmbientTemperature)).toBeCloseTo(0, 9)
    for (const temperature of [20, 90, 160, 450, 1775]) {
      expect(flueGasTemperature(flueGasEnthalpy(temperature))).toBeCloseTo(temperature, 6)
    }
  })

  test("the combustion temperature holds the heat the fuel gives, within 5%", () => {
    const heatOfFlueGas = CstFlueGas.MassPerGasVolume * (MaxGasFlow / 1000) * flueGasEnthalpy(CstFlueGas.CombustionTemperature)
    expect(heatOfFlueGas / FullFuelHeat).toBeGreaterThan(0.95)
    expect(heatOfFlueGas / FullFuelHeat).toBeLessThan(1.05)
  })
})

describe("sizing", () => {
  test("the economizer surface is about 290 kW/K", () => {
    expect(EconomizerSurface).toBeGreaterThan(280)
    expect(EconomizerSurface).toBeLessThan(300)
  })

  test("the boiler stage is sized so flue gas leaves 100 K above the water at full gas and 350 °C", () => {
    const noReturn = calculateFlueGasHeatBalance(MaxGasFlow, DesignWater, 0, CstFlueGas.EconomizerDesignReturnTemperature)
    expect(noReturn.boilerExitTemperature).toBeCloseTo(DesignWater + CstFlueGas.BoilerApproachAtDesign, 3)
    expect(BoilerStageSurface).toBeGreaterThan(0)
  })
})

describe("full gas at 350 °C with the design Return", () => {
  const balance = designReturn()

  test("the stack is 160 °C, the efficiency about 93.4% and the Return leaves at about 122 °C", () => {
    expect(balance.stackTemperature).toBeCloseTo(CstFlueGas.EconomizerDesignStack, 3)
    expect(balance.efficiency).toBeCloseTo(0.934, 3)
    expect(balance.returnTemperatureOut).toBeGreaterThan(120)
    expect(balance.returnTemperatureOut).toBeLessThan(124)
  })

  test("about 392 MW goes into the water and the economizer gives 61 MW of it", () => {
    expect(balance.heatIntoWater / 1000).toBeCloseTo(392, 0)
    expect(balance.economizerHeat / 1000).toBeCloseTo(61, 0)
  })
})

describe("no Return", () => {
  test("full gas at 350 °C: efficiency about 79%, nothing recovered, the stack is the boiler exit", () => {
    const balance = calculateFlueGasHeatBalance(MaxGasFlow, DesignWater, 0, 37)
    expect(balance.efficiency).toBeCloseTo(0.79, 2)
    expect(balance.economizerHeat).toBe(0)
    expect(balance.stackTemperature).toBeCloseTo(balance.boilerExitTemperature, 6)
    expect(balance.returnTemperatureOut).toBe(37)
  })

  test("a colder boiler gives a higher efficiency", () => {
    const efficiencies: number[] = [350, 250, 150, 60].map(
      (temperature) => calculateFlueGasHeatBalance(MaxGasFlow, temperature, 0, 37).efficiency,
    )
    for (let i = 1; i < efficiencies.length; i++) expect(efficiencies[i]).toBeGreaterThan(efficiencies[i - 1])
  })

  test("never exceeds the 84% theoretical limit at 350 °C: flue gas cannot leave cooler than the water", () => {
    expect(calculateFlueGasHeatBalance(MaxGasFlow, DesignWater, 0, 37).efficiency).toBeLessThan(0.84)
  })
})

describe("part load at 350 °C", () => {
  // Gap between the flue gas leaving the boiler stage and the boiler water
  const gap = (share: number): number =>
    calculateFlueGasHeatBalance(MaxGasFlow * share, DesignWater, 0, 37).boilerExitTemperature - DesignWater

  test("firing lower narrows the gap: 100 K at full gas, about 20 K at 25%", () => {
    expect(gap(1)).toBeCloseTo(100, 3)
    expect(gap(0.75)).toBeLessThan(gap(1))
    expect(gap(0.5)).toBeLessThan(gap(0.75))
    expect(gap(0.25)).toBeLessThan(gap(0.5))
    expect(gap(0.25)).toBeGreaterThan(15)
    expect(gap(0.25)).toBeLessThan(25)
  })

  test("with the Return scaled to the gas the stack falls and the efficiency rises as the firing falls", () => {
    const shares: number[] = [1, 0.75, 0.5, 0.25]
    const stacks: number[] = shares.map((share) => designReturn(share).stackTemperature)
    const efficiencies: number[] = shares.map((share) => designReturn(share).efficiency)
    for (let i = 1; i < shares.length; i++) {
      expect(stacks[i]).toBeLessThan(stacks[i - 1])
      expect(efficiencies[i]).toBeGreaterThan(efficiencies[i - 1])
    }
  })
})

describe("little Return at full gas", () => {
  test.each([120, 80, 60, 36, 20, 10, 5, 1])("%f kg/s: the Return stays 28 K under saturation", (flow) => {
    const balance = calculateFlueGasHeatBalance(MaxGasFlow, DesignWater, flow, 37)
    expect(balance.returnTemperatureOut).toBeLessThanOrEqual(DesignWater - CstFlueGas.ReturnSaturationMargin + 1e-6)
  })

  test("the stack gets hotter and the efficiency lower as the Return shrinks", () => {
    const flows: number[] = [171, 120, 60, 36, 20, 5]
    const balances = flows.map((flow) => calculateFlueGasHeatBalance(MaxGasFlow, DesignWater, flow, 37))
    for (let i = 1; i < flows.length; i++) {
      expect(balances[i].stackTemperature).toBeGreaterThan(balances[i - 1].stackTemperature)
      expect(balances[i].efficiency).toBeLessThan(balances[i - 1].efficiency)
    }
  })

  test("the cap binds below about 35 kg/s: the Return leaves at exactly 28 K under saturation", () => {
    expect(calculateFlueGasHeatBalance(MaxGasFlow, DesignWater, 20, 37).returnTemperatureOut).toBeCloseTo(322, 3)
  })
})

describe("the heat balance closes", () => {
  const gases: number[] = [0, 100, 2000, 6000, 12000]
  const boilers: number[] = [20, 100, 250, 350, 356]
  const returns: number[] = [0, 1, 24, 171, 300]
  const hotwells: number[] = [10, 37, 80]

  test("fuel heat = heat into the water + heat up the stack, and every value is finite", () => {
    for (const gas of gases)
      for (const boiler of boilers)
        for (const flow of returns)
          for (const hotwell of hotwells) {
            const balance = calculateFlueGasHeatBalance(gas, boiler, flow, hotwell)
            expect(balance.fuelHeat).toBeCloseTo(balance.heatIntoWater + balance.stackHeat, 6)
            for (const value of Object.values(balance)) expect(Number.isFinite(value)).toBe(true)
            expect(balance.efficiency).toBeGreaterThanOrEqual(0)
            expect(balance.efficiency).toBeLessThanOrEqual(1)
            expect(balance.stackTemperature).toBeGreaterThanOrEqual(AmbientTemperature - 1e-9)
          }
  })

  test("no gas puts no heat in and sends none up the stack", () => {
    const balance = calculateFlueGasHeatBalance(0, 350, 171, 37)
    expect(balance.heatIntoWater).toBe(0)
    expect(balance.stackHeat).toBe(0)
    expect(balance.efficiency).toBe(0)
    expect(balance.returnTemperatureOut).toBe(37)
  })
})

describe("relief valve worst case", () => {
  test("no state of the plant at the opening pressure puts more heat into the water than the worst case", () => {
    const openingTemperature = 356.2 // °C, saturation at ReliefOpenPressure 178 bar
    const worst = calculateFlueGasHeatBalance(MaxGasFlow, openingTemperature, 300 / 1.0018, CstSimulation.CstCondenser.RecirculationPump_IntakeTemperature).heatIntoWater
    for (const flow of [0, 10, 50, 171, 250, 299])
      for (const hotwell of [10, 20, 40, 60])
        expect(
          calculateFlueGasHeatBalance(MaxGasFlow, openingTemperature, flow, hotwell).heatIntoWater,
        ).toBeLessThanOrEqual(worst + 1e-6)
  })
})

describe("bisectDuty", () => {
  test("finds the root of a rising shortfall inside the ceiling", () => {
    expect(bisectDuty((duty) => duty - 37.5, 100)).toBeCloseTo(37.5, 9)
  })

  test("converges on the ceiling end when the shortfall never turns positive", () => {
    expect(bisectDuty((duty) => duty - 500, 100)).toBeCloseTo(100, 9)
  })
})
