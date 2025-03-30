import usePowerPlant from "../../context/PowerPlantContext"
import ValveSlider from "../ValveSlider"

const BoilerSteamValveControl = () => {
  const {
    boilerState: { mainSteamValvePosition, steamFlowOut },
    adjustMainSteamValve,
  } = usePowerPlant()

  return (
    <div className="component-controls">
      <h3>Main Steam Valve</h3>
      <div className="valve-status">
        <span className="label">Position:</span>
        <span className="value">{mainSteamValvePosition}% Open</span>
      </div>

      <ValveSlider
        Label="Steam Flow"
        Value={steamFlowOut}
        Position={mainSteamValvePosition}
        Step={10}
        cbAdjust={adjustMainSteamValve}
      />
    </div>
  )
}

export default BoilerSteamValveControl
