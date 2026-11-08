/** Turbine Speed Control group: the speed mode and run-up point buttons, each refused with its reason. */

import { CstSimulation } from "../../context/const"
import type { SpeedMode } from "../../context/PowerPlantState"
import { runUpPointRefusal, speedModeRefusal } from "../../utils/turbineCalculations"
import { LensButton } from "../board/LensButton"
import type { TurbineState } from "./types"

const {
  CstTurbine: { RunUpPoints },
} = CstSimulation

const MODES: readonly { mode: SpeedMode; label: string }[] = [
  { mode: "free", label: "Free" },
  { mode: "rampUp", label: "Ramp up" },
  { mode: "hold", label: "Hold" },
]

type SpeedControlGroupProps = {
  readonly turbine: TurbineState
  readonly onSetSpeedMode: (mode: SpeedMode) => void
  readonly onSelectRunUpPoint: (point: number) => void
}

export function SpeedControlGroup({ turbine, onSetSpeedMode, onSelectRunUpPoint }: SpeedControlGroupProps) {
  return (
    <div className="board-group board-group-left">
      <h3 className="board-group-title">Turbine Speed Control</h3>
      <span className="board-readout-label">Speed mode</span>
      <div className="board-lens-row">
        {MODES.map(({ mode, label }) => {
          const refusal: string | undefined = speedModeRefusal(turbine, mode)
          return (
            <LensButton
              key={mode}
              small
              pressed={turbine.speedMode === mode}
              disabled={refusal !== undefined}
              title={refusal}
              onClick={() => {
                onSetSpeedMode(mode)
              }}
            >
              {label}
            </LensButton>
          )
        })}
      </div>
      <span className="board-readout-label">Run-up point</span>
      <div className="board-lens-row">
        {RunUpPoints.map((point: number) => {
          const refusal: string | undefined = runUpPointRefusal(turbine, point)
          return (
            <LensButton
              key={point}
              small
              pressed={turbine.runUpPoint === point}
              disabled={refusal !== undefined}
              title={refusal}
              onClick={() => {
                onSelectRunUpPoint(point)
              }}
            >
              {point} rpm
            </LensButton>
          )
        })}
      </div>
    </div>
  )
}
