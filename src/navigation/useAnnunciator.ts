/** The annunciator context and its hook; the provider is in AnnunciatorProvider.tsx. */

import { createContext, useContext } from "react"
import type { AlarmId } from "./alarms"
import type { PartId } from "./plantParts"

export type Tile = {
  readonly id: AlarmId
  readonly label: string
  readonly part: PartId
  readonly lit: boolean
  readonly flashing: boolean
}

export type AnnunciatorValue = {
  readonly tiles: readonly Tile[]
  readonly testing: boolean
  readonly acknowledge: () => void
  // Forgets every acknowledgement (a loaded preset is a fresh plant)
  readonly clearAcknowledgements: () => void
  readonly setTesting: (on: boolean) => void
}

export const AnnunciatorContext = createContext<AnnunciatorValue | undefined>(undefined)

export function useAnnunciator(): AnnunciatorValue {
  const value: AnnunciatorValue | undefined = useContext(AnnunciatorContext)
  if (value === undefined) throw new Error("useAnnunciator must be used within an AnnunciatorProvider")
  return value
}
