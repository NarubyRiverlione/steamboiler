/** The Turbine aux page on the board: the turbine auxiliaries, so the Turbine page stays for operating the turbine only (#160). The lube oil system and the turning gear (#163); gland steam (#147) follows. */

import usePowerPlant from "../../context/PowerPlantContext"
import { PanelFrame } from "../board/PanelFrame"
import { LubeOilGroup } from "./LubeOilGroup"
import { TurningGearGroup } from "./TurningGearGroup"

function TurbineAux() {
  const {
    state: { Oil: oil, Turbine: turbine },
    toggleOilPump,
    toggleTurningGear,
  } = usePowerPlant()

  return (
    <PanelFrame title="Turbine aux">
      <div className="board-turbine-aux-main">
        <LubeOilGroup oil={oil} onToggleOilPump={toggleOilPump} />
        <TurningGearGroup turbine={turbine} oil={oil} onToggleTurningGear={toggleTurningGear} />
      </div>
    </PanelFrame>
  )
}

export default TurbineAux
