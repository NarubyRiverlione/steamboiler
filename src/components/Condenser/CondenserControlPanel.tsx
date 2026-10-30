import { CstSimulation } from "../../context/const"
import usePowerPlant from "../../context/PowerPlantContext"
import ValveSlider from "../ValveSlider"

const {
  CstCondenser: {
    SJAE_ValveStep,
    RecirculationPump_Step,
    CondensationPump_Step,
    RecirculationPump_MaxFlowRate,
    Makeup_Step,
    Makeup_MaxFlowRate,
    Reject_Step,
    Reject_MaxFlowRate,
  },
} = CstSimulation

const CondenserControlPanel = () => {
  const {
    state: {
      Condenser: {
        isAirExtractionPumpEnabled,
        isSjaeEnabled,
        sjaeValvePosition,
        recirculationPumpValvePosition,
        condensationPumpValvePosition,
        makeupValvePosition,
        rejectValvePosition,
      },
    },
    toggleAirExtractionPump,
    toggleSjae,
    adjustSjaeValvePosition,
    adjustRecirculationPumpValvePosition,
    adjustCondensationPumpValvePosition,
    adjustMakeupValvePosition,
    adjustRejectValvePosition,
  } = usePowerPlant()

  const recirculationPumpFlowRate = recirculationPumpValvePosition * RecirculationPump_MaxFlowRate
  return (
    <div className="controls-panel">
      <div className="component-controls">
        <h3>Pressure Control</h3>

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
            Position={sjaeValvePosition }
            Step={SJAE_ValveStep }
            cbAdjust={adjustSjaeValvePosition}
          />
        </div>
      </div>
      {/* Recirculation Pump Controls */}
      <div className="component-controls">
        <h3>Recirculation Pump</h3>

        <div className="control-section">
          <ValveSlider
            Label="Flow Rate:"
            Position={recirculationPumpValvePosition }
            Value={`${recirculationPumpFlowRate.toFixed(1)} l/s`}
            Step={RecirculationPump_Step }
            cbAdjust={adjustRecirculationPumpValvePosition}
          />
        </div>
      </div>
      {/* Condensation Pump Controls */}
      <div className="component-controls">
        <div className="control-section">
          <h3>Condensation Pump</h3>
          <ValveSlider
            Label="Flow Rate:"
            Position={condensationPumpValvePosition }
            Step={CondensationPump_Step }
            cbAdjust={adjustCondensationPumpValvePosition}
          />
        </div>
      </div>
      {/* Hotwell makeup (in from outside the loop) and reject (out to storage) */}
      <div className="component-controls">
        <h3>Hotwell Makeup &amp; Reject</h3>
        <div className="control-section">
          <ValveSlider
            Label="Makeup:"
            Position={makeupValvePosition}
            Value={`${(makeupValvePosition * Makeup_MaxFlowRate).toFixed(1)} l/s`}
            Step={Makeup_Step}
            cbAdjust={adjustMakeupValvePosition}
          />
          <ValveSlider
            Label="Reject:"
            Position={rejectValvePosition}
            Value={`${(rejectValvePosition * Reject_MaxFlowRate).toFixed(1)} l/s`}
            Step={Reject_Step}
            cbAdjust={adjustRejectValvePosition}
          />
        </div>
      </div>
    </div>
  )
}

export default CondenserControlPanel
