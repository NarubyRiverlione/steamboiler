/** Generator Load group: the MW dial (actual load and setpoint), the load setpoint knob and the field the setpoint is typed into. */

import { useState } from "react"
import { CstSimulation } from "../../context/const"
import { loadSetpointRefusal, ratedOutputMW } from "../../utils/turbineCalculations"
import { Knob } from "../board/Knob"
import { RoundGauge, type GaugeZone } from "../board/RoundGauge"
import type { TurbineState } from "../Turbine/types"

const {
  CstTurbine: { LoadSetpointLimit },
} = CstSimulation

const LOAD_KNOB_STEP = 5 // MW per arrow key press or wheel notch

// Green up to the rated output; above it the setpoint is allowed but the steam, not the generator, sets the limit (design-basis.md)
const LOAD_ZONES: readonly GaugeZone[] = [
  { from: 0, to: ratedOutputMW, tone: "ok" },
  { from: ratedOutputMW, to: LoadSetpointLimit, tone: "warn" },
]

type GeneratorLoadGroupProps = {
  readonly turbine: TurbineState
  readonly onSetLoadSetpoint: (value: number) => void
}

export function GeneratorLoadGroup({ turbine, onSetLoadSetpoint }: GeneratorLoadGroupProps) {
  const [draft, setDraft] = useState<string>("")
  const loadRefusal: string | undefined = loadSetpointRefusal(turbine)

  // The field shows the setpoint while it is not being typed in
  const applyLoad = (): void => {
    const value = Number(draft)
    if (draft !== "" && Number.isFinite(value)) onSetLoadSetpoint(value)
    setDraft("")
  }

  // The knob sets whole MW through the same action as the field; with the breaker open it is not given onChange, so it stays inert
  const turnKnob = (value: number): void => {
    setDraft("")
    onSetLoadSetpoint(Math.round(value))
  }

  return (
    <div className="board-group">
      <h3 className="board-group-title">Generator Load</h3>
      <RoundGauge
        label="Generator load dial"
        unit="MW"
        value={turbine.electricOutput}
        setpoint={turbine.loadSetpoint}
        min={0}
        max={LoadSetpointLimit}
        major={50}
        minor={10}
        zones={LOAD_ZONES}
      />
      <label className="board-readout-label" htmlFor="turbine-load-setpoint">
        Load setpoint (MW)
      </label>
      <Knob
        label="Load setpoint knob"
        value={Math.round(turbine.loadSetpoint)}
        min={0}
        max={LoadSetpointLimit}
        ends={["0", String(LoadSetpointLimit)]}
        step={LOAD_KNOB_STEP}
        onChange={loadRefusal === undefined ? turnKnob : undefined}
        size={110}
      />
      <input
        id="turbine-load-setpoint"
        className="board-input"
        type="number"
        min={0}
        max={LoadSetpointLimit}
        step={1}
        value={draft === "" ? turbine.loadSetpoint.toFixed(1) : draft}
        disabled={loadRefusal !== undefined}
        title={loadRefusal}
        onChange={(event) => {
          setDraft(event.target.value)
        }}
        onBlur={applyLoad}
        onKeyDown={(event) => {
          if (event.key === "Enter") applyLoad()
        }}
      />
      {loadRefusal !== undefined && <p className="board-lcd-msg">{loadRefusal}</p>}
    </div>
  )
}
