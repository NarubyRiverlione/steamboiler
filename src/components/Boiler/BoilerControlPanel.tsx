import BoilerGasControl from "./BoilerGasControl"
import BoilerSteamValveControl from "./BoilerSteamValveControl"
import BoilerWaterControl from "./BoilerWaterControl"

const BoilerControlPanel = () => {
  return (
    <div className="controls-panel">
      <BoilerGasControl />
      <BoilerWaterControl />
      <BoilerSteamValveControl />
    </div>
  )
}
export default BoilerControlPanel
