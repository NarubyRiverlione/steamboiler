import useBoiler from "../context/BoilerContext"
import { CstSimulation } from "../context/const"
import { calculateBoilingPoint } from "../utils/boilerCalculations"
import { getSteamData } from "../utils/steamTable" // Import getSteamData
import "./Boiler.css"

function Boiler() {
  const { state, increaseGasFlow, decreaseGasFlow, toggleFillValve, toggleDrainValve } = useBoiler()

  // Calculate vapor volume based on steam mass and specific volume
  const steamData = getSteamData(state.temperature)
  const specificVolume = steamData.specificVolume // m³/kg
  const vaporVolumeLiters = state.steamMass * specificVolume * 1000 // Convert m³ to L

  return (
    <div className="boiler-container">
      <div className="boiler-panel">
        <div className="water-level" style={{ height: `${String(state.waterVolume)}%` }}>
          <div className="bubbles"></div>
        </div>
        {state.temperature > calculateBoilingPoint(state.pressure) && (
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
                increaseGasFlow(CstSimulation.GasChangeRateFast)
              }}
            >
              +{CstSimulation.GasChangeRateFast} L/s
            </button>
            <button
              onClick={() => {
                increaseGasFlow(CstSimulation.GasChangeRateSlow)
              }}
            >
              +{CstSimulation.GasChangeRateSlow} L/s
            </button>
          </div>
          <div className="gas-flow-buttons">
            <button
              onClick={() => {
                decreaseGasFlow(CstSimulation.GasChangeRateSlow)
              }}
            >
              -{CstSimulation.GasChangeRateSlow} L/s
            </button>
            <button
              onClick={() => {
                decreaseGasFlow(CstSimulation.GasChangeRateFast)
              }}
            >
              {CstSimulation.GasChangeRateFast} L/s
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

      <div className="readouts-panel">
        <h3>Boiler Status</h3>
        <div className="readout-item">
          <span className="label">Gas Flow:</span>
          <span className="value">{state.gasFlow.toFixed(1)} L/s</span>
        </div>
        <div className="readout-item">
          <span className="label">Liquid Volume:</span> {/* Renamed */}
          <span className="value">{state.waterVolume.toFixed(1)} L</span>
        </div>
        <div className="readout-item">
          <span className="label">Vapor Volume:</span> {/* Updated calculation */}
          <span className="value">{vaporVolumeLiters.toFixed(1)} L</span>
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
          <span className="label">Boiling Point:</span>
          <span className="value">{calculateBoilingPoint(state.pressure).toFixed(1)} °C</span>
        </div>
        <div className="readout-item">
          <span className="label">Above Boiling:</span>
          <span className="value">{(state.temperature - calculateBoilingPoint(state.pressure)).toFixed(1)} °C</span>
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

export default Boiler
