/** The Auxiliary bus page on the board (#142, ADR 0053): the grid supply breaker, the unit aux breaker (#189) with its Ready to close permissive lamp (#204, ADR 0054: no message line), the bus live lamp, and the auxiliary load. The UPS and the Vital/Safety breakers are on the Emergency power page (#196). */

import { useState } from "react"
import { isBusLive } from "../../context/AuxiliaryBus"
import { isAtSyncSpeed, unitAuxBreakerCloseRefusal } from "../../utils/turbineCalculations"
import usePowerPlant from "../../context/PowerPlantContext"
import { BreakerSwitch } from "../board/BreakerSwitch"
import { Display } from "../board/Display"
import { Lamp } from "../board/Lamp"
import { PanelFrame } from "../board/PanelFrame"

function AuxiliaryBus() {
  const { state, toggleGridSupplyBreaker, toggleUnitAuxBreaker } = usePowerPlant()
  const [coverLifted, setCoverLifted] = useState<boolean>(false)
  const [unitAuxCoverLifted, setUnitAuxCoverLifted] = useState<boolean>(false)
  const unitAuxRefusal: string | undefined = unitAuxBreakerCloseRefusal(state.Turbine)
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
        </div>
        <div className="board-group">
          <h3 className="board-group-title">Unit Aux Breaker</h3>
          <BreakerSwitch
            label="Unit aux breaker"
            plate="Unit aux"
            rating="6.0 kV · CB-A2"
            on={state.Turbine.unitAuxBreaker}
            onToggle={toggleUnitAuxBreaker}
            disabled={unitAuxRefusal !== undefined}
            title={unitAuxRefusal}
            guard={{
              lifted: unitAuxCoverLifted,
              onToggleCover: () => {
                setUnitAuxCoverLifted(!unitAuxCoverLifted)
              },
            }}
          />
          <div className="board-readout">
            <span>Turbine speed</span>
            <Display label="Turbine speed" text={`${state.Turbine.rpm.toFixed(0)} RPM`} widest="9999 RPM" />
          </div>
          <Lamp lit={isAtSyncSpeed(state.Turbine.rpm)} tone="ok" label="Ready to close" title="Lit when the speed is inside the synchronising window" />
        </div>
        <div className="board-group">
          <Lamp lit={isBusLive(state)} tone="ok" label="Auxiliary bus live" title="Lit while a breaker feeds the bus" />
          <div className="board-readout">
            <span>Auxiliary load</span>
            <Display label="Auxiliary load" text={`${state.auxiliaryLoad.toFixed(1)} MW`} widest="99.9 MW" />
          </div>
        </div>
      </div>
    </PanelFrame>
  )
}

export default AuxiliaryBus
