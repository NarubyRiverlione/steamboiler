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

      <ValveSlider
        Label="Steam Flow"
        Value={`${steamFlowOut.toFixed(1)} g/s`}
        Position={mainSteamValvePosition}
        Step={10}
        cbAdjust={adjustMainSteamValve}
      />
    </div>
  )
}

export default BoilerSteamValveControl
