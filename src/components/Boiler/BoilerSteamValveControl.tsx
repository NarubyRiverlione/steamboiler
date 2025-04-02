import { CstSimulation } from "../../context/const"
import usePowerPlant from "../../context/PowerPlantContext"
import ValveSlider from "../ValveSlider"

const {
  CstBoiler: { BypassValveStep, TurbineValveStep },
} = CstSimulation
const BoilerSteamValveControl = () => {
  const {
    boilerState: {
      bypassValvePosition,
      turbineValvePosition,
      bypassSteamFlowOut,
      turbineSteamFlowOut,
      mainSteamValve,
    },
    adjustBypassValve,
    toggleMainSteamValve,
    adjustTurbineValve,
  } = usePowerPlant()

  return (
    <div className="component-controls">
      <h3>Steam Flow</h3>

      <div className="valve-buttons">
        <div>
          <h4>Main Steam Valve</h4>
          <button
            className={`valve-button ${mainSteamValve ? "open" : "closed"}`}
            onClick={toggleMainSteamValve}
          >
            {mainSteamValve ? "Open" : "Closed"}
          </button>
        </div>
      </div>

      <ValveSlider
        Label="Bypass Valve"
        Value={`${bypassSteamFlowOut.toFixed(1)} kg/s`}
        Position={bypassValvePosition}
        Step={BypassValveStep}
        cbAdjust={adjustBypassValve}
      />
      <ValveSlider
        Label="Turbine Valve"
        Value={`${turbineSteamFlowOut.toFixed(1)} kg/s`}
        Position={turbineValvePosition}
        Step={TurbineValveStep}
        cbAdjust={adjustTurbineValve}
      />
    </div>
  )
}

export default BoilerSteamValveControl
