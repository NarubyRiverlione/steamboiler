import usePowerPlant from "../../context/PowerPlantContext"
import { CstSimulation } from "../../context/const"

const BoilerGasControl = () => {
  const { increaseGasFlow, decreaseGasFlow } = usePowerPlant()
  return (
    <div className="gas-controls">
      <h3>Gas Flow Control</h3>
      <div className="gas-flow-buttons">
        <button
          onClick={() => {
            increaseGasFlow(CstSimulation.GasChangeRateFast)
          }}
        >
          + {CstSimulation.GasChangeRateFast} L/s
        </button>
        <button
          onClick={() => {
            increaseGasFlow(CstSimulation.GasChangeRateSlow)
          }}
        >
          + {CstSimulation.GasChangeRateSlow} L/s
        </button>
      </div>
      <div className="gas-flow-buttons">
        <button
          onClick={() => {
            decreaseGasFlow(CstSimulation.GasChangeRateSlow)
          }}
        >
          - {CstSimulation.GasChangeRateSlow} L/s
        </button>
        <button
          onClick={() => {
            decreaseGasFlow(CstSimulation.GasChangeRateFast)
          }}
        >
          - {CstSimulation.GasChangeRateFast} L/s
        </button>
      </div>
    </div>
  )
}

export default BoilerGasControl
