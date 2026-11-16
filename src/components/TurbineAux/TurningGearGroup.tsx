/** Turning Gear group of the Turbine aux page: the gear switch, the gear state, the slow rotor speed and the reason an engage is refused (ADR 0051). */

import { CstTurningGear } from "../../context/const"
import type { OilState, TurbineState } from "../../context/PowerPlantState"
import { turningGearRefusal } from "../../context/Turbine/TurningGear"
import { Display } from "../board/Display"
import { TurnSwitch } from "../board/TurnSwitch"

type TurningGearGroupProps = {
  readonly turbine: TurbineState
  readonly oil: OilState
  readonly onToggleTurningGear: () => void
}

// The gear out with the rotor above standstill is the gear thrown out by the steam (ADR 0051), not an operator action
function gearStateText({ turningGearEngaged, rpm }: TurbineState): string {
  if (turningGearEngaged) return "Engaged"
  return rpm > CstTurningGear.StandstillRpm ? "Thrown out by the steam" : "Out"
}

export function TurningGearGroup({ turbine, oil, onToggleTurningGear }: TurningGearGroupProps) {
  const engaged: boolean = turbine.turningGearEngaged
  // Disengaging is always allowed; only an engage can be refused
  const refusal: string | undefined = engaged ? undefined : turningGearRefusal(turbine, oil)
  return (
    <div className="board-group">
      <h3 className="board-group-title">Turning gear</h3>
      <div className="board-group-row" role="group" aria-label="Turning gear">
        <TurnSwitch
          label="Turning gear"
          offLabel="OUT"
          onLabel="IN"
          tone="machine"
          on={engaged}
          onToggle={onToggleTurningGear}
          disabled={refusal !== undefined}
          title={refusal}
        />
      </div>
      <span className="board-readout-label">Turning gear</span>
      <div className="board-readout">
        <span>Gear state</span>
        <Display label="Gear state" text={gearStateText(turbine)} widest="Thrown out by the steam" />
      </div>
      <div className="board-readout">
        <span>Rotor speed</span>
        <Display label="Rotor speed" text={`${turbine.rpm.toFixed(1)} rpm`} widest="9999.9 rpm" />
      </div>
      {refusal !== undefined && <p className="board-lcd-msg">{refusal}</p>}
    </div>
  )
}
