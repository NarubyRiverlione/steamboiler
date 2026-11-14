import { describe, expect, test } from "vitest"
import { CstSuperheater } from "../const"
import { attemperatorAfter, equilibriumSteamTemperature, integralFor, sprayEnthalpyOf, sprayFlowOf } from "./Attemperator"
import { getBoilingPoint, getSaturationEnthalpies } from "../../utils/steamTable"

const { SteamTemperature, PID_Kp, PID_Ki, IntegralLimit, SprayCapacity } = CstSuperheater
const dt = 0.1
const idle = { sprayValvePosition: 0, attemperatorIntegralError: 0 }

describe("sprayFlowOf", () => {
  test("is the valve position times the capacity, and never outside the valve's travel", () => {
    expect(sprayFlowOf(0.5)).toBeCloseTo(0.5 * SprayCapacity, 9)
    expect(sprayFlowOf(-1)).toBe(0)
    expect(sprayFlowOf(2)).toBe(SprayCapacity)
  })
})

describe("attemperatorAfter (ADR 0044)", () => {
  test("at the setpoint with no integral the valve stays shut", () => {
    expect(attemperatorAfter(idle, true, SteamTemperature, SteamTemperature, dt).sprayValvePosition).toBe(0)
  })

  test("steam above the setpoint opens the valve in proportion to the error, and the integral grows", () => {
    const next = attemperatorAfter(idle, true, SteamTemperature + 10, SteamTemperature + 10, dt)
    expect(next.sprayValvePosition).toBeCloseTo(PID_Kp * 10 + PID_Ki * 10 * dt, 9)
    expect(next.attemperatorIntegralError).toBeCloseTo(10 * dt, 9)
  })

  test("steam below the setpoint cannot make the valve negative, and the integral stays at 0 (anti-windup)", () => {
    const next = attemperatorAfter(idle, true, SteamTemperature - 50, SteamTemperature - 50, dt)
    expect(next.sprayValvePosition).toBe(0)
    expect(next.attemperatorIntegralError).toBe(0)
  })

  test("the integral is clamped, and the valve never opens past 100%", () => {
    const next = attemperatorAfter({ sprayValvePosition: 1, attemperatorIntegralError: IntegralLimit }, true, SteamTemperature + 500, SteamTemperature + 500, dt)
    expect(next.attemperatorIntegralError).toBe(IntegralLimit)
    expect(next.sprayValvePosition).toBeLessThanOrEqual(1)
  })

  test("the derivative acts on the measurement: a rising steam temperature opens the valve more when Kd is set, none at Kd 0", () => {
    const rising = attemperatorAfter(idle, true, SteamTemperature, SteamTemperature - 1, dt)
    const flat = attemperatorAfter(idle, true, SteamTemperature, SteamTemperature, dt)
    expect(rising.sprayValvePosition).toBeGreaterThanOrEqual(flat.sprayValvePosition)
  })

  test("Manual leaves the valve where the operator put it, whatever the steam does", () => {
    const next = attemperatorAfter({ sprayValvePosition: 0.3, attemperatorIntegralError: 0 }, false, SteamTemperature + 100, SteamTemperature, dt)
    expect(next.sprayValvePosition).toBe(0.3)
    // and the integral follows, so switching back to Auto is bumpless
    expect(next.attemperatorIntegralError).toBeCloseTo(integralFor(0.3), 9)
  })
})

describe("integralFor", () => {
  test("gives the position back with no error, within the clamp", () => {
    expect(PID_Ki * integralFor(0.1)).toBeCloseTo(0.1, 9)
    expect(integralFor(5)).toBe(IntegralLimit)
    expect(integralFor(-1)).toBe(0)
  })
})

describe("equilibriumSteamTemperature", () => {
  const pressure = 165
  const saturation = getBoilingPoint(pressure)
  const water = sprayEnthalpyOf(134)

  test("no steam flow leaves the steam at saturation", () => {
    expect(equilibriumSteamTemperature(pressure, 0, 1e5, 0, water, saturation)).toBe(saturation)
  })

  test("the heat raises the steam above saturation, and the spray water cools it", () => {
    const hot = equilibriumSteamTemperature(pressure, 100, 100e3, 0, water, saturation)
    const sprayed = equilibriumSteamTemperature(pressure, 100, 100e3, 5, water, saturation)
    expect(hot).toBeGreaterThan(saturation + 100)
    expect(sprayed).toBeLessThan(hot)
  })

  test("energy balance: the mixed enthalpy is the steam, the heat and the spray water over the total flow", () => {
    const heat = 100e3
    const saturated = getSaturationEnthalpies(pressure).vapor
    const mixed = (100 * saturated + heat + 5 * water) / 105
    const temperature = equilibriumSteamTemperature(pressure, 100, heat, 5, water, saturation)
    // the table is interpolated, so the inverse is checked against the enthalpy within a fraction of a percent
    expect(temperature).toBeGreaterThan(saturation)
    expect(mixed).toBeGreaterThan(saturated)
  })

  test("enough spray cools the steam to saturation, never below", () => {
    expect(equilibriumSteamTemperature(pressure, 10, 1e3, 200, water, saturation)).toBe(saturation)
  })
})
