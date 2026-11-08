/** Turbine Status panel content: the readouts and the trip lamp. */

import type { SpeedMode } from "../../context/PowerPlantState"
import useEMA from "../../utils/useEMA"
import { Display } from "../board/Display"
import { Lamp } from "../board/Lamp"
import type { TurbineState } from "./types"

const MODE_LABELS: Record<SpeedMode, string> = { free: "FREE", rampUp: "RAMP UP", hold: "HOLD" }

type TurbineStatusProps = {
  readonly turbine: TurbineState
}

export function TurbineStatus({ turbine }: TurbineStatusProps) {
  const smoothFlow: number = useEMA(turbine.turbineSteamFlowOut, 0.05)
  return (
    <>
      <h3 className="board-group-title board-section">Turbine Status</h3>
      <div className="board-readouts">
        <div className="board-readout">
          <span>Steam flow</span>
          <Display label="Steam flow" text={`${smoothFlow.toFixed(1)} kg/s`} widest="999.9 kg/s" />
        </div>
        <div className="board-readout">
          <span>Generator load</span>
          <Display
            label="Generator load"
            text={`${turbine.electricOutput.toFixed(1)} MW`}
            widest="999.9 MW"
          />
        </div>
        <div className="board-readout">
          <span>Turbine speed</span>
          <Display label="Turbine speed" text={`${turbine.rpm.toFixed(0)} RPM`} widest="9999 RPM" />
        </div>
        <div className="board-readout">
          <span>Load setpoint</span>
          <Display label="Load setpoint" text={`${turbine.loadSetpoint.toFixed(1)} MW`} widest="999.9 MW" />
        </div>
        <div className="board-readout">
          <span>Run-up point</span>
          <Display label="Run-up point" text={`${turbine.runUpPoint.toFixed(0)} RPM`} widest="9999 RPM" />
        </div>
        <div className="board-readout">
          <span>Mode</span>
          <Display label="Speed mode" text={MODE_LABELS[turbine.speedMode]} widest="RAMP UP" />
        </div>
        <div className="board-readout">
          <span>Breaker</span>
          <Display label="Breaker" text={turbine.generatorBreaker ? "CLOSED" : "OPEN"} widest="CLOSED" />
        </div>
        <div className="board-readout">
          <span>Turbine trip</span>
          <Lamp
            lit={turbine.turbineTripped}
            label="Turbine trip"
            title="Turbine tripped: condenser pressure rose above the vacuum limit, or the main steam valve closed on low boiler pressure"
          />
        </div>
      </div>
    </>
  )
}
