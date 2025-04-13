import { CstSimulation } from "../../context/const"
import usePowerPlant from "../../context/PowerPlantContext"
import Indicator from "../Indicator"
import ValveSlider from "../ValveSlider"

const {
  CstTurbine: { BypassValveStep, TurbineValveStep, MainSteamValveMinimumPressure },
} = CstSimulation
const SteamValveControl = () => {
  const {
    state: {
      Boiler: { pressure },
      Turbine: {
        mainSteamValve,
        bypassValvePosition,
        bypassSteamFlowOut,
        turbineValvePosition,
        turbineSteamFlowOut,
      },
    },
    toggleMainSteamValve,
    adjustBypassValve,
    adjustTurbineValve,
  } = usePowerPlant()

  return (
    <div className="component-controls">
      <h3>Steam Flow</h3>

      <div className="valve-buttons">
        <h4>Main Steam Valve</h4>
        <div style={{ display: "flex", flexDirection: "row", gap: "1rem" }}>
          <button
            className={`valve-button ${mainSteamValve ? "open" : "closed"}`}
            onClick={toggleMainSteamValve}
          >
            {mainSteamValve ? "Open" : "Closed"}
          </button>
          <Indicator
            isActive={pressure < MainSteamValveMinimumPressure}
            label={"Opening not possible"}
            title={`Main Steam Valve can only be opened if pressure is greater then ${(MainSteamValveMinimumPressure / 10).toFixed(1)} Mpa - ${MainSteamValveMinimumPressure.toFixed(0)} bar`}
          />
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

export default SteamValveControl
