import { act, renderHook } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"
import usePowerPlant from "../context/PowerPlantContext"
import PowerPlantProvider from "../context/PowerPlantProvider"

const wrapper = ({ children }: { children: ReactNode }) => <PowerPlantProvider>{children}</PowerPlantProvider>

describe("PowerPlantProvider attemperator actions", () => {
  it("setAttemperatorAuto switches the mode; the plant starts in Auto", () => {
    const { result } = renderHook(() => usePowerPlant(), { wrapper })
    expect(result.current.state.Boiler.attemperatorAuto).toBe(true)
    act(() => {
      result.current.setAttemperatorAuto(false)
    })
    expect(result.current.state.Boiler.attemperatorAuto).toBe(false)
  })

  it("adjustSprayValve moves the valve by the change in Manual and is refused in Auto", () => {
    const { result } = renderHook(() => usePowerPlant(), { wrapper })
    act(() => {
      result.current.adjustSprayValve(0.2)
    })
    expect(result.current.state.Boiler.sprayValvePosition).toBe(0)
    act(() => {
      result.current.setAttemperatorAuto(false)
    })
    act(() => {
      result.current.adjustSprayValve(0.2)
    })
    expect(result.current.state.Boiler.sprayValvePosition).toBeCloseTo(0.2)
  })
})
