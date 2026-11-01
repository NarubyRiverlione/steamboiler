import { describe, expect, test } from "vitest"
import { CstSimulation } from "../context/const"
import { steamTable } from "./steamData"
import { getBoilingPoint, getLatentHeat, getSteamData, getWaterSpecificHeat, getWaterSpecificVolume } from "./steamTable"

const CriticalTemperature = 373.946 // °C, IAPWS-IF97
const CriticalPressure = 220.64 // bar, IAPWS-IF97

// IAPWS-IF97 saturation values: [°C, bar, latent heat kJ/kg, liquid enthalpy kJ/kg]
const If97: number[][] = [
  [100, 1.01418, 2256.5, 419.1],
  [150, 4.7610, 2113.7, 632.3],
  [200, 15.5467, 1939.7, 852.4],
  [250, 39.7594, 1715.3, 1085.7],
  [300, 85.8771, 1404.8, 1344.8],
  [350, 165.2916, 892.7, 1670.9],
]

describe("steam table against IAPWS-IF97", () => {
  test.each(If97)("%i °C: pressure, latent heat and enthalpy are within 1%", (temperature, pressure, latent, enthalpy) => {
    const data = getSteamData(temperature)
    expect(data.pressure).toBeCloseTo(pressure, 0)
    expect(Math.abs(data.pressure / pressure - 1)).toBeLessThan(0.01)
    expect(Math.abs(data.latentHeat / latent - 1)).toBeLessThan(0.01)
    expect(Math.abs(data.enthalpy / enthalpy - 1)).toBeLessThan(0.01)
  })

  test("boiling point at design pressure is within 1 °C of the design temperature", () => {
    expect(Math.abs(getBoilingPoint(CstSimulation.CstBoiler.DesignPressure) - CstSimulation.CstBoiler.DesignTemperature)).toBeLessThan(1)
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
    expect(steamTable.every((row) => row.temperature <= CriticalTemperature && row.pressure <= CriticalPressure)).toBe(true)
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
