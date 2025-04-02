import { CstSimulation } from "../../context/const"
import usePowerPlant from "../../context/PowerPlantContext"
import Indicator from "../Indicator"

const CondenserReadouts = () => {
  const {
    condenserState: {
      deltaWaterVolume,
      pressure,
      steamVolume,
      hotwellWaterVolume: waterVolume,
      returnRate,
      intakeFlowRate,
    },
  } = usePowerPlant()

  const highPressureMPa =
    CstSimulation.CstCondenser.OptimalPressure + CstSimulation.CstCondenser.OptimalPressureBellWidth
  const lowPressureMPa =
    CstSimulation.CstCondenser.OptimalPressure - CstSimulation.CstCondenser.OptimalPressureBellWidth

  return (
    <div className="readouts-panel">
      {/* temporary visualization of steam in turbine */}
      <h3>Turbine</h3>
      <div className="readout-item">
        <span className="label">Steam volume</span>
        <span className="value">{steamVolume.toFixed(1)} l</span>
      </div>

      <h3>Condenser Status</h3>

      <div className="readout-item">
        <span className="label">Pressure</span>
        <div className="indicators-container">
          <Indicator
            isActive={pressure > highPressureMPa}
            title={`Pressure above ${highPressureMPa.toFixed(0)} mBar`}
            label="High"
          />
          <Indicator
            isActive={pressure < lowPressureMPa}
            title={`Pressure below ${lowPressureMPa.toFixed(0)} mBar`}
            label="Low"
          />
        </div>
        <br />
        <div className="indicators-container">
          <div className="value">{pressure.toFixed(1)} mBar</div>
        </div>
      </div>
      <div className="readout-item">
        <span className="label">Intake flow</span>
        <span className="value">{intakeFlowRate.toFixed(1)} kg/s</span>
      </div>

      <div className="readout-item">
        <span className="label">Hotwell Level</span>
        <span className="value">{waterVolume.toFixed(1)}</span>
      </div>

      <div className="readout-item">
        <span className="label">Change water volume</span>
        <span className="value">{deltaWaterVolume.toFixed(2)} l</span>
      </div>

      <div className="readout-item">
        <span className="label">Return rate</span>
        <span className="value">{returnRate.toFixed(1)} l/s</span>
      </div>
    </div>
  )
}

export default CondenserReadouts
