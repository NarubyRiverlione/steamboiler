import usePowerPlant from "../../context/PowerPlantContext"
import useEMA from "../../utils/useEMA"
import Readout from "../Readout"

const TurbineReadouts = () => {
  const {
    state: {
      Turbine: { electricOutput, rpm, rpmSetPoint, holdMode, turbineSteamFlowOut },
    },
  } = usePowerPlant()

  return (
    <div className="readouts-panel">
      <h3>Turbine Status</h3>
      <Readout title="Steam flow " value={useEMA(turbineSteamFlowOut, 0.05)} unit="kg/s" />
      <Readout title="Generator output" value={electricOutput} unit="MW" />
      <Readout title="Turbine speed" value={rpm} unit="RPM" fixed={0} />
      <Readout
        title="RPM setpoint"
        value={rpmSetPoint}
        unit="RPM"
        fixed={0}
        colored={holdMode} // Highlight when in hold mode
      />
      <div className="mode-indicator">
        <span>Mode: </span>
        <span className={holdMode ? "hold-mode" : "free-mode"}>{holdMode ? "HOLD" : "FREE"}</span>
      </div>
    </div>
  )
}

export default TurbineReadouts
