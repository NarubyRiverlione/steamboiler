import { useState } from "react"
import usePowerPlant from "../../context/PowerPlantContext"
import { CstSimulation } from "../../context/const"
import { calculateBoilingPoint } from "../../utils/boilerCalculations"
import { getSteamData } from "../../utils/steamTable"
import ShowAverage from "../ShowAverage"
const BoilerReadouts = () => {
  const {
    boilerState: {
      gasFlow,
      waterVolume,
      temperature,
      pressure,
      energyDelta,
      steamMass,
      energy,
      mainSteamValvePosition,
      deltaWaterVolume,
    },
  } = usePowerPlant()

  const {
    CstBoiler: { MaxSteamRemovalRate },
  } = CstSimulation
  // Calculate vapor volume based on steam mass and specific volume
  const steamData = getSteamData(temperature)
  const specificVolume = steamData.specificVolume // m³/kg
  const vaporVolumeLiters = steamMass * specificVolume * 1000 // Convert m³ to L

  const [advancedExpanded, setAdvancedExpanded] = useState(false)
  const toggleAdvanced = () => {
    setAdvancedExpanded(!advancedExpanded)
  }
  const average = 100
  return (
    <div className="readouts-panel">
      <h3>Boiler Status</h3>
      <div className="readout-item">
        <span className="label">Gas Flow</span>
        <span className="value">{gasFlow.toFixed(1)} L/s</span>
      </div>
      <div className="readout-item">
        <span className="label">Liquid Volume</span>
        <span className="value">{waterVolume.toFixed(1)} L</span>
      </div>
      <div className="readout-item">
        <span className="label">Vapor Volume</span>
        <span className="value">{vaporVolumeLiters.toFixed(1)} L</span>
      </div>
      <div className="readout-item">
        <span className="label">Temperature</span>
        <span className="value">
          <ShowAverage newValue={temperature} averageCount={average} /> °C
        </span>
      </div>
      <div className="readout-item">
        <span className="label">Pressure</span>
        <span className="value">{pressure.toFixed(1)} bar</span>
      </div>
      <div className="readout-item">
        <span className="label">Energy Change</span>
        <span className={`value ${energyDelta > 0 ? "positive" : energyDelta < 0 ? "negative" : ""}`}>
          {energyDelta > 0 ? "+" : ""}
          <ShowAverage newValue={energyDelta / 1e3} averageCount={average} /> MJ/s
        </span>
      </div>

      <div className="advanced-section">
        <h3 className="advanced-toggle" onClick={toggleAdvanced}>
          Advanced {advancedExpanded ? "▼" : "▶"}
        </h3>

        {advancedExpanded && (
          <div className="advanced-content">
            <div className="readout-item">
              <span className="label">Energy</span>
              <span className="value">{(energy / 1e3).toFixed(1)} MJ</span>
            </div>
            <div className="readout-item">
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
                {((mainSteamValvePosition / 100) * MaxSteamRemovalRate).toFixed(1)} kg/h
              </span>
            </div>
            <div className="readout-item">
              <span className="label">Change water volume</span>
              <span className="value">
                <ShowAverage newValue={deltaWaterVolume} averageCount={average} /> l
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BoilerReadouts
