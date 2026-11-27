/** The Diesel generator page on the board (#175, ADR 0053): the STOP/RUN switch, the status lamps, the output gauge and the diesel breaker. Gauges and lamps only, so it reads on the red emergency lens (#144). */

import { useState } from "react"
import { CstDiesel } from "../../context/const"
import { dieselBreakerCloseRefusal, dieselOutput, hasCoolingPower } from "../../context/Diesel"
import usePowerPlant from "../../context/PowerPlantContext"
import { BreakerSwitch } from "../board/BreakerSwitch"
import { Lamp } from "../board/Lamp"
import { PanelFrame } from "../board/PanelFrame"
import { RoundGauge, type GaugeZone } from "../board/RoundGauge"
import { TurnSwitch } from "../board/TurnSwitch"

const SCALE_MAX: number = Math.ceil(CstDiesel.RatedPower) // MW, the next whole MW above the rating so the red zone shows
const ZONES: readonly GaugeZone[] = [
  { from: 0, to: CstDiesel.RatedPower, tone: "ok" },
  { from: CstDiesel.RatedPower, to: SCALE_MAX, tone: "alarm" },
]

function Diesel() {
  const { state, setDieselRun, toggleDieselBreaker } = usePowerPlant()
  const [coverLifted, setCoverLifted] = useState<boolean>(false)
  const refusal: string | undefined = dieselBreakerCloseRefusal(state)
  const closeRefused: boolean = !state.dieselBreaker && refusal !== undefined
  const ready: boolean = !state.dieselBreaker && !closeRefused
  return (
    <PanelFrame title="Diesel generator">
      <div className="board-page-groups">
        <div className="board-group">
          <h3 className="board-group-title">Diesel</h3>
          <TurnSwitch
            label="Diesel run"
            offLabel="STOP"
            onLabel="RUN"
            tone="machine"
            on={state.Diesel.status !== "stopped"}
            onToggle={() => {
              setDieselRun(state.Diesel.status === "stopped")
            }}
          />
          <Lamp lit={hasCoolingPower(state)} tone="ok" label="Cooling power" title="Lit while the Vital bus is live; RUN does nothing without it" />
          <Lamp lit={state.Diesel.status === "starting"} label="Starting" />
          <Lamp lit={state.Diesel.status === "running"} tone="ok" label="Running" />
          <RoundGauge label="Diesel output" unit="MW" value={dieselOutput(state)} min={0} max={SCALE_MAX} major={1} minor={0.5} zones={ZONES} />
        </div>
        <div className="board-group">
          <h3 className="board-group-title">Diesel breaker</h3>
          <BreakerSwitch
            label="Diesel breaker"
            plate="Diesel"
            rating="6.0 kV · CB-D1"
            on={state.dieselBreaker}
            onToggle={toggleDieselBreaker}
            disabled={closeRefused}
            title={refusal}
            guard={{
              lifted: coverLifted,
              onToggleCover: () => {
                setCoverLifted(!coverLifted)
              },
            }}
          />
          <Lamp lit={ready} tone="ok" label="Ready to close" title={refusal ?? "The breaker may be closed"} />
        </div>
      </div>
    </PanelFrame>
  )
}

export default Diesel
