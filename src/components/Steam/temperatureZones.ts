/** The zones of the steam temperature gauge, all from CstSuperheater (#149): neutral below the green band, green around the setpoint, orange to the alarm, red above. */

import { CstSuperheater } from "../../context/const"
import type { GaugeZone } from "../board/RoundGauge"

const { SteamTemperature, AlarmTemperature } = CstSuperheater
export const TEMPERATURE_MIN = 300 // °C, bottom of the dial
export const TEMPERATURE_MAX = 600 // °C, top of the dial
const GREEN_BAND = 10 // K either side of the setpoint that counts as on target

export const TEMPERATURE_ZONES: readonly GaugeZone[] = [
  { from: TEMPERATURE_MIN, to: SteamTemperature - GREEN_BAND, tone: "neutral" },
  { from: SteamTemperature - GREEN_BAND, to: SteamTemperature + GREEN_BAND, tone: "ok" },
  { from: SteamTemperature + GREEN_BAND, to: AlarmTemperature, tone: "warn" },
  { from: AlarmTemperature, to: TEMPERATURE_MAX, tone: "alarm" },
]
