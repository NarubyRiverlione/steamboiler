import useBoiler from "../../context/BoilerContext"
import { calculateBoilingPoint } from "../../utils/boilerCalculations"

const BoilerVisual = () => {
  const {
    state: { waterVolume, temperature, pressure },
  } = useBoiler()

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
