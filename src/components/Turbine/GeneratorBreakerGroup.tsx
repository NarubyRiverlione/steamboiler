/** Generator Breaker group: the guarded breaker, the Ready to close lamp, the reason it is blocked, and the RPM dial. */

import { CstSimulation } from "../../context/const"
import { isAtSyncSpeed } from "../../utils/turbineCalculations"
import { Lamp } from "../board/Lamp"
import { RoundGauge, type GaugeZone } from "../board/RoundGauge"
import { BreakerSwitch } from "./BreakerSwitch"
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
  return (
    <div className="board-group">
      <h3 className="board-group-title">Generator Breaker</h3>
      <BreakerSwitch closed={generatorBreaker} blocked={blocked} onToggle={onToggleBreaker} />
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
