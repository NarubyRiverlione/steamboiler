/** Generator Breaker group: the breaker (a rocker `BreakerSwitch`) under its flip cover (UI state: the cover is lifted or down), the Ready to close lamp (its one permissive; the reason it is blocked is only the breaker's tooltip, ADR 0054), and the turbine speed beside the breaker, so it can be closed with the speed in view. */

import { useState } from "react"
import { generatorBreakerCloseRefusal, isAtSyncSpeed } from "../../utils/turbineCalculations"
import { Display } from "../board/Display"
import { Lamp } from "../board/Lamp"
import { BreakerSwitch } from "../board/BreakerSwitch"
import type { TurbineState } from "../Turbine/types"

type GeneratorBreakerGroupProps = {
  readonly turbine: TurbineState
  readonly onToggleBreaker: () => void
}

export function GeneratorBreakerGroup({ turbine, onToggleBreaker }: GeneratorBreakerGroupProps) {
  const { generatorBreaker, rpm } = turbine
  const inSync: boolean = isAtSyncSpeed(rpm)
  const refusal: string | undefined = generatorBreakerCloseRefusal(turbine)
  const [coverLifted, setCoverLifted] = useState<boolean>(false)
  return (
    <div className="board-group">
      <h3 className="board-group-title">Generator Breaker</h3>
      <BreakerSwitch
        label="Generator breaker"
        plate="Generator"
        rating="10.5 kV · CB-G1"
        on={generatorBreaker}
        onToggle={onToggleBreaker}
        disabled={refusal !== undefined}
        title={refusal}
        guard={{
          lifted: coverLifted,
          onToggleCover: () => {
            setCoverLifted(!coverLifted)
          },
        }}
      />
      <div className="board-readout">
        <span>Turbine speed</span>
        <Display label="Turbine speed" text={`${rpm.toFixed(0)} RPM`} widest="9999 RPM" />
      </div>
      <span className="board-readout-label">Breaker</span>
      <Lamp
        lit={inSync}
        tone="ok"
        label="Ready to close"
        title="Lit when the speed is inside the synchronising window"
      />
    </div>
  )
}
