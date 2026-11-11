/** Speed stays at 1x while a tile flashes (set, not yet acknowledged); after ACK the tile is steady and the speed can be raised again (ADR 0034). */

import type { Tile } from "./useAnnunciator"

export const isSpeedLocked = (tiles: readonly Tile[]): boolean => tiles.some((tile: Tile) => tile.flashing)
