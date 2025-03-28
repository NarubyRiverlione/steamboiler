import useBoiler from "../../context/BoilerContext"

const BoilerWaterControl = () => {
  const {
    state: { fillValveOpen, drainValveOpen },
    toggleFillValve,
    toggleDrainValve,
  } = useBoiler()

  return (
    <div className="water-controls">
      <h3>Water Valve Control</h3>
      <div className="valve-buttons">
        <div>
          <h4>Fill Valve</h4>
          <button className={`valve-button ${fillValveOpen ? "open" : "closed"}`} onClick={toggleFillValve}>
            {fillValveOpen ? "Open" : "Closed"}
          </button>
        </div>
        <div>
          <h4>Drain Valve</h4>
          <button className={`valve-button ${drainValveOpen ? "open" : "closed"}`} onClick={toggleDrainValve}>
            {drainValveOpen ? "Open" : "Closed"}
          </button>
        </div>
      </div>
    </div>
  )
}
export default BoilerWaterControl
