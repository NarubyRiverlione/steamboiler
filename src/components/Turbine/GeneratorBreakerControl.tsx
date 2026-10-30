import usePowerPlant from "../../context/PowerPlantContext"
import { CstSimulation } from "../../context/const"
import Indicator from "../Indicator"
import { isAtSyncSpeed } from "../../utils/turbineCalculations"

const { CstTurbine } = CstSimulation

const GeneratorBreakerControl = () => {
  const {
    state: {
      Turbine: { rpm, generatorBreaker },
    },
    toggleGeneratorBreaker,
  } = usePowerPlant()

  // Check if RPM is within the margin of sync speed to close the breaker
  const canCloseBreaker = isAtSyncSpeed(rpm)
  
  // Calculate RPM range for display
  const minRPM = CstTurbine.SyncRPM - CstTurbine.BreakerRPMMargin;
  const maxRPM = CstTurbine.SyncRPM + CstTurbine.BreakerRPMMargin;

  return (
    <div className="component-controls">
      <h3>Generator Breaker</h3>
      
      <div className="breaker-control">
        <div className="breaker-status-container">
          <button 
            className={`breaker-button ${generatorBreaker ? "closed" : "open"}`}
            onClick={toggleGeneratorBreaker}
            disabled={!generatorBreaker && !canCloseBreaker}
          >
            {generatorBreaker ? "Breaker Closed" : "Breaker Open"}
          </button>
          
          {/* Visual indicator for breaker status */}
          <Indicator
            isActive={canCloseBreaker && !generatorBreaker}
            label={"Ready to close"}
            title={`Breaker can be closed when RPM is between ${minRPM.toFixed(0)} and ${maxRPM.toFixed(0)}`}
          />
        </div>
        
        {!canCloseBreaker && !generatorBreaker && (
          <div className="breaker-warning">
            Breaker can only be closed when RPM is between {minRPM.toFixed(0)} and {maxRPM.toFixed(0)}
            <br />
            Current RPM: {rpm.toFixed(0)}
          </div>
        )}
        
        {/* RPM gauge visualization */}
        <div className="rpm-gauge-container">
          <div className="rpm-gauge">
            <div className="rpm-gauge-track"></div>
            <div 
              className="rpm-gauge-fill" 
              style={{ 
                width: `${String(Math.min(100, (rpm / CstTurbine.MaxRPM) * 100))}%`,
                backgroundColor: canCloseBreaker ? '#28a745' : '#dc3545'
              }}
            ></div>
            <div className="rpm-gauge-target" style={{ left: `${String((CstTurbine.SyncRPM / CstTurbine.MaxRPM) * 100)}%` }}></div>
            <div className="rpm-gauge-range" style={{ 
              left: `${String((minRPM / CstTurbine.MaxRPM) * 100)}%`,
              width: `${String(((maxRPM - minRPM) / CstTurbine.MaxRPM) * 100)}%`
            }}></div>
          </div>
          <div className="rpm-gauge-labels">
            <span>0</span>
            <span>{CstTurbine.MaxRPM}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GeneratorBreakerControl
