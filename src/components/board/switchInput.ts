/** What a click or key does to a turn switch (#124): turn it, lift or drop its cover, or nothing. Pure, so the rules are tested without a DOM. */

export type SwitchAction = "toggle" | "cover" | "none"

export type SwitchGuard = {
  readonly lifted: boolean
  readonly onToggleCover: () => void
}

// A disabled switch refuses everything; under a cover that is down a press lifts the cover instead of turning the switch
export function pressAction(covered: boolean, disabled: boolean): SwitchAction {
  if (disabled) return "none"
  return covered ? "cover" : "toggle"
}

const ACTIVATION_KEYS: readonly string[] = [" ", "Enter"]

// "ignore" is a key the switch does not use (the arrows still change the page); "none" is a key it uses but refuses
export function keyAction(key: string, covered: boolean, lifted: boolean, disabled: boolean): SwitchAction | "ignore" {
  if (ACTIVATION_KEYS.includes(key)) return pressAction(covered, disabled)
  return key === "Escape" && lifted ? "cover" : "ignore"
}

// The accessible name says where the cover is, so a screen reader knows what a press will do
export function switchName(label: string, guard: SwitchGuard | undefined): string {
  if (guard === undefined) return label
  return `${label}, cover ${guard.lifted ? "up" : "down"}`
}
