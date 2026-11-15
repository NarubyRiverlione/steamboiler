/** The valve ramp context and its hook (#127); the provider that owns the ramps is in ValveRampProvider.tsx. */

import { createContext, useContext } from "react"

// Stable, unique key of one valve knob, for example "Bypass valve"
export type ValveId = string

export type ValveRampValue = {
  readonly commanded: Readonly<Record<ValveId, number>> // 0..1 per valve while its ramp runs
  readonly command: (id: ValveId, target: number) => void
}

export const ValveRampContext = createContext<ValveRampValue | undefined>(undefined)

type ValveRamp = {
  readonly commanded: number | null // 0..1 while a ramp runs, otherwise null
  readonly command: (target: number) => void
}

export function useValveRamp(id: ValveId): ValveRamp {
  const value: ValveRampValue | undefined = useContext(ValveRampContext)
  if (value === undefined) throw new Error("useValveRamp must be used within a ValveRampProvider")
  return {
    commanded: value.commanded[id] ?? null,
    command: (target: number): void => {
      value.command(id, target)
    },
  }
}
