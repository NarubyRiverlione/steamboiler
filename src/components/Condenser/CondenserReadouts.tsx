import usePowerPlant from "../../context/PowerPlantContext"

const CondenserReadouts = () => {
  const {
    condenserState: { condenserTemperature, condensateReturnRate, condensateWaterVolume },
  } = usePowerPlant()
  return (
    <div className="readouts-panel">
      <h3>Condenser Status</h3>
      <div className="readout-item">
        <span className="label">Temperature:</span>
        <span className="value">{condenserTemperature.toFixed(1)} L/s</span>
      </div>
      <div className="readout-item">
        <span className="label">Volume:</span>
        <span className="value">{condensateWaterVolume.toFixed(1)} L</span>
      </div>
      <div className="readout-item">
        <span className="label">Return rate:</span>
        <span className="value">{condensateReturnRate.toFixed(1)} L</span>
      </div>
    </div>
  )
}

export default CondenserReadouts
