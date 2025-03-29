import CondenserControlPanel from "./CondenserControlPanel"
import CondenserReadouts from "./CondenserReadouts"
import CondenserVisual from "./CondenserVisual"

const Condenser = () => {
  return (
    <>
      <h2>Condenser</h2>
      <div className="component-container">
        <CondenserVisual />
        <CondenserControlPanel />
        <CondenserReadouts />
      </div>
    </>
  )
}

export default Condenser
