/** Turning Gear group of the Turbine aux page: the gear switch (its position is the gear state; the steam throws it OUT), the slow rotor speed and the reason an engage is refused (ADR 0051). */

import { CstTurningGear } from "../../context/const"
import type { OilState, TurbineState } from "../../context/PowerPlantState"
import { turningGearRefusal } from "../../context/Turbine/TurningGear"
import { Display } from "../board/Display"
import { TurnSwitch } from "../board/TurnSwitch"
import useRampUp from "../../utils/useRampUp"

// rpm per wall second the readout climbs to gear speed: the model holds the rotor at gear speed in one tick, the operator should see it climb (UX only)
const GearReadoutRampRpmPerSecond = 1

type TurningGearGroupProps = {
  readonly turbine: TurbineState
  readonly oil: OilState
  readonly busLive: boolean // the auxiliary bus feeds the gear motor (#141)
  readonly onToggleTurningGear: () => void
}

export function TurningGearGroup({ turbine, oil, busLive, onToggleTurningGear }: TurningGearGroupProps) {
  const engaged: boolean = turbine.turningGearEngaged
  // Disengaging is always allowed; only an engage can be refused
  const refusal: string | undefined = engaged ? undefined : turningGearRefusal(turbine, oil, busLive)
  const ramped: number = useRampUp(turbine.rpm, GearReadoutRampRpmPerSecond)
  // Only the gear range is ramped; a steam roll shows the true speed
  const shownRpm: number = turbine.rpm > CstTurningGear.Rpm ? turbine.rpm : ramped
  return (
    <div className="board-group">
      <h3 className="board-group-title">Turning gear</h3>
      <div className="board-group-row" role="group" aria-label="Turning gear">
        <TurnSwitch
          label="Turning gear"
          medium="oil"
          offLabel="OUT"
          onLabel="IN"
          on={engaged}
          onToggle={onToggleTurningGear}
          disabled={refusal !== undefined}
          title={refusal}
        />
      </div>
      <span className="board-readout-label">Turning gear</span>
      <div className="board-readout">
        <span>Rotor speed</span>
        <Display label="Rotor speed" text={`${shownRpm.toFixed(1)} rpm`} widest="9999.9 rpm" />
      </div>
      {refusal !== undefined && <p className="board-lcd-msg">{refusal}</p>}
    </div>
  )
}
