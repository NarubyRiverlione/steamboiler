import usePowerPlant from "../../context/PowerPlantContext"
import Indicator from "../Indicator"

const CondenserReadouts = () => {
  const {
    condenserState: {
      temperature,
      pressure,
      steamVolume,
      hotwellWaterVolume: waterVolume,
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
      {/* temporary visualization of steam in turbine */}
      <h3>Turbine</h3>
      <div className="readout-item">
        <span className="label">Steam volume</span>
        <span className="value">{steamVolume.toFixed(1)} L</span>
      </div>

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
        <span className="value">{(intakeFlowRate * 3.6).toFixed(2)} kg/h</span>
      </div>

      <div className="readout-item">
        <span className="label">Hotwell Level</span>
        <span className="value">{waterVolume.toFixed(2)}</span>
      </div>

      <div className="readout-item">
        <span className="label">Return rate</span>
        <span className="value">{returnRate.toFixed(1)} L/s</span>
      </div>

      <h3>Recirculation</h3>
      <div className="readout-item">
        <span className="label">Pump Flow Rate</span>
        <span className="value">{recirculationPumpFlowRate.toFixed(2)} kg/s</span>
      </div>
    </div>
  )
}

export default CondenserReadouts
