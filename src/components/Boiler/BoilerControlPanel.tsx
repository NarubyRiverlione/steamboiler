import BoilerGasControl from "./BoilerGasControl"
import BoilerWaterControl from "./BoilerWaterControl"

const BoilerControlPanel = () => {
  return (
    <div className="controls-panel">
      <BoilerGasControl />
      <BoilerWaterControl />
    </div>
  )
}
export default BoilerControlPanel
