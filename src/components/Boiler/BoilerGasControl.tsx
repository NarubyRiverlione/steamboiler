import usePowerPlant from "../../context/PowerPlantContext"
import { CstSimulation } from "../../context/const"
const { CstBoiler } = CstSimulation

const BoilerGasControl = () => {
  const { increaseGasFlow, decreaseGasFlow } = usePowerPlant()
  return (
    <div className="component-controls">
      <h3>Gas Flow Control</h3>
      <div className="gas-flow-buttons">
        <button
          onClick={() => {
            increaseGasFlow(CstBoiler.GasChangeRateFast)
          }}
        >
          + {CstBoiler.GasChangeRateFast} L/s
        </button>
        <button
          onClick={() => {
            increaseGasFlow(CstBoiler.GasChangeRateSlow)
          }}
        >
          + {CstBoiler.GasChangeRateSlow} L/s
        </button>
      </div>
      <div className="gas-flow-buttons">
        <button
          onClick={() => {
            decreaseGasFlow(CstBoiler.GasChangeRateSlow)
          }}
        >
          - {CstBoiler.GasChangeRateSlow} L/s
        </button>
        <button
          onClick={() => {
            decreaseGasFlow(CstBoiler.GasChangeRateFast)
          }}
        >
          - {CstBoiler.GasChangeRateFast} L/s
        </button>
      </div>
    </div>
  )
}

export default BoilerGasControl
