import { describe, expect, it } from "vitest"
import formatSigned from "./formatSigned"

describe("formatSigned", () => {
  it("puts a + in front of a positive value", () => {
    expect(formatSigned(5, 1, "kg/s")).toBe("+5.0 kg/s")
  })

  it("keeps the minus of a negative value", () => {
    expect(formatSigned(-2.54, 1, "kg/s")).toBe("-2.5 kg/s")
  })

  it("shows zero without a sign", () => {
    expect(formatSigned(0, 1, "kg/s")).toBe("0.0 kg/s")
  })

  it("shows no sign for a drift that rounds to zero, either way", () => {
    expect(formatSigned(0.04, 1, "kg/s")).toBe("0.0 kg/s")
    expect(formatSigned(-0.04, 1, "kg/s")).toBe("0.0 kg/s")
  })

  it("uses the given decimals and unit", () => {
    expect(formatSigned(1234.5, 0, "MJ/s")).toBe("+1235 MJ/s")
    expect(formatSigned(-0.123, 2, "kg")).toBe("-0.12 kg")
  })
})
