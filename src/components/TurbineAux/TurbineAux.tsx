/** The Turbine aux page on the board: the turbine auxiliaries, so the Turbine page stays for operating the turbine only (#160). The lube oil system first; turning gear (#146) and gland steam (#147) follow. */

import usePowerPlant from "../../context/PowerPlantContext"
import { PanelFrame } from "../board/PanelFrame"
import { LubeOilGroup } from "./LubeOilGroup"

function TurbineAux() {
  const {
    state: { Oil: oil },
    toggleOilPump,
  } = usePowerPlant()

  return (
    <PanelFrame title="Turbine aux">
      <div className="board-turbine-aux-main">
        <LubeOilGroup oil={oil} onToggleOilPump={toggleOilPump} />
      </div>
    </PanelFrame>
  )
}

export default TurbineAux
