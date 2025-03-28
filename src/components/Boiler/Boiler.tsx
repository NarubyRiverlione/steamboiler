import "./Boiler.css"
import BoilerVisual from "./BoilerVisual"
import BoilerControlPanel from "./BoilerControlPanel"
import BoilerReadouts from "./BoilerReadouts"

function Boiler() {
  return (
    <div className="boiler-container">
      <BoilerVisual />
      <BoilerControlPanel />
      <BoilerReadouts />
    </div>
  )
}

export default Boiler
