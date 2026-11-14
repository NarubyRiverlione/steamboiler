/** Generator Breaker group: the breaker turn switch under its flip cover (UI state: the cover is lifted or down), the Ready to close lamp, the reason it is blocked, and the turbine speed beside the breaker, so it can be closed with the speed in view. */

import { useState } from "react"
import { CstSimulation } from "../../context/const"
import { isAtSyncSpeed } from "../../utils/turbineCalculations"
import { Display } from "../board/Display"
import { Lamp } from "../board/Lamp"
import { TurnSwitch } from "../board/TurnSwitch"
import type { TurbineState } from "../Turbine/types"

const {
  CstTurbine: { SyncRPM, BreakerRPMMargin },
} = CstSimulation

const MIN_SYNC: number = SyncRPM - BreakerRPMMargin
const MAX_SYNC: number = SyncRPM + BreakerRPMMargin
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
            title={
              blocked
                ? `Breaker can only be closed between ${MIN_SYNC.toFixed(0)} and ${MAX_SYNC.toFixed(0)} RPM`
                : undefined
            }
            guard={{
              lifted: coverLifted,
              onToggleCover: () => {
                setCoverLifted(!coverLifted)
              },
            }}
          />
        </div>
      </div>
      <div className="board-readout">
        <span>Turbine speed</span>
        <Display label="Turbine speed" text={`${rpm.toFixed(0)} RPM`} widest="9999 RPM" />
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
    </div>
  )
}
