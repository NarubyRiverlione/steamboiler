/** UPS group (#142): the UPS breaker (manual, works with no power), the UPS charge as an analog gauge (the LCDs sit on the vital bus, ADR 0055) and the Control power lamp. Reusable: #144 mounts it on the emergency board (every page) and, breaker only, on the dark board. */

import { useState } from "react"
import { isSafetyBusLive } from "../../context/SafetyBus"
import type PowerPlantState from "../../context/PowerPlantState"
import { BreakerSwitch } from "../board/BreakerSwitch"
import { Lamp } from "../board/Lamp"
import { RoundGauge, type GaugeZone } from "../board/RoundGauge"

// Red at the bottom: the battery is nearly flat (a UX choice, not modelled)
const CHARGE_ZONES: readonly GaugeZone[] = [
  { from: 0, to: 10, tone: "alarm" },
  { from: 10, to: 100, tone: "ok" },
]

type UpsGroupProps = {
  readonly state: PowerPlantState
  readonly onToggleUpsBreaker: () => void
  // The dark board (#144): the breaker switch alone, no gauge and no lamp
  readonly breakerOnly?: boolean
}

export function UpsGroup({ state, onToggleUpsBreaker, breakerOnly = false }: UpsGroupProps) {
  const [coverLifted, setCoverLifted] = useState<boolean>(false)
  return (
    <div className="board-group">
      <h3 className="board-group-title">UPS</h3>
      <BreakerSwitch
        label="UPS breaker"
        plate="UPS"
        rating="24 V · CB-U1"
        on={state.upsBreaker}
        onToggle={onToggleUpsBreaker}
        guard={{
          lifted: coverLifted,
          onToggleCover: () => {
            setCoverLifted(!coverLifted)
          },
        }}
      />
      {!breakerOnly && (
        <>
          <RoundGauge label="UPS charge" unit="%" value={state.upsCharge} min={0} max={100} major={20} minor={10} zones={CHARGE_ZONES} />
          <Lamp lit={isSafetyBusLive(state)} tone="ok" label="Control power" title="Lit while the safety bus is live (UPS breaker closed and the UPS charged)" />
        </>
      )}
    </div>
  )
}
