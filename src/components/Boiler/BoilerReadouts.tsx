import { useState } from "react"
import usePowerPlant from "../../context/PowerPlantContext"
import { CstSimulation } from "../../context/const"
import { getSteamData } from "../../utils/steamTable"
import Readout from "../Readout"
// import ShowAverage from "../ShowAverage"
const BoilerReadouts = () => {
  const {
    boilerState: {
      gasFlow,
      waterVolume,
      temperature,
      pressure,
      energyDelta,
      steamMass,
      deltaSteamMass,
      energy,
    },
  } = usePowerPlant()

  const {
    CstBoiler: { TotalVolume },
  } = CstSimulation
  // Calculate vapor volume based on steam mass and specific volume
  const steamData = getSteamData(temperature)
  const specificVolume = steamData.specificVolume // m³/kg
  const vaporVolumeLiters = steamMass * specificVolume * 1000 // Convert m³ to L

  const [advancedExpanded, setAdvancedExpanded] = useState(false)
  const toggleAdvanced = () => {
    setAdvancedExpanded(!advancedExpanded)
  }
  // const average = 100
  return (
    <div className="readouts-panel">
      <h3>Boiler Status</h3>

      <Readout title="Gas flow" value={gasFlow} unit="l/s" />

      <Readout
        title="Water volume"
        value={waterVolume}
        unit={`l/s ${(waterVolume / TotalVolume).toFixed(2)}`}
      />

      <Readout title="Temperature" value={temperature} unit="°C" fixed={1} />

      <Readout title="Pressure" value={pressure * 0.1} unit="MPa" fixed={2} />

      <Readout title="Energy Change" value={energyDelta / 1e3} unit="MJ/s" colored />

      <div className="advanced-section">
        <h3 className="advanced-toggle" onClick={toggleAdvanced}>
          {advancedExpanded ? "▼" : "▶"} Advanced
        </h3>

        {advancedExpanded && (
          <div className="advanced-content">
            <Readout title="Steam Volume" value={vaporVolumeLiters} unit="L" delta={deltaSteamMass} />
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
