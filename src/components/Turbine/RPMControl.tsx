import { CstSimulation } from "../../context/const"
import usePowerPlant from "../../context/PowerPlantContext"
import ValveSlider from "../ValveSlider"

const { CstTurbine } = CstSimulation

const RPMControl = () => {
  const {
    state: {
      Turbine: { rpmSetPoint, holdMode },
    },
    adjustRPMSetPoint,
    toggleHoldMode,
  } = usePowerPlant()

  return (
    <div className="component-controls">
      <h3>Turbine Speed Control</h3>
      
      <div className="mode-control">
        <h4>Control Mode</h4>
        <button 
          className={`mode-button ${holdMode ? "hold" : "free"}`}
          onClick={toggleHoldMode}
        >
          {holdMode ? "Hold Mode" : "Free Mode"}
        </button>
      </div>
      
      {/* Only show the slider when in hold mode */}
      {holdMode && (
        <ValveSlider
          Label="RPM Setpoint"
          Value={`${rpmSetPoint.toFixed(0)} RPM`}
          Position={rpmSetPoint / CstTurbine.MaxRPM} // Convert to 0-1 range
          Step={CstTurbine.RPMStep / CstTurbine.MaxRPM} // Convert to 0-1 range
          cbAdjust={(adjustment) => {
            adjustRPMSetPoint(adjustment * CstTurbine.MaxRPM);
          }}
        />
      )}
      {!holdMode && (
        <div className="disabled-control-message">
          <p>RPM setpoint control is only available in Hold Mode</p>
        </div>
      )}
    </div>
  )
}

export default RPMControl
