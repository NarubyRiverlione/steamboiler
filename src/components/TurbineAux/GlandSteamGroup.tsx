/** Gland Steam group of the Turbine aux page: the gland steam switch, the seal state, the air in-leakage effect, the condenser pressure and the Rotor turning permissive lamp (ADR 0047, ADR 0054). */

import type { CondenserState, TurbineState } from "../../context/PowerPlantState"
import { glandSteamRefusal } from "../../context/Turbine/GlandSteam"
import { rotorTurns } from "../../context/Turbine/TurningGear"
import { Display } from "../board/Display"
import { Lamp } from "../board/Lamp"
import { TurnSwitch } from "../board/TurnSwitch"

type GlandSteamGroupProps = {
  readonly turbine: TurbineState
  readonly condenser: CondenserState
  readonly onToggleGlandSteam: () => void
}

const UNSEALED_LEAK_TEXT = "High"

export function GlandSteamGroup({ turbine, condenser, onToggleGlandSteam }: GlandSteamGroupProps) {
  const on: boolean = turbine.glandSteamOn
  // Shutting off is always allowed; only an admission can be refused
  const refusal: string | undefined = on ? undefined : glandSteamRefusal(turbine)
  return (
    <div className="board-group">
      <h3 className="board-group-title">Gland steam</h3>
      <div className="board-group-row" role="group" aria-label="Gland steam">
        <TurnSwitch
          label="Gland steam"
          medium="steam"
          offLabel="OFF"
          onLabel="ON"
          on={on}
          onToggle={onToggleGlandSteam}
          disabled={refusal !== undefined}
          title={refusal}
        />
      </div>
      <Lamp lit={rotorTurns(turbine)} tone="ok" label="Rotor turning" />
      <span className="board-readout-label">Gland seal</span>
      <div className="board-readout">
        <span>Seal state</span>
        <Display label="Seal state" text={on ? "Sealed" : "Unsealed"} widest="Unsealed" />
      </div>
      <div className="board-readout">
        <span>Air in-leakage</span>
        <Display label="Air in-leakage" text={on ? "Low" : UNSEALED_LEAK_TEXT} widest={UNSEALED_LEAK_TEXT} />
      </div>
      <div className="board-readout">
        <span>Condenser pressure</span>
        <Display
          label="Condenser pressure"
          text={`${condenser.pressure.toFixed(0)} mBar`}
          widest="1100 mBar"
        />
      </div>
    </div>
  )
}
