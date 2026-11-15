/** The Turbine page on the board: it reads the plant state once and hands each group what it needs. */

import usePowerPlant from "../../context/PowerPlantContext"
import { PanelFrame } from "../board/PanelFrame"
import { SpeedControlGroup } from "./SpeedControlGroup"
import { SpeedGaugeGroup } from "./SpeedGaugeGroup"
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
  } = usePowerPlant()

  return (
    <PanelFrame title="Turbine" status={<TurbineStatus turbine={turbine} />}>
      <div className="board-turbine-main">
        <SteamFlowGroup
          turbine={turbine}
          boilerPressure={pressure}
          onToggleMainSteamValve={toggleMainSteamValve}
        />
        <SpeedControlGroup
          turbine={turbine}
          onSetSpeedMode={setSpeedMode}
          onSelectRunUpPoint={selectRunUpPoint}
        />
        <SpeedGaugeGroup turbine={turbine} />
      </div>
    </PanelFrame>
  )
}

export default Turbine
