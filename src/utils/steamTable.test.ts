import { describe, expect, test } from "vitest"
import { CstSimulation } from "../context/const"
import { steamTable } from "./steamData"
import { getBoilingPoint, getLatentHeat, getSteamData, getWaterSpecificHeat } from "./steamTable"

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
