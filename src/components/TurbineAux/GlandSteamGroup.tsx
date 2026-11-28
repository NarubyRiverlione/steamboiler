/** Gland Steam group of the Turbine aux page: the gland steam switch, the seal state, the air in-leakage effect, the condenser pressure and the reasons for a refusal or an automatic shut-off (ADR 0047). */

import { useState } from "react"
import type { CondenserState, TurbineState } from "../../context/PowerPlantState"
import { glandSteamRefusal } from "../../context/Turbine/GlandSteam"
import { rotorTurns } from "../../context/Turbine/TurningGear"
import { Display } from "../board/Display"
import { TurnSwitch } from "../board/TurnSwitch"

type GlandSteamGroupProps = {
  readonly turbine: TurbineState
  readonly condenser: CondenserState
  readonly onToggleGlandSteam: () => void
}

const UNSEALED_LEAK_TEXT = "High"
const SHUT_OFF_TEXT = "Gland steam shut off: the rotor stopped turning"

// The plant shuts the steam off when the rotor stops; the state keeps no trace, so the group remembers it until the steam is back on. An operator switch-off is not one.
function useAutoShutOff(on: boolean, turns: boolean): { autoShutOff: boolean; markOperatorSwitch: () => void } {
  const [prevOn, setPrevOn] = useState<boolean>(on)
  const [shutOff, setShutOff] = useState<boolean>(false)
  const [operatorSwitched, setOperatorSwitched] = useState<boolean>(false)
  if (on !== prevOn) {
    setPrevOn(on)
    setShutOff(on ? false : !turns && !operatorSwitched)
    setOperatorSwitched(false)
  }
  return {
    autoShutOff: shutOff && !on,
    markOperatorSwitch: () => {
      setOperatorSwitched(true)
    },
  }
}

export function GlandSteamGroup({ turbine, condenser, onToggleGlandSteam }: GlandSteamGroupProps) {
  const on: boolean = turbine.glandSteamOn
  // Shutting off is always allowed; only an admission can be refused
  const refusal: string | undefined = on ? undefined : glandSteamRefusal(turbine)
  const { autoShutOff, markOperatorSwitch } = useAutoShutOff(on, rotorTurns(turbine))
  const toggle = (): void => {
    markOperatorSwitch()
    onToggleGlandSteam()
  }
  const message: string | undefined = autoShutOff ? SHUT_OFF_TEXT : refusal
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
          onToggle={toggle}
          disabled={refusal !== undefined}
          title={refusal}
        />
      </div>
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
        <Display label="Condenser pressure" text={`${condenser.pressure.toFixed(0)} mBar`} widest="1100 mBar" />
      </div>
      {message !== undefined && <p className="board-lcd-msg">{message}</p>}
    </div>
  )
}
