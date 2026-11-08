/** Annunciator state of the UI layer: which tiles are lit and flashing, ACK and TEST. Nothing here reaches the simulation. */

import { useState, type ReactNode } from "react"
import usePowerPlant from "../context/PowerPlantContext"
import { ALARMS, type Alarm, type AlarmId } from "./alarms"
import { AnnunciatorContext, type AnnunciatorValue } from "./useAnnunciator"

export function AnnunciatorProvider({ children }: { readonly children: ReactNode }) {
  const { state } = usePowerPlant()
  const [acked, setAcked] = useState<readonly AlarmId[]>([])
  const [testing, setTesting] = useState<boolean>(false)
  const active: readonly AlarmId[] = ALARMS.filter((a: Alarm) => a.active(state)).map((a: Alarm) => a.id)

  // A cleared flag forgets its acknowledgement, so the next trip flashes again (adjusted while rendering, not in an effect)
  const stillActive: readonly AlarmId[] = acked.filter((id: AlarmId) => active.includes(id))
  if (stillActive.length !== acked.length) setAcked(stillActive)

  const value: AnnunciatorValue = {
    tiles: ALARMS.map((a: Alarm) => {
      const on: boolean = active.includes(a.id)
      return { id: a.id, label: a.label, part: a.part, lit: on || testing, flashing: on && !testing && !acked.includes(a.id) }
    }),
    testing,
    acknowledge: (): void => { setAcked(active); },
    clearAcknowledgements: (): void => { setAcked([]); },
    setTesting,
  }

  return <AnnunciatorContext.Provider value={value}>{children}</AnnunciatorContext.Provider>
}
