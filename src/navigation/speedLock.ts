/** Speed stays at 1x while an alarm is set and not yet acknowledged (a flashing tile); after ACK it can be raised again (ADR 0034). */

import type { Tile } from "./useAnnunciator"

export const isSpeedLocked = (tiles: readonly Tile[]): boolean => tiles.some((tile: Tile) => tile.flashing)
