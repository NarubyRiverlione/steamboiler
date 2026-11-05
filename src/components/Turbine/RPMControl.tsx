import { CstSimulation } from "../../context/const"
import usePowerPlant from "../../context/PowerPlantContext"
import { SpeedMode } from "../../context/PowerPlantState"
import { runUpPointRefusal, speedModeRefusal } from "../../utils/turbineCalculations"

const { CstTurbine } = CstSimulation

const modes: { mode: SpeedMode; label: string }[] = [
  { mode: "free", label: "Free" },
  { mode: "rampUp", label: "Ramp up" },
  { mode: "hold", label: "Hold" },
]

const RPMControl = () => {
  const { state, setSpeedMode, selectRunUpPoint } = usePowerPlant()
  const { Turbine } = state

  return (
    <div className="component-controls">
      <h3>Turbine Speed Control</h3>

      <div className="mode-control">
        <h4>Speed mode</h4>
        {modes.map(({ mode, label }) => {
          const refusal: string | undefined = speedModeRefusal(Turbine, mode)
          return (
            <button
              key={mode}
              className={`mode-button ${Turbine.speedMode === mode ? "hold" : "free"}`}
              disabled={refusal !== undefined}
              title={refusal}
              onClick={() => { setSpeedMode(mode); }}
            >
              {label}
            </button>
          )
        })}
      </div>

      <div className="mode-control">
        <h4>Run-up point</h4>
        {CstTurbine.RunUpPoints.map((point) => {
          const refusal: string | undefined = runUpPointRefusal(Turbine, point)
          return (
            <button
              key={point}
              className={`mode-button ${Turbine.runUpPoint === point ? "hold" : "free"}`}
              disabled={refusal !== undefined}
              title={refusal}
              onClick={() => { selectRunUpPoint(point); }}
            >
              {point} rpm
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default RPMControl
