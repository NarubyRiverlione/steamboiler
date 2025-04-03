import { CstSimulation } from "../../context/const"
import usePowerPlant from "../../context/PowerPlantContext"
import Indicator from "../Indicator"
import Readout from "../Readout"

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
      <h3>Condenser Status</h3>
      <Readout title="Steam volume" value={steamVolume} unit="l" />

      <div className="readout-container">
        <div className="readout-item">
          <span className="label">Pressure</span>
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
        <div className="readout-right">
          <div className="value">{pressure.toFixed(0)} mBar</div>
        </div>
      </div>

      <Readout title="Intake flow" value={intakeFlowRate} unit="kg/s" fixed={1} />

      <Readout
        title="Hotwell level"
        value={waterVolume}
        unit="l"
        fixed={1}
        delta={deltaWaterVolume}
        deltaFixed={1}
      />

      <Readout title="Return flow" value={returnRate} unit="l" fixed={1} />
    </div>
  )
}

export default CondenserReadouts
