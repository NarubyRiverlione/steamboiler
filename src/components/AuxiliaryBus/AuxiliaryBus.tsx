/** The Auxiliary bus page on the board (#142, ADR 0053): the grid supply breaker, the bus live lamp, the auxiliary load and the UPS group. */

import { useState } from "react"
import { isBusLive } from "../../context/AuxiliaryBus"
import usePowerPlant from "../../context/PowerPlantContext"
import { BreakerSwitch } from "../board/BreakerSwitch"
import { Display } from "../board/Display"
import { Lamp } from "../board/Lamp"
import { PanelFrame } from "../board/PanelFrame"
import { UpsGroup } from "./UpsGroup"

function AuxiliaryBus() {
  const { state, toggleGridSupplyBreaker, toggleUpsBreaker } = usePowerPlant()
  const [coverLifted, setCoverLifted] = useState<boolean>(false)
  return (
    <PanelFrame title="Auxiliary bus">
      <div className="board-page-groups">
        <div className="board-group">
          <h3 className="board-group-title">Grid Supply Breaker</h3>
          <BreakerSwitch
            label="Grid supply breaker"
            plate="Grid supply"
            rating="6.0 kV · CB-A1"
            on={state.gridSupplyBreaker}
            onToggle={toggleGridSupplyBreaker}
            guard={{
              lifted: coverLifted,
              onToggleCover: () => {
                setCoverLifted(!coverLifted)
              },
            }}
          />
          <Lamp lit={isBusLive(state)} tone="ok" label="Auxiliary bus live" title="Lit while a breaker feeds the bus" />
          <div className="board-readout">
            <span>Auxiliary load</span>
            <Display label="Auxiliary load" text={`${state.auxiliaryLoad.toFixed(1)} MW`} widest="99.9 MW" />
          </div>
        </div>
        <UpsGroup state={state} onToggleUpsBreaker={toggleUpsBreaker} />
      </div>
    </PanelFrame>
  )
}

export default AuxiliaryBus
