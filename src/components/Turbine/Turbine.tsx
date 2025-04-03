import TurbineControlPanel from "./TurbineControlPanel"
import TurbineReadouts from "./TurbineReadouts"
import TurbineVisualization from "./TurbineVisualization"

const Turbine = () => {
  return (
    <div className="component-container">
      <TurbineVisualization/>
      <TurbineControlPanel />
      <TurbineReadouts />
    </div>
  )
}

export default Turbine
