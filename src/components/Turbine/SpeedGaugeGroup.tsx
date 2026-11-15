/** Speed Gauge group: the horizontal RPM meter of the Turbine page, with the zones around the sync speed and the overspeed trip. */

import { CstSimulation } from "../../context/const"
import { LinearGauge } from "../board/LinearGauge"
import type { GaugeZone } from "../board/RoundGauge"
import type { TurbineState } from "./types"

const {
  CstTurbine: { SyncRPM, MaxRPM },
} = CstSimulation

const RPM_SCALE_MAX = 3500 // gauge end, past the overspeed trip so the red zone above MaxRPM shows
const RPM_NORMAL_HALF = 100 // green band at SyncRPM ± this: the normal running range on the meter
const RPM_ZONES: readonly GaugeZone[] = [
  { from: 0, to: SyncRPM - RPM_NORMAL_HALF, tone: "neutral" },
  { from: SyncRPM - RPM_NORMAL_HALF, to: SyncRPM + RPM_NORMAL_HALF, tone: "ok" },
  { from: SyncRPM + RPM_NORMAL_HALF, to: MaxRPM, tone: "warn" },
  { from: MaxRPM, to: RPM_SCALE_MAX, tone: "alarm" },
]

type SpeedGaugeGroupProps = {
  readonly turbine: TurbineState
}

export function SpeedGaugeGroup({ turbine }: SpeedGaugeGroupProps) {
  return (
    <div className="board-group">
      <h3 className="board-group-title">Turbine Speed</h3>
      <LinearGauge
        label="Speed gauge"
        orientation="horizontal"
        value={turbine.rpm}
        min={0}
        max={RPM_SCALE_MAX}
        unit="rpm"
        major={500}
        minor={100}
        zones={RPM_ZONES}
      />
    </div>
  )
}
