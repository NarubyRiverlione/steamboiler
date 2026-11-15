/** Generation Status panel content: the generator load, the load setpoint and the breaker. */

import { Display } from "../board/Display"
import type { TurbineState } from "../Turbine/types"

type GenerationStatusProps = {
  readonly turbine: TurbineState
}

export function GenerationStatus({ turbine }: GenerationStatusProps) {
  return (
    <>
      <h3 className="board-group-title board-section">Generation Status</h3>
      <div className="board-readouts">
        <div className="board-readout">
          <span>Generator load</span>
          <Display label="Generator load" text={`${turbine.electricOutput.toFixed(1)} MW`} widest="999.9 MW" />
        </div>
        <div className="board-readout">
          <span>Load setpoint</span>
          <Display label="Load setpoint" text={`${turbine.loadSetpoint.toFixed(1)} MW`} widest="999.9 MW" />
        </div>
        <div className="board-readout">
          <span>Breaker</span>
          <Display label="Breaker" text={turbine.generatorBreaker ? "CLOSED" : "OPEN"} widest="CLOSED" />
        </div>
      </div>
    </>
  )
}
