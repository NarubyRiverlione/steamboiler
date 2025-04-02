import usePowerPlant from "../context/PowerPlantContext"

const MainStatsView = () => {
  const {
    boilerState: { waterVolume, pressure },
  } = usePowerPlant()

  return (
    <div className="mainStats-container">
      <div className="mainState-component">
        <h5>Boiler</h5>
        <div className="mainState-readout-item">
          <span className="mainState-readout-item-label">Liquid Volume</span>
          <span className="mainState-readout-item-value">{waterVolume.toFixed(0)} L</span>
        </div>

        <div className="mainState-readout-item">
          <span className="mainState-readout-item-label">Pressure</span>
          <span className="mainState-readout-item-value">
            {(pressure * 0.1).toFixed(2)} MPa - {pressure.toFixed(1)} bar
          </span>
        </div>
      </div>
    </div>
  )
}

export default MainStatsView
