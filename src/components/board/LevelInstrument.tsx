/** One water-level instrument for every vessel: the vertical gauge, below it the level as a fraction (0-1), below that the signed change in kg/s. */

import formatSigned from "../../utils/formatSigned"
import { Display } from "./Display"
import { LevelGauge } from "./LevelGauge"
import type { GaugeZone } from "./RoundGauge"

type LevelInstrumentProps = {
  readonly label: string // "Hotwell level": names the caption, the gauge ("… gauge"), the fraction and the change ("… change")
  readonly fraction: number // 0-1 of the vessel volume
  readonly change: number // kg/s, positive while filling
  readonly zones?: readonly GaugeZone[] // in percent, as the gauge draws them
  readonly ticks?: readonly number[] // in percent
  readonly target?: number // 0-1 of the vessel volume, drawn as a line on the gauge
}

export function LevelInstrument({ label, fraction, change, zones, ticks, target }: LevelInstrumentProps) {
  return (
    <div className="board-instrument">
      <span className="board-instrument-label">{label}</span>
      <LevelGauge label={`${label} gauge`} value={fraction * 100} zones={zones}
        ticks={ticks}
        target={target === undefined ? undefined : target * 100}
      />
      <Display label={label} text={fraction.toFixed(2)} widest="1.00" />
      <Display label={`${label} change`} text={formatSigned(change, 1, "kg/s")} widest="-999.9 kg/s" />
    </div>
  )
}
