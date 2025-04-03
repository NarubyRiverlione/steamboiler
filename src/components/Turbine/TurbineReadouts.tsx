import usePowerPlant from "../../context/PowerPlantContext"
import Readout from "../Readout"

const TurbineReadouts = () => {
  const {
    turbineState: { electricOutput },
  } = usePowerPlant()
  return (
    <div className="readouts-panel">
      <h3>Turbine Status</h3>
      <Readout title="Generator output" value={electricOutput} unit="MW" />
    </div>
  )
}

export default TurbineReadouts
