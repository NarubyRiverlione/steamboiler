/** Generation Status panel content: the generator load, the net output, the load setpoint and the breaker. */

import { Display } from "../board/Display"
import type { TurbineState } from "../Turbine/types"

type GenerationStatusProps = {
  readonly turbine: TurbineState
  readonly netOutput: number // MW; negative while the auxiliary load exceeds the generator output
}

export function GenerationStatus({ turbine, netOutput }: GenerationStatusProps) {
  return (
    <>
      <h3 className="board-group-title board-section">Generation Status</h3>
      <div className="board-readouts">
        <div className="board-readout">
          <span>Generator load</span>
          <Display label="Generator load" text={`${turbine.electricOutput.toFixed(1)} MW`} widest="999.9 MW" />
        </div>
        <div className="board-readout">
          <span>Net output</span>
          <Display label="Net output" text={`${netOutput.toFixed(1)} MW`} widest="-999.9 MW" />
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
