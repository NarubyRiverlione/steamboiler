/** Generator Breaker group: the breaker turn switch under its flip cover (UI state: the cover is lifted or down), the Ready to close lamp, the reason it is blocked, and the RPM dial. */

import { useState } from "react"
import { CstSimulation } from "../../context/const"
import { isAtSyncSpeed } from "../../utils/turbineCalculations"
import { Lamp } from "../board/Lamp"
import { RoundGauge, type GaugeZone } from "../board/RoundGauge"
import { TurnSwitch } from "../board/TurnSwitch"
import type { TurbineState } from "./types"

const {
  CstTurbine: { SyncRPM, MaxRPM, BreakerRPMMargin },
} = CstSimulation

const MIN_SYNC: number = SyncRPM - BreakerRPMMargin
const MAX_SYNC: number = SyncRPM + BreakerRPMMargin
const RPM_WARN: number = SyncRPM * 1.05 // dial turns orange above this
const RPM_ZONES: readonly GaugeZone[] = [
  { from: 0, to: RPM_WARN, tone: "ok" },
  { from: RPM_WARN, to: MaxRPM, tone: "warn" },
]

type GeneratorBreakerGroupProps = {
  readonly turbine: TurbineState
  readonly onToggleBreaker: () => void
}

export function GeneratorBreakerGroup({ turbine, onToggleBreaker }: GeneratorBreakerGroupProps) {
  const { generatorBreaker, rpm } = turbine
  const inSync: boolean = isAtSyncSpeed(rpm)
  const blocked: boolean = !generatorBreaker && !inSync
  const [coverLifted, setCoverLifted] = useState<boolean>(false)
  return (
    <div className="board-group">
      <h3 className="board-group-title">Generator Breaker</h3>
      <div className="board-hazard">
        <div className="board-switch-in-housing">
          <TurnSwitch
            label="Generator breaker"
            offLabel="OPEN"
            onLabel="CLOSED"
            tone="breaker"
            on={generatorBreaker}
            onToggle={onToggleBreaker}
            disabled={blocked}
            title={blocked ? `Breaker can only be closed between ${MIN_SYNC.toFixed(0)} and ${MAX_SYNC.toFixed(0)} RPM` : undefined}
            guard={{ lifted: coverLifted, onToggleCover: () => { setCoverLifted(!coverLifted) } }}
          />
        </div>
      </div>
      <span className="board-readout-label">Breaker</span>
      <Lamp
        lit={inSync}
        tone="ok"
        label="Ready to close"
        title={`Breaker can be closed between ${MIN_SYNC.toFixed(0)} and ${MAX_SYNC.toFixed(0)} RPM`}
      />
      {blocked && (
        <p className="board-lcd-msg">
          Breaker can only be closed when RPM is between {MIN_SYNC.toFixed(0)} and {MAX_SYNC.toFixed(0)}.
          Current RPM: {rpm.toFixed(0)}
        </p>
      )}
      <RoundGauge
        label="Speed gauge"
        unit="RPM"
        value={rpm}
        min={0}
        max={MaxRPM}
        major={500}
        minor={100}
        zones={RPM_ZONES}
      />
    </div>
  )
}
