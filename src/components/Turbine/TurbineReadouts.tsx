import usePowerPlant from "../../context/PowerPlantContext"
import { SpeedMode } from "../../context/PowerPlantState"
import useEMA from "../../utils/useEMA"
import Indicator from "../Indicator"
import Readout from "../Readout"

const speedModeLabels: Record<SpeedMode, string> = { free: "FREE", rampUp: "RAMP UP", hold: "HOLD" }

const TurbineReadouts = () => {
  const {
    state: {
      Turbine: { electricOutput, loadSetpoint, rpm, runUpPoint, speedMode, turbineSteamFlowOut, generatorBreaker, turbineTripped },
    },
  } = usePowerPlant()

  return (
    <div className="readouts-panel">
      <h3>Turbine Status</h3>
      <Readout title="Steam flow " value={useEMA(turbineSteamFlowOut, 0.05)} unit="kg/s" />
      <Readout title="Generator load" value={electricOutput} unit="MW" fixed={1} />
      <Readout title="Load setpoint" value={loadSetpoint} unit="MW" fixed={1} />
      <Readout title="Turbine speed" value={rpm} unit="RPM" fixed={0} />
      <Readout
        title="Run-up point"
        value={runUpPoint}
        unit="RPM"
        fixed={0}
        colored={speedMode !== "free"} // Highlight while the PID moves the valve
      />
      <div className="mode-indicator">
        <span>Mode: </span>
        <span className={speedMode === "free" ? "free-mode" : "hold-mode"}>{speedModeLabels[speedMode]}</span>
      </div>
      <div className="breaker-status">
        <span>Breaker: </span>
        <span className={generatorBreaker ? "breaker-closed" : "breaker-open"}>
          {generatorBreaker ? "CLOSED" : "OPEN"}
        </span>
      </div>
      <Indicator
        isActive={turbineTripped}
        title="Turbine tripped: condenser pressure rose above the vacuum limit"
        label="Turbine trip"
      />
    </div>
  )
}

export default TurbineReadouts
