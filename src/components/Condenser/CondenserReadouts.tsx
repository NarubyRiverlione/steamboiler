import { CstSimulation } from "../../context/const"
import usePowerPlant from "../../context/PowerPlantContext"
import useEMA from "../../utils/useEMA"
import Indicator from "../Indicator"
import Readout from "../Readout"
const {
  CstCondenser: { TotalVolume, OptimalPressure, OptimalPressureBellWidth },
} = CstSimulation
const CondenserReadouts = () => {
  const {
    state: {
      Condenser: {
        deltaWaterVolume,
        pressure, // mbar
        steamMass,
        hotwellWaterVolume,
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
      <Readout title="Steam volume" value={steamMass} unit="l" />

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

      <Readout title="Intake flow" value={useEMA(intakeFlowRate, 0.01)} unit="kg/s" fixed={0} />

      <Readout
        title="Hotwell level"
        value={useEMA(hotwellWaterVolume / TotalVolume, 0.1)}
        unit=""
        fixed={1}
        delta={useEMA(deltaWaterVolume, 0.1)}
        deltaFixed={1}
      />

      <Readout title="Return flow" value={returnRate} unit="l" fixed={1} />
    </div>
  )
}

export default CondenserReadouts
