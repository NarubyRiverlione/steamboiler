/** The Turbine page on the board: it reads the plant state once and hands each group what it needs. */

import usePowerPlant from "../../context/PowerPlantContext"
import { PanelFrame } from "../board/PanelFrame"
import { GeneratorBreakerGroup } from "./GeneratorBreakerGroup"
import { GeneratorLoadGroup } from "./GeneratorLoadGroup"
import { SpeedControlGroup } from "./SpeedControlGroup"
import { SteamFlowGroup } from "./SteamFlowGroup"
import { TurbineStatus } from "./TurbineStatus"

function Turbine() {
  const {
    state: {
      Boiler: { pressure },
      Turbine: turbine,
    },
    toggleMainSteamValve,
    setSpeedMode,
    selectRunUpPoint,
    toggleGeneratorBreaker,
    setLoadSetpoint,
  } = usePowerPlant()

  return (
    <PanelFrame title="Turbine" status={<TurbineStatus turbine={turbine} />}>
      <div className="board-turbine-main">
        <SteamFlowGroup
          turbine={turbine}
          boilerPressure={pressure}
          onToggleMainSteamValve={toggleMainSteamValve}
        />
        <div className="board-stack">
          <SpeedControlGroup
            turbine={turbine}
            onSetSpeedMode={setSpeedMode}
            onSelectRunUpPoint={selectRunUpPoint}
          />
          <GeneratorLoadGroup turbine={turbine} onSetLoadSetpoint={setLoadSetpoint} />
        </div>
        <GeneratorBreakerGroup turbine={turbine} onToggleBreaker={toggleGeneratorBreaker} />
      </div>
    </PanelFrame>
  )
}

export default Turbine
