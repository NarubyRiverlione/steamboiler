/** Annunciator state of the UI layer: which tiles are lit and flashing, ACK and RESET (latching). Nothing here reaches the simulation. */

import { useState, type ReactNode } from "react"
import usePowerPlant from "../context/PowerPlantContext"
import { ALARMS, type Alarm, type AlarmId } from "./alarms"
import { AnnunciatorContext, type AnnunciatorValue } from "./useAnnunciator"

type LatchState = "flashing" | "steady"
type Latches = Readonly<Partial<Record<AlarmId, LatchState>>>

export function AnnunciatorProvider({ children }: { readonly children: ReactNode }) {
  const { state } = usePowerPlant()
  const [latches, setLatches] = useState<Latches>({})
  const active: readonly AlarmId[] = ALARMS.filter((a: Alarm) => a.active(state)).map((a: Alarm) => a.id)

  // A new trip flashes; a flashing tile whose flag clears goes dark; a steady one stays latched (adjusted while rendering, not in an effect)
  const next: Partial<Record<AlarmId, LatchState>> = {}
  for (const a of ALARMS) {
    const current: LatchState | undefined = latches[a.id]
    if (current === "steady") next[a.id] = "steady"
    else if (active.includes(a.id)) next[a.id] = "flashing"
  }
  const changed: boolean = ALARMS.some((a: Alarm) => next[a.id] !== latches[a.id])
  if (changed) setLatches(next)

  const value: AnnunciatorValue = {
    tiles: ALARMS.map((a: Alarm) => {
      const latch: LatchState | undefined = next[a.id]
      return { id: a.id, label: a.label, part: a.part, severity: a.severity, lit: latch !== undefined, flashing: latch === "flashing" }
    }),
    acknowledge: (): void => {
      setLatches((prev: Latches) => Object.fromEntries(Object.keys(prev).map((id: string) => [id, "steady"])))
    },
    // RESET: a steady tile goes dark only when its flag is clear
    reset: (): void => {
      setLatches((prev: Latches) => Object.fromEntries(Object.entries(prev).filter(([id, l]) => l === "flashing" || active.includes(id as AlarmId))))
    },
    clearLatches: (): void => { setLatches({}); },
  }

  return <AnnunciatorContext.Provider value={value}>{children}</AnnunciatorContext.Provider>
}
