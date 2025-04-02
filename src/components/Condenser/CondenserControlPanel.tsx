import { CstSimulation } from "../../context/const"
import usePowerPlant from "../../context/PowerPlantContext"
import ValveSlider from "../ValveSlider"

const {
  CstCondenser: {
    SJAE_ValveStep,
    RecirculationPump_Step,
    CondensationPump_Step,
    RecirculationPump_MaxFlowRate,
  },
} = CstSimulation

const CondenserControlPanel = () => {
  const {
    condenserState: {
      isAirExtractionPumpEnabled,
      isSjaeEnabled,
      sjaeValvePosition,
      recirculationPumpValvePosition,
      condensationPumpValvePosition,
    },
    toggleAirExtractionPump,
    toggleSjae,
    adjustSjaeValvePosition,
    adjustRecirculationPumpValvePosition,
    adjustCondensationPumpValvePosition,
  } = usePowerPlant()

  const recirculationPumpFlowRate = (recirculationPumpValvePosition / 100) * RecirculationPump_MaxFlowRate
  return (
    <div className="controls-panel">
      <h3>Condenser Control</h3>

      {/* Air Extraction Pump (CAR) Controls */}
      <div className="control-section">
        <h4>Air Extraction Pump (CAR)</h4>
        <button
          className={`toggle-button ${isAirExtractionPumpEnabled ? "enabled" : "disabled"}`}
          onClick={toggleAirExtractionPump}
        >
          {isAirExtractionPumpEnabled ? "STOP" : "START"}
        </button>
      </div>

      {/* Steam Jet Air Extraction (SJAE) Controls */}
      <div className="control-section">
        <h4>Steam Jet Air Extraction (SJAE)</h4>
        <button className={`toggle-button ${isSjaeEnabled ? "enabled" : "disabled"}`} onClick={toggleSjae}>
          {isSjaeEnabled ? "DISABLE" : "ENABLE"}
        </button>

        <ValveSlider
          Label="Position:"
          //  Value={steamFlowOut}
          Position={sjaeValvePosition}
          Step={SJAE_ValveStep}
          cbAdjust={adjustSjaeValvePosition}
        />
      </div>

      {/* Recirculation Pump Controls */}
      <div className="control-section">
        <h4>Recirculation Pump</h4>
        <ValveSlider
          Label="Flow Rate:"
          Position={recirculationPumpValvePosition * 100}
          Value={`${recirculationPumpFlowRate.toFixed(1)} l/s`}
          Step={RecirculationPump_Step}
          cbAdjust={adjustRecirculationPumpValvePosition}
        />
      </div>
      {/* Condensation Pump Controls */}
      <div className="control-section">
        <h4>Condensation Pump</h4>
        <ValveSlider
          Label="Flow Rate:"
          Position={condensationPumpValvePosition * 100}
          Step={CondensationPump_Step}
          cbAdjust={adjustCondensationPumpValvePosition}
        />
      </div>
    </div>
  )
}

export default CondenserControlPanel
