/** Level zones for a vessel's gauge, built from its limits: red from the trip, orange from the alarm up to the trip, green for the working band, nothing between (#54). */

import type { GaugeZone } from "./RoundGauge"

type Side = { readonly low?: number; readonly high?: number } // fractions of the vessel volume, each side optional

export type LevelLimits = {
  readonly trip?: Side // red beyond it: below `low`, from `high`
  readonly alarm?: Side // orange from it up to the trip: below `low`, from `high`
  readonly working?: { readonly low: number; readonly high: number } // green, both ends included
}

export type LevelZone = GaugeZone["tone"] | "none"

const RED: GaugeZone["tone"] = "alarm"
const ORANGE: GaugeZone["tone"] = "warn"
const GREEN: GaugeZone["tone"] = "ok"

// Fraction to percent without the float noise of 0.55 * 100
const percent = (fraction: number): number => Math.round(fraction * 1e8) / 1e6

export function levelZones({ trip, alarm, working }: LevelLimits): GaugeZone[] {
  const zones: GaugeZone[] = []
  if (trip?.low !== undefined) zones.push({ from: 0, to: percent(trip.low), tone: RED })
  if (trip?.high !== undefined) zones.push({ from: percent(trip.high), to: 100, tone: RED })
  if (alarm?.low !== undefined) zones.push({ from: percent(trip?.low ?? 0), to: percent(alarm.low), tone: ORANGE })
  if (alarm?.high !== undefined) zones.push({ from: percent(alarm.high), to: percent(trip?.high ?? 1), tone: ORANGE })
  if (working) zones.push({ from: percent(working.low), to: percent(working.high), tone: GREEN })
  return zones
}

// Green holds both ends; the other zones hold their lower end (a trip is "below" the limit, a high alarm is "from" it) and the scale's top
export function zoneOf(level: number, zones: readonly GaugeZone[]): LevelZone {
  const inGreen = zones.find((z: GaugeZone) => z.tone === GREEN && z.from / 100 <= level && level <= z.to / 100)
  if (inGreen) return GREEN
  const hit = zones.find(
    (z: GaugeZone) => z.tone !== GREEN && z.from / 100 <= level && (level < z.to / 100 || (z.to === 100 && level <= 1)),
  )
  return hit?.tone ?? "none"
}
