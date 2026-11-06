import { useState } from "react"
import usePowerPlant from "../../context/PowerPlantContext"
import { loadSetpointRefusal, ratedOutputMW } from "../../utils/turbineCalculations"

const LoadControl = () => {
  const {
    state: { Turbine },
    setLoadSetpoint,
  } = usePowerPlant()
  const [draft, setDraft] = useState<string>("")
  const refusal: string | undefined = loadSetpointRefusal(Turbine)

  // The field shows the setpoint while it is not being typed in
  const apply = (): void => {
    const value = Number(draft)
    if (draft !== "" && Number.isFinite(value)) setLoadSetpoint(value)
    setDraft("")
  }

  return (
    <div className="component-controls">
      <h3>Generator Load</h3>
      <div className="mode-control">
        <h4>Load setpoint (MW)</h4>
        <input
          type="number"
          min={0}
          max={ratedOutputMW}
          step={1}
          value={draft === "" ? Turbine.loadSetpoint.toFixed(1) : draft}
          disabled={refusal !== undefined}
          title={refusal}
          onChange={(event) => { setDraft(event.target.value); }}
          onBlur={apply}
          onKeyDown={(event) => { if (event.key === "Enter") apply() }}
        />
      </div>
      {refusal && <div className="breaker-warning">{refusal}</div>}
    </div>
  )
}

export default LoadControl
