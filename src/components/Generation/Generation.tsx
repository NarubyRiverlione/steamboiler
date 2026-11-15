/** The Generation page on the board: the generator breaker and the load setpoint, split out of the Turbine page (#134). */

import usePowerPlant from "../../context/PowerPlantContext"
import { PanelFrame } from "../board/PanelFrame"
import { GenerationStatus } from "./GenerationStatus"
import { GeneratorBreakerGroup } from "./GeneratorBreakerGroup"
import { GeneratorLoadGroup } from "./GeneratorLoadGroup"

function Generation() {
  const {
    state: { Turbine: turbine },
    toggleGeneratorBreaker,
    setLoadSetpoint,
  } = usePowerPlant()

  return (
    <PanelFrame title="Generation" status={<GenerationStatus turbine={turbine} />}>
      <div className="board-generation-main">
        <GeneratorBreakerGroup turbine={turbine} onToggleBreaker={toggleGeneratorBreaker} />
        <GeneratorLoadGroup turbine={turbine} onSetLoadSetpoint={setLoadSetpoint} />
      </div>
    </PanelFrame>
  )
}

export default Generation
