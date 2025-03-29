import "../simulator.css"
import BoilerVisual from "./BoilerVisual"
import BoilerControlPanel from "./BoilerControlPanel"
import BoilerReadouts from "./BoilerReadouts"

function Boiler() {
  return (
    <>
      <h2>Boiler</h2>
      <div className="component-container">
        <BoilerVisual />
        <BoilerControlPanel />
        <BoilerReadouts />
      </div>
    </>
  )
}

export default Boiler
