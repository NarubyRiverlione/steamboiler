import { describe, expect, it } from "vitest"
import { masterLights } from "./masterLights"
import type { Tile } from "./useAnnunciator"

describe("masterLights", () => {
  const t = (severity: "error" | "warning", lit: boolean, flashing: boolean): Tile => ({ id: "burnerTripped", label: "x", part: "boiler", severity, lit, flashing })
  it("is off without tiles", () => {
    expect(masterLights([])).toEqual({ error: "off", warning: "off" })
  })
  it("lets red hide yellow", () => {
    expect(masterLights([t("error", true, false), t("warning", true, true)])).toEqual({ error: "steady", warning: "off" })
  })
})
