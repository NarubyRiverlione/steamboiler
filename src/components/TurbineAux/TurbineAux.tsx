/** The Turbine aux page on the board: the turbine auxiliaries, so the Turbine page stays for operating the turbine only (#160). The lube oil system and the turning gear (#163); gland steam (#164). */

import usePowerPlant from "../../context/PowerPlantContext"
import { PanelFrame } from "../board/PanelFrame"
import { GlandSteamGroup } from "./GlandSteamGroup"
import { LubeOilGroup } from "./LubeOilGroup"
import { isBusLive } from "../../context/AuxiliaryBus"
import { TurningGearGroup } from "./TurningGearGroup"

function TurbineAux() {
  const {
    state,
    toggleOilPump,
    toggleTurningGear,
    toggleGlandSteam,
  } = usePowerPlant()
  const { Oil: oil, Turbine: turbine, Condenser: condenser } = state

  return (
    <PanelFrame title="Turbine aux">
      <div className="board-turbine-aux-main">
        <LubeOilGroup oil={oil} onToggleOilPump={toggleOilPump} />
        <TurningGearGroup turbine={turbine} oil={oil} busLive={isBusLive(state)} onToggleTurningGear={toggleTurningGear} />
        <GlandSteamGroup turbine={turbine} condenser={condenser} onToggleGlandSteam={toggleGlandSteam} />
      </div>
    </PanelFrame>
  )
}

export default TurbineAux
