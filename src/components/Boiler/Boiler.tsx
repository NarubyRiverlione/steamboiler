import "../simulator.css"
import BoilerVisual from "./BoilerVisual"
import BoilerControlPanel from "./BoilerControlPanel"
import BoilerReadouts from "./BoilerReadouts"

function Boiler() {
  return (
    <div className="component-container">
      <BoilerVisual />
      <BoilerControlPanel />
      <BoilerReadouts />
    </div>
  )
}

export default Boiler
