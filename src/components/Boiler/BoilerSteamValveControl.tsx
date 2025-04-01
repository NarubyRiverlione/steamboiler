import { CstSimulation } from "../../context/const"
import usePowerPlant from "../../context/PowerPlantContext"
import ValveSlider from "../ValveSlider"

const {
  CstBoiler: { MainSteamValveStep },
} = CstSimulation
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
        Value={`${steamFlowOut.toFixed(1)} kg/s`}
        Position={mainSteamValvePosition}
        Step={MainSteamValveStep}
        cbAdjust={adjustMainSteamValve}
      />
    </div>
  )
}

export default BoilerSteamValveControl
