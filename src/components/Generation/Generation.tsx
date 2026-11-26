/** The Generation page on the board: the generator breaker and the load setpoint, split out of the Turbine page (#134). */

import usePowerPlant from "../../context/PowerPlantContext"
import { netOutputOf } from "../../context/AuxiliaryLoad"
import { PanelFrame } from "../board/PanelFrame"
import { GenerationStatus } from "./GenerationStatus"
import { GeneratorBreakerGroup } from "./GeneratorBreakerGroup"
import { GeneratorLoadGroup } from "./GeneratorLoadGroup"

function Generation() {
  const {
    state,
    toggleGeneratorBreaker,
    setLoadSetpoint,
  } = usePowerPlant()
  const turbine = state.Turbine

  return (
    <PanelFrame title="Generation" status={<GenerationStatus turbine={turbine} netOutput={netOutputOf(state)} />}>
      <div className="board-generation-main">
        <GeneratorBreakerGroup turbine={turbine} onToggleBreaker={toggleGeneratorBreaker} />
        <GeneratorLoadGroup turbine={turbine} onSetLoadSetpoint={setLoadSetpoint} />
      </div>
    </PanelFrame>
  )
}

export default Generation
