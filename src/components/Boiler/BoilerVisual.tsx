import { CstSimulation } from "../../context/const"
import usePowerPlant from "../../context/PowerPlantContext"
import { calculateBoilingPoint } from "../../utils/boilerCalculations"

const {
  CstBoiler: { TotalVolume },
} = CstSimulation
const BoilerVisual = () => {
  const {
    state: {
      Boiler: { waterVolume, temperature, pressure },
    },
  } = usePowerPlant()
  const water = Math.min(100, (100 * waterVolume) / TotalVolume) // a full drum that heats up can pass its volume (#33)
  return (
    <div className="boiler-panel">
      <div className="water-level" style={{ height: `${String(water)}%` }}>
        <div className="bubbles"></div>
      </div>
      {temperature > calculateBoilingPoint(pressure) && (
        <div className="steam">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="steam-particle"></div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BoilerVisual
