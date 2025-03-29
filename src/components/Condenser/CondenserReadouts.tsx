import usePowerPlant from "../../context/PowerPlantContext"

const CondenserReadouts = () => {
  const {
    condenserState: { 
      condenserTemperature, 
      condensateReturnRate, 
      condensateWaterVolume,
      vacuum,
      isAirExtractionPumpEnabled,
      isSjaeEnabled,
      sjaeValvePosition
    },
  } = usePowerPlant()
  return (
    <div className="readouts-panel">
      <h3>Condenser Status</h3>
      <div className="readout-item">
        <span className="label">Temperature:</span>
        <span className="value">{condenserTemperature.toFixed(1)} °C</span>
      </div>
      <div className="readout-item">
        <span className="label">Volume:</span>
        <span className="value">{condensateWaterVolume.toFixed(1)} L</span>
      </div>
      <div className="readout-item">
        <span className="label">Return rate:</span>
        <span className="value">{condensateReturnRate.toFixed(1)} L/s</span>
      </div>
      <div className="readout-item">
        <span className="label">Vacuum:</span>
        <span className="value">{vacuum.toFixed(1)} mBar</span>
      </div>
      <div className="readout-item">
        <span className="label">Air Extraction Pump:</span>
        <span className="value">{isAirExtractionPumpEnabled ? "ON" : "OFF"}</span>
      </div>
      <div className="readout-item">
        <span className="label">SJAE:</span>
        <span className="value">{isSjaeEnabled ? "ENABLED" : "DISABLED"}</span>
      </div>
      <div className="readout-item">
        <span className="label">SJAE Valve Position:</span>
        <span className="value">{sjaeValvePosition}%</span>
      </div>
    </div>
  )
}

export default CondenserReadouts
