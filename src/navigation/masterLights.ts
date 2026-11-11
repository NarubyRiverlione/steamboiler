/** Master lights of the folded annunciator: red for errors, yellow for warnings (a warning master stays off while an error is active). */

import type { Tile } from "./useAnnunciator"

export type MasterState = "off" | "flashing" | "steady"
export type MasterLights = { readonly error: MasterState; readonly warning: MasterState }

// Off with no lit tile of the severity, flashing while any is unacknowledged, steady once all are acknowledged
function masterState(tiles: readonly Tile[], severity: Tile["severity"]): MasterState {
  const lit: readonly Tile[] = tiles.filter((tile: Tile) => tile.severity === severity && tile.lit)
  if (lit.length === 0) return "off"
  return lit.some((tile: Tile) => tile.flashing) ? "flashing" : "steady"
}

export function masterLights(tiles: readonly Tile[]): MasterLights {
  const error: MasterState = masterState(tiles, "error")
  // Red over yellow: a warning master is lit only while no error tile is
  const warning: MasterState = error === "off" ? masterState(tiles, "warning") : "off"
  return { error, warning }
}
