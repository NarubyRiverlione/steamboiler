import { CstSimulation } from "../context/const"
import usePowerPlant from "../context/PowerPlantContext"

const MainStatsView = () => {
  const {
    boilerState: { waterVolume, pressure, deltaWaterVolume },
  } = usePowerPlant()
  const {
    CstBoiler: { TotalVolume },
  } = CstSimulation
  return (
    <div className="mainStats-container">
      <div className="mainState-component">
        <h5>Boiler</h5>
        <div className="mainState-readout-item">
          <span className="mainState-readout-item-label">Water Volume</span>
          <span className="mainState-readout-item-value">
            {(waterVolume / TotalVolume).toFixed(2)} - Δ {deltaWaterVolume.toFixed(0)} l
          </span>
        </div>

        <div className="mainState-readout-item">
          <span className="mainState-readout-item-label">Pressure</span>
          <span className="mainState-readout-item-value">
            {(pressure * 0.1).toFixed(1)} MPa - {pressure.toFixed(0)} bar
          </span>
        </div>
      </div>
    </div>
  )
}

export default MainStatsView
