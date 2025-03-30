import usePowerPlant from "../../context/PowerPlantContext"
import Indicator from "../Indicator"

const CondenserReadouts = () => {
  const {
    condenserState: {
      temperature,
      pressure,
      steamVolume,
      waterVolume,
      returnRate,
      intakeFlowRate,
      recirculationPumpFlowRate,
    },
  } = usePowerPlant()

  // Determine if pressure indicators should be active
  const isHighPressure = pressure > 70
  const isLowPressure = pressure < 40

  return (
    <div className="readouts-panel">
      <h3>Condenser Status</h3>

      <div className="readout-item">
        <span className="label">Pressure</span>
        <span className="value">{pressure.toFixed(1)} mBar</span>
        <div className="indicators-container">
          <Indicator isActive={isHighPressure} title="Pressure above 70 mBar" label="High" />
          <Indicator isActive={isLowPressure} title="Pressure below 40 mBar" label="Low" />
        </div>
      </div>

      <div className="readout-item">
        <span className="label">Intake flow</span>
        <span className="value">{intakeFlowRate.toFixed(2)} kg/s</span>
      </div>

      <div className="readout-item">
        <span className="label">Steam volume</span>
        <span className="value">{steamVolume.toFixed(1)} L</span>
      </div>

      <h3>Recirculation</h3>
      <div className="readout-item">
        <span className="label">Pump Flow Rate</span>
        <span className="value">{recirculationPumpFlowRate.toFixed(2)} kg/s</span>
      </div>

      <div className="readout-item">
        <span className="label">Water Level</span>
        <span className="value">{waterVolume.toFixed(2)}</span>
      </div>

      <div className="readout-item">
        <span className="label">Temperature</span>
        <span className="value">{temperature.toFixed(1)} °C</span>
      </div>
      <div className="readout-item">
        <span className="label">Return rate</span>
        <span className="value">{returnRate.toFixed(1)} L/s</span>
      </div>
    </div>
  )
}

export default CondenserReadouts
