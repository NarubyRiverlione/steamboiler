import useBoiler from "../../context/BoilerContext"

const BoilerSteamValveControl = () => {
  const {
    state: { mainSteamValvePosition, steamFlowOut },
    adjustMainSteamValve,
  } = useBoiler()

  return (
    <div className="steam-valve-controls">
      <h3>Main Steam Valve</h3>
      <div className="valve-status">
        <span className="label">Position:</span>
        <span className="value">{mainSteamValvePosition}% Open</span>
      </div>

      <div className="valve-status">
        <span className="label">Steam Flow:</span>
        <span className="value">{steamFlowOut} g/s</span>
      </div>

      <div className="valve-slider">
        <button
          className="steam-valve-button"
          onClick={() => {
            adjustMainSteamValve(-10)
          }}
        >
          Close
        </button>
        <div className="valve-slider-container">
          <div className="valve-position-indicator" style={{ width: `${mainSteamValvePosition.toString()}%` }}></div>
        </div>
        <button
          className="steam-valve-button"
          onClick={() => {
            adjustMainSteamValve(10)
          }}
        >
          Open
        </button>
      </div>
    </div>
  )
}

export default BoilerSteamValveControl
