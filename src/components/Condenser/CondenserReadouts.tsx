import usePowerPlant from "../../context/PowerPlantContext"
import Indicator from "../Indicator"

const CondenserReadouts = () => {
  const {
    condenserState: { 
      condenserTemperature, 
      condensateReturnRate, 
      condensateWaterVolume, 
      pressure,
      hotwellLevel,
      hotwellToCondenserFlowRate,
      recirculationPumpFlowRate,
      condenserSteamVolume,
      condenserLiquidVolume
    },
  } = usePowerPlant()

  // Determine if pressure indicators should be active
  const isHighPressure = pressure > 70
  const isLowPressure = pressure < 40

  return (
    <div className="readouts-panel">
      <h3>Condenser Status</h3>
      <div className="readout-item">
        <span className="label">Temperature</span>
        <span className="value">{condenserTemperature.toFixed(1)} °C</span>
      </div>
      <div className="readout-item">
        <span className="label">Volume</span>
        <span className="value">{condensateWaterVolume.toFixed(1)} L</span>
      </div>
      <div className="readout-item">
        <span className="label">Return rate</span>
        <span className="value">{condensateReturnRate.toFixed(1)} L/s</span>
      </div>
      <div className="readout-item">
        <span className="label">Pressure</span>
        <span className="value">{pressure.toFixed(1)} mBar</span>
        <div className="indicators-container">
          <Indicator isActive={isHighPressure} title="Pressure above 70 mBar" label="High" />
          <Indicator isActive={isLowPressure} title="Pressure below 40 mBar" label="Low" />
        </div>
      </div>

      <h3>Hotwell Status</h3>
      <div className="readout-item">
        <span className="label">Hotwell Level</span>
        <span className="value">{hotwellLevel.toFixed(2)}</span>
      </div>
      <div className="readout-item">
        <span className="label">Flow to Condenser</span>
        <span className="value">{hotwellToCondenserFlowRate.toFixed(2)} kg/s</span>
      </div>

      <h3>Recirculation</h3>
      <div className="readout-item">
        <span className="label">Pump Flow Rate</span>
        <span className="value">{recirculationPumpFlowRate.toFixed(2)} kg/s</span>
      </div>

      <h3>Condenser Volumes</h3>
      <div className="readout-item">
        <span className="label">Steam Volume</span>
        <span className="value">{condenserSteamVolume.toFixed(2)} L</span>
      </div>
      <div className="readout-item">
        <span className="label">Liquid Volume</span>
        <span className="value">{condenserLiquidVolume.toFixed(2)} L</span>
      </div>
    </div>
  )
}

export default CondenserReadouts
