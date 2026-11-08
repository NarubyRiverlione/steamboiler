/** Generator Load group: the load setpoint knob (display only) and the field the setpoint is typed into. */

import { useState } from "react"
import { CstSimulation } from "../../context/const"
import { loadSetpointRefusal } from "../../utils/turbineCalculations"
import { Knob } from "../board/Knob"
import type { TurbineState } from "./types"

const {
  CstTurbine: { LoadSetpointLimit },
} = CstSimulation

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

  return (
    <div className="board-group">
      <h3 className="board-group-title">Generator Load</h3>
      <label className="board-readout-label" htmlFor="turbine-load-setpoint">
        Load setpoint (MW)
      </label>
      <Knob
        label="Load setpoint knob"
        value={turbine.loadSetpoint}
        min={0}
        max={LoadSetpointLimit}
        ends={["0", String(LoadSetpointLimit)]}
        note="MOCKUP"
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
