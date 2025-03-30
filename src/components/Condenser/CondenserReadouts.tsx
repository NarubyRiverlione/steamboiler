import usePowerPlant from "../../context/PowerPlantContext"
import Indicator from "../Indicator"

const CondenserReadouts = () => {
  const {
    condenserState: { condenserTemperature, condensateReturnRate, condensateWaterVolume, pressure },
  } = usePowerPlant()
  
  // Determine if pressure indicators should be active
  const isHighPressure = pressure > 70
  const isLowPressure = pressure < 40
  
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
        <span className="label">Pressure:</span>
        <span className="value">{pressure.toFixed(1)} mBar</span>
        <div className="indicators-container">
          <Indicator 
            isActive={isHighPressure} 
            title="Pressure above 70 mBar"
            label="High" 
          />
          <Indicator 
            isActive={isLowPressure} 
            title="Pressure below 40 mBar"
            label="Low" 
          />
        </div>
      </div>
    </div>
  )
}

export default CondenserReadouts
