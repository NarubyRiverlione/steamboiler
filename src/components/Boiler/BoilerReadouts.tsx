import { useState } from "react"
import usePowerPlant from "../../context/PowerPlantContext"
import { CstSimulation } from "../../context/const"
import Readout from "../Readout"
import useEMA from "../../utils/useEMA"

const BoilerReadouts = () => {
  const {
    state: {
      Boiler: { gasFlow, waterVolume, temperature, pressure, energyDelta, steamMass, deltaSteamMass, energy },
    },
  } = usePowerPlant()

  const {
    CstBoiler: { TotalVolume },
  } = CstSimulation

  const [advancedExpanded, setAdvancedExpanded] = useState(false)
  const toggleAdvanced = () => {
    setAdvancedExpanded(!advancedExpanded)
  }

  return (
    <div className="readouts-panel">
      <h3>Boiler Status</h3>

      <Readout title="Gas flow" value={gasFlow} unit="l/s" />

      <Readout
        title="Water volume"
        value={waterVolume}
        unit={`l ${(waterVolume / TotalVolume).toFixed(2)}`}
      />

      <Readout title="Temperature" value={temperature} unit="°C" fixed={1} />

      <Readout title="Pressure" value={useEMA(pressure, 0.01)} unit="bar" fixed={1} />

      <Readout title="Energy Change" value={useEMA(energyDelta / 1e3, 0.01)} unit="MJ/s" colored />

      <div className="advanced-section">
        <h3 className="advanced-toggle" onClick={toggleAdvanced}>
          {advancedExpanded ? "▼" : "▶"} Advanced
        </h3>

        {advancedExpanded && (
          <div className="advanced-content">
            <Readout
              title="Steam Mass"
              value={steamMass}
              unit="kg"
              delta={deltaSteamMass}
              fixed={1}
              deltaFixed={2}
            />
            <Readout title="Energy" value={energy / 1e3} unit="MJ" fixed={1} />

            {/* <div className="readout-item">
              <span className="label">Boiling Point</span>
              <span className="value">{calculateBoilingPoint(pressure).toFixed(1)} °C</span>
            </div>
            <div className="readout-item">
              <span className="label">Above Boiling</span>
              <span className="value">{(temperature - calculateBoilingPoint(pressure)).toFixed(1)} °C</span>
            </div>
            <div className="readout-item">
              <span className="label">Steam Removal</span>
              <span className="value">
                {((BypassValvePosition / 100) * MaxSteamRemovalRate).toFixed(1)} kg/h
              </span>
            </div> */}
          </div>
        )}
      </div>
    </div>
  )
}

export default BoilerReadouts
