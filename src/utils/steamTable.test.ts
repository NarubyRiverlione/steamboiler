import { describe, expect, test } from "vitest"
import { CstSimulation } from "../context/const"
import { steamTable } from "./steamData"
import {
  getBoilingPoint,
  getExhaustEnthalpy,
  getExhaustQuality,
  getIsentropicEnthalpyDrop,
  getLatentHeat,
  getLiquidEnthalpy,
  getLiquidTemperature,
  getSaturatedSteamDensity,
  getSaturationEnthalpies,
  getSteamData,
  getSteamTemperature,
  getInletEnthalpy,
  getInletIsentropicDrop,
  getSteamEnthalpy,
  getSteamEntropy,
  getSuperheatedIsentropicDrop,
  getWaterSpecificHeat,
  getWaterSpecificVolume,
} from "./steamTable"

const CriticalTemperature = 373.946 // °C, IAPWS-IF97
const CriticalPressure = 220.64 // bar, IAPWS-IF97

// IAPWS-IF97 saturation values: [°C, bar, latent heat kJ/kg, liquid enthalpy kJ/kg]
const If97: number[][] = [
  [100, 1.01418, 2256.5, 419.1],
  [150, 4.761, 2113.7, 632.3],
  [200, 15.5467, 1939.7, 852.4],
  [250, 39.7594, 1715.3, 1085.7],
  [300, 85.8771, 1404.8, 1344.8],
  [350, 165.2916, 892.7, 1670.9],
]

describe("steam table against IAPWS-IF97", () => {
  test.each(If97)(
    "%i °C: pressure, latent heat and enthalpy are within 1%",
    (temperature, pressure, latent, enthalpy) => {
      const data = getSteamData(temperature)
      expect(data.pressure).toBeCloseTo(pressure, 0)
      expect(Math.abs(data.pressure / pressure - 1)).toBeLessThan(0.01)
      expect(Math.abs(data.latentHeat / latent - 1)).toBeLessThan(0.01)
      expect(Math.abs(data.enthalpy / enthalpy - 1)).toBeLessThan(0.01)
    },
  )

  test("boiling point at design pressure is within 1 °C of the design temperature", () => {
    expect(
      Math.abs(
        getBoilingPoint(CstSimulation.CstBoiler.DesignPressure) - CstSimulation.CstBoiler.DesignTemperature,
      ),
    ).toBeLessThan(1)
  })
})

describe("steam table shape", () => {
  test("pressure, enthalpy, specific volume rise and latent heat falls with temperature", () => {
    for (let i = 1; i < steamTable.length; i++) {
      expect(steamTable[i].pressure).toBeGreaterThan(steamTable[i - 1].pressure)
      expect(steamTable[i].enthalpy).toBeGreaterThan(steamTable[i - 1].enthalpy)
      expect(steamTable[i].specificVolume).toBeGreaterThanOrEqual(steamTable[i - 1].specificVolume)
      expect(steamTable[i].latentHeat).toBeLessThan(steamTable[i - 1].latentHeat)
    }
  })

  test("no row lies beyond the critical point", () => {
    const last = steamTable[steamTable.length - 1]
    expect(last.temperature).toBeCloseTo(CriticalTemperature, 3)
    expect(last.pressure).toBeCloseTo(CriticalPressure, 2)
    expect(last.latentHeat).toBe(0)
    expect(
      steamTable.every((row) => row.temperature <= CriticalTemperature && row.pressure <= CriticalPressure),
    ).toBe(true)
  })
})

describe("boiling point below the table", () => {
  test("follows the Antoine equation under the lowest table pressure", () => {
    expect(getBoilingPoint(0.1)).toBeCloseTo(45.8, 0)
  })

  test("returns 0 °C when the pressure is under 1 mmHg", () => {
    expect(getBoilingPoint(0.001)).toBe(0)
  })
})

describe("exact table rows", () => {
  test("lookup at a table temperature and pressure returns that row", () => {
    const row = steamTable[10]
    expect(getSteamData(row.temperature).pressure).toBeCloseTo(row.pressure, 9)
    expect(getBoilingPoint(row.pressure)).toBeCloseTo(row.temperature, 9)
  })
})

describe("clamping at the critical point", () => {
  test("temperature above the critical point returns the critical-point values", () => {
    const data = getSteamData(500)
    expect(data.temperature).toBeCloseTo(CriticalTemperature, 3)
    expect(data.pressure).toBeCloseTo(CriticalPressure, 2)
    expect(getLatentHeat(500)).toBe(0)
    expect(Number.isFinite(getWaterSpecificHeat(500))).toBe(true)
  })

  test("pressure above the critical pressure returns the critical temperature, without throwing", () => {
    expect(getBoilingPoint(300)).toBeCloseTo(CriticalTemperature, 3)
    expect(getBoilingPoint(CriticalPressure)).toBeCloseTo(CriticalTemperature, 3)
  })

  test("boiling point rises monotonically up to the clamp", () => {
    let previous = getBoilingPoint(1)
    for (let pressure = 5; pressure <= 230; pressure += 5) {
      const boiling = getBoilingPoint(pressure)
      expect(boiling).toBeGreaterThanOrEqual(previous)
      previous = boiling
    }
  })
})

// IAPWS-IF97 saturated-liquid specific volume, litres per kg: [°C, L/kg]
const LiquidVolumes: number[][] = [
  [20, 1.0018],
  [40, 1.0079],
  [60, 1.0171],
  [80, 1.029],
  [100, 1.0435],
  [200, 1.1565],
  [300, 1.4036],
]

describe("getWaterSpecificVolume", () => {
  test.each(LiquidVolumes)("%i °C: within 0.2% of IF97", (temperature, litresPerKg) => {
    expect(Math.abs(getWaterSpecificVolume(temperature) / litresPerKg - 1)).toBeLessThan(0.002)
  })

  test("rises smoothly across 80 °C, with no density jump", () => {
    const step: number = getWaterSpecificVolume(80.5) - getWaterSpecificVolume(79.5)
    expect(step).toBeGreaterThan(0)
    expect(step).toBeLessThan(0.0012) // the true slope is about 0.0008 L/kg per K; the old jump was 0.03
  })

  test("below 20 °C holds the 20 °C value", () => {
    expect(getWaterSpecificVolume(5)).toBe(getWaterSpecificVolume(20))
  })

  test("above the critical point clamps to the critical value", () => {
    expect(getWaterSpecificVolume(400)).toBe(3.106) // critical liquid volume, L/kg
    expect(getWaterSpecificVolume(CriticalTemperature)).toBe(3.106)
  })

  test("an exact curve row returns its own value", () => {
    expect(getWaterSpecificVolume(25)).toBe(1.003)
    expect(getWaterSpecificVolume(80)).toBe(1.029)
  })

  test("halfway between curve rows interpolates linearly", () => {
    const [t1, v1] = [80, 1.029]
    const [t2, v2] = [85, 1.032] // 85 °C row of the steam table, L/kg
    const expected = (v1 + v2) / 2
    expect(getWaterSpecificVolume((t1 + t2) / 2)).toBeCloseTo(expected, 6)
  })

  test("rises monotonically over the whole range", () => {
    let previous = getWaterSpecificVolume(0)
    for (let temperature = 1; temperature <= 380; temperature += 1) {
      const current = getWaterSpecificVolume(temperature)
      expect(current).toBeGreaterThanOrEqual(previous)
      previous = current
    }
  })
})

// IAPWS-IF97 isentropic drop of saturated steam [boiler bar, exhaust bar, kJ/kg]
const IsentropicDrops: number[][] = [
  [10, 0.1, 692.05],
  [40, 0.1, 880.18],
  [40, 0.3, 757.39],
  [10, 0.05, 769.93],
]

describe("getIsentropicEnthalpyDrop", () => {
  test.each(IsentropicDrops)(
    "%f bar to %f bar matches IF97 (%f kJ/kg) within 0.5%%",
    (boiler, exhaust, expected) => {
      expect(Math.abs(getIsentropicEnthalpyDrop(boiler, exhaust) - expected)).toBeLessThan(expected * 0.005)
    },
  )

  test("a worse vacuum or a lower boiler pressure gives a smaller drop", () => {
    expect(getIsentropicEnthalpyDrop(40, 0.3)).toBeLessThan(getIsentropicEnthalpyDrop(40, 0.1))
    expect(getIsentropicEnthalpyDrop(10, 0.1)).toBeLessThan(getIsentropicEnthalpyDrop(40, 0.1))
  })

  test("is zero or negative with the exhaust at or above the boiler pressure", () => {
    expect(getIsentropicEnthalpyDrop(10, 10)).toBeCloseTo(0, 6)
    expect(getIsentropicEnthalpyDrop(1, 10)).toBeLessThan(0)
  })

  test("clamps outside the table instead of throwing", () => {
    expect(Number.isFinite(getIsentropicEnthalpyDrop(500, 0.001))).toBe(true)
  })
})

describe("getExhaustQuality", () => {
  const { IsentropicEfficiency } = CstSimulation.CstTurbine

  // Hand calculation from IF97 values: x = (hg(boiler) - efficiency * drop - hf(exhaust)) / hfg(exhaust)
  const Qualities: number[][] = [
    [165, 0.1, 0.667],
    [40, 0.1, 0.778],
  ]

  test.each(Qualities)("%f bar to %f bar leaves about %f of the exhaust as vapour", (boiler, exhaust, expected) => {
    expect(getExhaustQuality(boiler, exhaust, IsentropicEfficiency)).toBeCloseTo(expected, 2)
  })

  test("a less efficient turbine leaves a higher exhaust quality", () => {
    expect(getExhaustQuality(165, 0.1, 0.5)).toBeGreaterThan(getExhaustQuality(165, 0.1, IsentropicEfficiency))
  })

  test("is 1 with a zero or negative enthalpy drop", () => {
    expect(getExhaustQuality(10, 10, IsentropicEfficiency)).toBe(1)
    expect(getExhaustQuality(0.5, 1.013, IsentropicEfficiency)).toBe(1)
  })

  test("stays within 0-1 at any boiler and condenser pressure, also outside the table", () => {
    for (const boiler of [0.001, 0.01, 1, 10, 100, 165, 178, 220, 500]) {
      for (const exhaust of [0.001, 0.005, 0.0133, 0.1, 0.327, 1.013, 2]) {
        const quality: number = getExhaustQuality(boiler, exhaust, IsentropicEfficiency)
        expect(quality).toBeGreaterThanOrEqual(0)
        expect(quality).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe("exhaust follows the shaft work", () => {
  const { IsentropicEfficiency } = CstSimulation.CstTurbine

  test("saturation enthalpies at 10 bar match IF97 (hf 762.5, hg 2777.1 kJ/kg)", () => {
    const { liquid, vapor } = getSaturationEnthalpies(10)
    expect(liquid).toBeCloseTo(762.5, -1)
    expect(vapor).toBeCloseTo(2777.1, -1)
  })

  test("full work gives today's exhaust quality", () => {
    expect(getExhaustQuality(165, 0.1, IsentropicEfficiency, 1)).toBe(getExhaustQuality(165, 0.1, IsentropicEfficiency))
  })

  test("with no work the exhaust is the inlet steam, still saturated vapour at the boiler pressure", () => {
    expect(getExhaustEnthalpy(165, 0.03, IsentropicEfficiency, 0)).toBe(getSaturationEnthalpies(165).vapor)
    expect(getExhaustQuality(165, 0.03, IsentropicEfficiency, 0)).toBe(1)
  })

  test("the less work, the drier the exhaust", () => {
    const half: number = getExhaustQuality(165, 0.03, IsentropicEfficiency, 0.5)
    expect(half).toBeGreaterThan(getExhaustQuality(165, 0.03, IsentropicEfficiency, 1))
    expect(half).toBeLessThanOrEqual(1)
  })

  test("without a drop the enthalpy is the inlet enthalpy", () => {
    expect(getExhaustEnthalpy(10, 10, IsentropicEfficiency)).toBe(getSaturationEnthalpies(10).vapor)
  })
})

describe("getSaturatedSteamDensity", () => {
  // IAPWS-IF97 saturated vapour density: [°C, kg/m³]
  const VapourDensity: number[][] = [
    [100, 0.5977],
    [200, 7.861],
    [300, 46.17],
    [350, 113.6],
  ]

  test.each(VapourDensity)("is within 3%% of IF97 at %i °C", (temperature: number, expected: number) => {
    expect(Math.abs(getSaturatedSteamDensity(temperature) / expected - 1)).toBeLessThan(0.03)
  })

  test("its slope has no step across 300-360 °C (the plant works at 165-180 bar, 350-357 °C)", () => {
    // slope in kg/m³ per K on a 0.25 K grid; the old 20 K table nodes made it step by 0.65 where the ±5 K window reached a node
    const MaxSlopeStep = 0.2
    let previous = Number.NaN
    let worst = 0
    for (let t = 300; t <= 360; t += 0.25) {
      const slope: number = (getSaturatedSteamDensity(t + 0.125) - getSaturatedSteamDensity(t - 0.125)) / 0.25
      if (!Number.isNaN(previous)) worst = Math.max(worst, Math.abs(slope - previous))
      previous = slope
    }
    expect(worst).toBeLessThan(MaxSlopeStep)
  })

  test("rises steadily from 80 to 365 °C and is finite up to past the critical point", () => {
    // above 369 °C the ±5 K window reaches the sparse critical-point row and the density dips about 1% (ADR 0025); out of reach of the plant
    let previous = 0
    for (let t = 80; t <= 380; t += 0.5) {
      const density: number = getSaturatedSteamDensity(t)
      expect(Number.isFinite(density)).toBe(true)
      if (t <= 365) expect(density).toBeGreaterThanOrEqual(previous)
      previous = density
    }
  })
})

describe("saturated liquid enthalpy below the steam table", () => {
  // IAPWS-IF97 saturated liquid: [°C, kJ/kg]
  const Cold: number[][] = [
    [10, 42.02],
    [37, 155.0],
    [60, 251.18],
  ]

  test.each(Cold)("%i °C holds %f kJ/kg", (temperature, enthalpy) => {
    expect(getLiquidEnthalpy(temperature)).toBeCloseTo(enthalpy, 0)
  })

  test("is right below 80 °C, not the 80 °C value (about 335 kJ/kg) the steam table clamps to", () => {
    expect(getLiquidEnthalpy(37)).toBeLessThan(160)
  })

  test("has no step at 80 °C: the slope on each side is the specific heat, 4.2 kJ/kg·K", () => {
    expect(getLiquidEnthalpy(80)).toBeCloseTo(334.9, 1)
    expect(getLiquidEnthalpy(79.9)).toBeCloseTo(334.9 - 0.42, 1)
    expect(getLiquidEnthalpy(80.1)).toBeCloseTo(334.9 + 0.42, 1)
  })

  test("agrees with the steam table from 80 °C up and rises all the way", () => {
    for (const row of steamTable) expect(getLiquidEnthalpy(row.temperature)).toBeCloseTo(row.enthalpy, 6)
    let previous = -1
    for (let temperature = 0; temperature <= 374; temperature += 0.5) {
      const enthalpy: number = getLiquidEnthalpy(temperature)
      expect(enthalpy).toBeGreaterThan(previous)
      previous = enthalpy
    }
  })

  test("the temperature function inverts it", () => {
    for (const temperature of [5, 37, 79, 80, 122, 322, 350]) {
      expect(getLiquidTemperature(getLiquidEnthalpy(temperature))).toBeCloseTo(temperature, 6)
    }
  })
})

// IAPWS-IF97 superheated steam (#113): [bar, °C, enthalpy kJ/kg, entropy kJ/kg·K]
const Superheated: number[][] = [
  [165, 540, 3406.5, 6.4298],
  [100, 500, 3373.7, 6.5966],
  [50, 450, 3316.2, 6.8186],
  [20, 400, 3247.6, 7.1271],
]

describe("superheated steam against IAPWS-IF97", () => {
  test.each(Superheated)("%i bar, %i °C: enthalpy and entropy are within 0.5%%", (pressure, temperature, h, s) => {
    expect(Math.abs(getSteamEnthalpy(pressure, temperature) / h - 1)).toBeLessThan(0.005)
    expect(Math.abs(getSteamEntropy(pressure, temperature) / s - 1)).toBeLessThan(0.005)
  })

  test("at or below saturation the steam is saturated vapour", () => {
    expect(Math.abs(getSteamEnthalpy(165, 300) - getSaturationEnthalpies(165).vapor)).toBeLessThan(2)
    expect(getSteamEntropy(165, getBoilingPoint(165))).toBeGreaterThan(5)
  })

  test("superheat raises the isentropic drop above the saturated drop", () => {
    const saturated: number = getIsentropicEnthalpyDrop(165, 0.031)
    const superheated: number = getSuperheatedIsentropicDrop(165, 540, 0.031)
    expect(superheated).toBeGreaterThan(saturated + 150)
    expect(getSuperheatedIsentropicDrop(165, getBoilingPoint(165), 0.031)).toBeCloseTo(saturated, -1)
  })
})

describe("getSteamTemperature (#113)", () => {
  test.each([[165, 540], [100, 400], [50, 500]])("inverts getSteamEnthalpy at %i bar and %i °C", (pressure, temperature) => {
    expect(getSteamTemperature(pressure, getSteamEnthalpy(pressure, temperature))).toBeCloseTo(temperature, 1)
  })

  test("saturated vapour or less is saturation, and the end of the table is its last column", () => {
    expect(getSteamTemperature(165, 0)).toBe(getBoilingPoint(165))
    expect(getSteamTemperature(165, 1e5)).toBeCloseTo(getBoilingPoint(165) + 350, 6)
  })

  test("the inlet helpers fall back to the saturated tables with no superheat", () => {
    expect(getInletEnthalpy(165)).toBeCloseTo(getSaturationEnthalpies(165).vapor, 9)
    expect(getInletIsentropicDrop(165, 0.031)).toBeCloseTo(getIsentropicEnthalpyDrop(165, 0.031), 9)
    expect(getInletIsentropicDrop(165, 0.031, 540)).toBeGreaterThan(getInletIsentropicDrop(165, 0.031) + 400)
    expect(getExhaustQuality(165, 0.031, 0.85, 1, 540)).toBeGreaterThan(getExhaustQuality(165, 0.031, 0.85, 1))
  })
})
