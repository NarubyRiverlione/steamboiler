/** The Emergency power page on the board (#196, ADR 0056): the Aux→Vital and Vital→Safety breakers, the UPS charge and the Control power and On battery lamps. The changeover is automatic, the hand-back is the operator's. */

import { useState } from "react"
import { isBusLive } from "../../context/AuxiliaryBus"
import usePowerPlant from "../../context/PowerPlantContext"
import { isBatteryFeeding, isSafetyBusLive, isVitalBusLive } from "../../context/SafetyBus"
import { BreakerSwitch } from "../board/BreakerSwitch"
import { Lamp } from "../board/Lamp"
import { PanelFrame } from "../board/PanelFrame"
import { RoundGauge, type GaugeZone } from "../board/RoundGauge"

// Red at the bottom: the battery is nearly flat (a UX choice, not modelled)
const CHARGE_ZONES: readonly GaugeZone[] = [
  { from: 0, to: 10, tone: "alarm" },
  { from: 10, to: 100, tone: "ok" },
]

function EmergencyPower() {
  const { state, toggleVitalFeedBreaker, toggleSafetyFeedBreaker } = usePowerPlant()
  const [vitalCoverLifted, setVitalCoverLifted] = useState<boolean>(false)
  const [safetyCoverLifted, setSafetyCoverLifted] = useState<boolean>(false)
  const controlPower: boolean = isSafetyBusLive(state)
  // Closing Aux→Vital needs a live Auxiliary bus and control power; Vital→Safety needs a live Vital bus and no control power
  const vitalCloseRefused: boolean = !state.vitalFeedBreaker && !(isBusLive(state) && controlPower)
  const safetyCloseRefused: boolean = !state.safetyFeedBreaker && !isVitalBusLive(state)
  return (
    <PanelFrame title="Emergency power">
      <div className="board-page-groups">
        <div className="board-group">
          <h3 className="board-group-title">Aux→Vital breaker</h3>
          <BreakerSwitch
            label="Aux to Vital breaker"
            plate="Aux→Vital"
            rating="230 V · CB-V1"
            on={state.vitalFeedBreaker}
            onToggle={toggleVitalFeedBreaker}
            disabled={vitalCloseRefused}
            title={vitalCloseRefused ? "Closes only on a live Auxiliary bus, with control power" : undefined}
            guard={{
              lifted: vitalCoverLifted,
              onToggleCover: () => {
                setVitalCoverLifted(!vitalCoverLifted)
              },
            }}
          />
        </div>
        <div className="board-group">
          <h3 className="board-group-title">Vital→Safety breaker</h3>
          <BreakerSwitch
            label="Vital to Safety breaker"
            plate="Vital→Safety"
            rating="110 V DC · CB-S1"
            on={state.safetyFeedBreaker}
            onToggle={toggleSafetyFeedBreaker}
            disabled={safetyCloseRefused}
            title={safetyCloseRefused ? "Closes only while the Vital bus is live" : undefined}
            guard={{
              lifted: safetyCoverLifted,
              onToggleCover: () => {
                setSafetyCoverLifted(!safetyCoverLifted)
              },
            }}
          />
        </div>
        <div className="board-group">
          <h3 className="board-group-title">UPS</h3>
          <RoundGauge label="UPS charge" unit="%" value={state.upsCharge} min={0} max={100} major={20} minor={10} zones={CHARGE_ZONES} />
          <Lamp lit={controlPower} tone="ok" label="Control power" title="Lit while the Safety bus is live (the Vital bus through Vital→Safety, or the battery)" />
          <Lamp lit={isBatteryFeeding(state)} label="On battery" title="Lit while the battery feeds the Safety bus (Vital→Safety open)" />
        </div>
      </div>
    </PanelFrame>
  )
}

export default EmergencyPower
