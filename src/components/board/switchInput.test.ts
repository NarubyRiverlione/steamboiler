import { describe, expect, it } from "vitest"
import { keyAction, pressAction, switchName } from "./switchInput"

describe("pressAction", () => {
  it("turns the switch, lifts a cover that is down, and refuses while disabled", () => {
    expect(pressAction(false, false)).toBe("toggle")
    expect(pressAction(true, false)).toBe("cover")
    expect(pressAction(false, true)).toBe("none")
    expect(pressAction(true, true)).toBe("none")
  })
})

describe("keyAction", () => {
  it("treats Space and Enter as a press", () => {
    expect(keyAction(" ", false, false, false)).toBe("toggle")
    expect(keyAction("Enter", true, false, false)).toBe("cover")
    expect(keyAction("Enter", false, false, true)).toBe("none")
  })

  it("drops a lifted cover on Escape and ignores Escape without one", () => {
    expect(keyAction("Escape", false, true, false)).toBe("cover")
    expect(keyAction("Escape", true, false, false)).toBe("ignore")
  })

  it("ignores the arrows so they still change the page", () => {
    expect(keyAction("ArrowRight", false, false, false)).toBe("ignore")
  })
})

describe("switchName", () => {
  it("is the label alone without a cover, and says where the cover is with one", () => {
    expect(switchName("Vent", undefined)).toBe("Vent")
    expect(switchName("Breaker", { lifted: false, onToggleCover: () => undefined })).toBe("Breaker, cover down")
    expect(switchName("Breaker", { lifted: true, onToggleCover: () => undefined })).toBe("Breaker, cover up")
  })
})
