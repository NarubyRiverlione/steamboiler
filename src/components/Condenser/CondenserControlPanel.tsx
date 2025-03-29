import usePowerPlant from "../../context/PowerPlantContext"

const CondenserControlPanel = () => {
  const {
    condenserState: { isAirExtractionPumpEnabled, isSjaeEnabled, sjaeValvePosition },
    toggleAirExtractionPump,
    toggleSjae,
    adjustSjaeValvePosition
  } = usePowerPlant()

  return (
    <div className="controls-panel">
      <h3>Condenser Control</h3>
      
      {/* Air Extraction Pump (CAR) Controls */}
      <div className="control-section">
        <h4>Air Extraction Pump (CAR)</h4>
        <button 
          className={`toggle-button ${isAirExtractionPumpEnabled ? 'active' : ''}`}
          onClick={toggleAirExtractionPump}
        >
          {isAirExtractionPumpEnabled ? 'STOP' : 'START'}
        </button>
      </div>
      
      {/* Steam Jet Air Extraction (SJAE) Controls */}
      <div className="control-section">
        <h4>Steam Jet Air Extraction (SJAE)</h4>
        <button 
          className={`toggle-button ${isSjaeEnabled ? 'active' : ''}`}
          onClick={toggleSjae}
        >
          {isSjaeEnabled ? 'DISABLE' : 'ENABLE'}
        </button>
        
        <div className="valve-controls">
          <span>Valve Position: {sjaeValvePosition}%</span>
          <div className="button-group">
            <button 
              onClick={() => adjustSjaeValvePosition(-10)}
              disabled={sjaeValvePosition <= 0 || !isSjaeEnabled}
            >
              Close 10%
            </button>
            <button 
              onClick={() => adjustSjaeValvePosition(10)}
              disabled={sjaeValvePosition >= 100 || !isSjaeEnabled}
            >
              Open 10%
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CondenserControlPanel
