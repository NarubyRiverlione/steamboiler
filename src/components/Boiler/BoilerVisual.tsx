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
  const water = (100 * waterVolume) / TotalVolume
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
