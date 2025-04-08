import { CstSimulation } from "../../context/const"
import usePowerPlant from "../../context/PowerPlantContext"
import Indicator from "../Indicator"
import Readout from "../Readout"
const {
  CstCondenser: { OptimalPressure, OptimalPressureBellWidth },
} = CstSimulation
const CondenserReadouts = () => {
  const {
    state: {
      Condenser: {
        deltaWaterVolume,
        pressure, // mbar
        steamMass: steamVolume,
        hotwellWaterVolume: waterVolume,
        returnRate,
        intakeFlowRate,
      },
    },
  } = usePowerPlant()

  const highPressure_mPa = OptimalPressure + OptimalPressureBellWidth
  const lowPressure_mPa = OptimalPressure - OptimalPressureBellWidth

  return (
    <div className="readouts-panel">
      <h3>Condenser Status</h3>
      <Readout title="Steam volume" value={steamVolume} unit="l" />

      <div className="readout-container">
        <div className="readout-item">
          <span className="label">Pressure</span>
          <Indicator
            isActive={pressure > highPressure_mPa}
            title={`Pressure above ${highPressure_mPa.toFixed(0)} mBar`}
            label="High"
          />
          <Indicator
            isActive={pressure < lowPressure_mPa}
            title={`Pressure below ${lowPressure_mPa.toFixed(0)} mBar`}
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
        fixed={0}
        delta={deltaWaterVolume}
        deltaFixed={1}
      />

      <Readout title="Return flow" value={returnRate} unit="l" fixed={1} />
    </div>
  )
}

export default CondenserReadouts
