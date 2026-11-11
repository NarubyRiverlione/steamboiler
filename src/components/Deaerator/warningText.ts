/** The warning text of the deaerator's two flags (ADR 0038); one at a time, as the flags exclude each other. */

export function warningText(closedWithAir: boolean, openNoAir: boolean): string {
  if (closedWithAir) return "Start-up vent closed with air in the vessel: heating is slow, the pressure rises and the relief valve may lift"
  if (openNoAir) return "Start-up vent open with no air left: steam is being lost through it. Close the vent"
  return ""
}
