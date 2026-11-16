/** Lube Oil group of the Turbine aux page: the oil pump switch, the header pressure dial with its permissive and trip limits, and the low pressure lamp (ADR 0050). */

import { CstOil, CstSimulation } from "../../context/const"
import type { OilState } from "../../context/PowerPlantState"
import useEMA from "../../utils/useEMA"
import { Display } from "../board/Display"
import { Lamp } from "../board/Lamp"
import { RoundGauge, type GaugeZone } from "../board/RoundGauge"
import { TurnSwitch } from "../board/TurnSwitch"

const { NominalPressure, PermissivePressure, TripPressure } = CstOil

const PRESSURE_SCALE_MAX = 1.5 // bar g, dial end: past the nominal pressure so the green zone has room

// Red below the trip limit, orange up to the permissive limit (the turbine valve stays shut), green above
const PRESSURE_ZONES: readonly GaugeZone[] = [
  { from: 0, to: TripPressure, tone: "alarm" },
  { from: TripPressure, to: PermissivePressure, tone: "warn" },
  { from: PermissivePressure, to: PRESSURE_SCALE_MAX, tone: "ok" },
]

type LubeOilGroupProps = {
  readonly oil: OilState
  readonly onToggleOilPump: () => void
}

export function LubeOilGroup({ oil, onToggleOilPump }: LubeOilGroupProps) {
  const smoothPressure: number = useEMA(oil.headerPressure, CstSimulation.ReadoutSmoothingSeconds)
  return (
    <div className="board-group">
      <h3 className="board-group-title">Lube Oil</h3>
      <div className="board-group-row" role="group" aria-label="Oil pump">
        <TurnSwitch
          label="Oil pump"
          offLabel="STOP"
          onLabel="RUN"
          tone="machine"
          on={oil.pumpRunning}
          onToggle={onToggleOilPump}
        />
      </div>
      <Lamp
        lit={oil.headerPressure < PermissivePressure}
        label="Oil pressure low"
        title={`The turbine valve opens from ${PermissivePressure.toFixed(1)} bar g; a running turbine trips below ${TripPressure.toFixed(1)} bar g`}
      />
      <span className="board-readout-label">Oil pump</span>
      <RoundGauge
        label="Lube oil header pressure"
        unit="bar g"
        value={smoothPressure}
        min={0}
        max={PRESSURE_SCALE_MAX}
        major={0.5}
        minor={0.1}
        zones={PRESSURE_ZONES}
      />
      <div className="board-readout">
        <span>Header pressure</span>
        <Display label="Header pressure" text={`${smoothPressure.toFixed(2)} bar g`} widest="9.99 bar g" />
      </div>
      <p className="board-lcd-msg">
        Permissive {PermissivePressure.toFixed(1)} bar g, trip {TripPressure.toFixed(1)} bar g (nominal{" "}
        {NominalPressure.toFixed(1)})
      </p>
    </div>
  )
}
