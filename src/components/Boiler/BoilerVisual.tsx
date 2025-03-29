import usePowerPlant from "../../context/PowerPlantContext"
import { calculateBoilingPoint } from "../../utils/boilerCalculations"

const BoilerVisual = () => {
  const {
    boilerState: { waterVolume, temperature, pressure },
  } = usePowerPlant()

  return (
    <div className="boiler-panel">
      <div className="water-level" style={{ height: `${String(waterVolume)}%` }}>
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
