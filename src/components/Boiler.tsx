import { useBoiler } from "../context/BoilerContext"
import "./Boiler.css"

export function Boiler() {
  const { state, increaseGasFlow, decreaseGasFlow, toggleFillValve, toggleDrainValve } = useBoiler()

  return (
    <div className="boiler-container">
      <div className="boiler-visualization">
        <div className="water-level" style={{ height: `${String(state.waterVolume)}%` }}>
          <div className="bubbles"></div>
        </div>
        {state.steamRate > 0 && (
          <div className="steam">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="steam-particle"></div>
            ))}
          </div>
        )}
      </div>

      <div className="controls-panel">
        <div className="gas-controls">
          <h3>Gas Flow Control</h3>
          <div className="gas-flow-buttons">
            <button
              onClick={() => {
                increaseGasFlow(0.5)
              }}
            >
              +0.5 L/s
            </button>
            <button
              onClick={() => {
                increaseGasFlow(0.25)
              }}
            >
              +0.25 L/s
            </button>
          </div>
          <div className="gas-flow-buttons">
            <button
              onClick={() => {
                decreaseGasFlow(0.25)
              }}
            >
              -0.25 L/s
            </button>
            <button
              onClick={() => {
                decreaseGasFlow(0.5)
              }}
            >
              -0.5 L/s
            </button>
          </div>
        </div>

        <div className="water-controls">
          <h3>Water Valve Control</h3>
          <div className="valve-buttons">
            <div>
              <h4>Fill Valve</h4>
              <button className={`valve-button ${state.fillValveOpen ? "open" : "closed"}`} onClick={toggleFillValve}>
                {state.fillValveOpen ? "Open" : "Closed"}
              </button>
            </div>
            <div>
              <h4>Drain Valve</h4>
              <button className={`valve-button ${state.drainValveOpen ? "open" : "closed"}`} onClick={toggleDrainValve}>
                {state.drainValveOpen ? "Open" : "Closed"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="readouts">
        <h3>Boiler Status</h3>
        <div className="readout-item">
          <span className="label">Gas Flow:</span>
          <span className="value">{state.gasFlow.toFixed(1)} L/s</span>
        </div>
        <div className="readout-item">
          <span className="label">Water Volume:</span>
          <span className="value">{state.waterVolume.toFixed(1)} L</span>
        </div>
        <div className="readout-item">
          <span className="label">Temperature:</span>
          <span className="value">{state.temperature.toFixed(1)} °C</span>
        </div>
        <div className="readout-item">
          <span className="label">Pressure:</span>
          <span className="value">{state.pressure.toFixed(1)} bar</span>
        </div>
        <div className="readout-item">
          <span className="label">Steam Generation:</span>
          <span className="value">{(state.steamRate * 1000).toFixed(1)} g/s</span>
        </div>
        <div className="readout-item">
          <span className="label">Steam Production:</span>
          <span className="value">{(state.steamRate * 3600).toFixed(1)} kg/h</span>
        </div>
        <div className="readout-item">
          <span className="label">Energy:</span>
          <span className="value">{state.energy.toFixed(1)} kJ</span>
        </div>
        <div className="readout-item">
          <span className="label">Energy Change:</span>
          <span className={`value ${state.energyDelta > 0 ? "positive" : state.energyDelta < 0 ? "negative" : ""}`}>
            {state.energyDelta > 0 ? "+" : ""}
            {state.energyDelta.toFixed(1)} kJ/s
          </span>
        </div>
      </div>
    </div>
  )
}
