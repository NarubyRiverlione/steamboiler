/** The annunciator context and its hook; the provider is in AnnunciatorProvider.tsx. */

import { createContext, useContext } from "react"
import type { AlarmId, AlarmSeverity } from "./alarms"
import type { PartId } from "./plantParts"

export type Tile = {
  readonly id: AlarmId
  readonly label: string
  readonly part: PartId
  readonly severity: AlarmSeverity
  readonly lit: boolean
  readonly flashing: boolean
}

export type AnnunciatorValue = {
  readonly tiles: readonly Tile[]
  // Flashing tiles become steady
  readonly acknowledge: () => void
  // Darkens the steady tiles whose flag is clear
  readonly reset: () => void
  // Forgets every latched tile (a loaded preset is a fresh plant)
  readonly clearLatches: () => void
}

export const AnnunciatorContext = createContext<AnnunciatorValue | undefined>(undefined)

export function useAnnunciator(): AnnunciatorValue {
  const value: AnnunciatorValue | undefined = useContext(AnnunciatorContext)
  if (value === undefined) throw new Error("useAnnunciator must be used within an AnnunciatorProvider")
  return value
}
