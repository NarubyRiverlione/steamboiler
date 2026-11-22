/** Data of the Electrical overview (#171): the single-line schematic of sources, breakers, buses and consumers, in diagram units. The voltages are UI constants, not modelled (ADR 0046). */

import type { PartId } from "./plantParts"

export const ELECTRICAL_WIDTH = 1100
export const ELECTRICAL_HEIGHT = 700

export type SourceId = "grid" | "generator" | "diesel"

export type ElectricalSource = {
  readonly id: SourceId
  readonly name: string
  // Centre of the source box and of its vertical line down to the Auxiliary bus
  readonly x: number
  // The page that holds the source breaker's controls
  readonly part: PartId
  // The source box itself links too
  readonly nodeLinks?: true
}

export const SOURCE_BOX = { y: 30, w: 150, h: 44 } as const
export const SOURCE_BREAKER_Y = 130
export const BREAKER_HALF = 15

export const SOURCES: readonly ElectricalSource[] = [
  { id: "grid", name: "Grid", x: 160, part: "auxiliaryBus" },
  { id: "generator", name: "Generator", x: 400, part: "generation", nodeLinks: true },
  { id: "diesel", name: "Diesel generator", x: 640, part: "diesel", nodeLinks: true },
]

// The busbars: horizontal lines at `y` from `x1` to `x2`
export type Busbar = {
  readonly id: "aux" | "vital" | "safety"
  readonly name: string
  readonly y: number
  readonly x1: number
  readonly x2: number
}

export const BUSES: readonly Busbar[] = [
  { id: "aux", name: "Auxiliary bus", y: 210, x1: 80, x2: 760 },
  { id: "vital", name: "Vital bus", y: 340, x1: 620, x2: 1040 },
  { id: "safety", name: "Safety bus", y: 610, x1: 620, x2: 1040 },
]

// Each source, the UPS and each bus has its own colour (board-electrical-<id> in board.css)
export type ElectricalColour = SourceId | "ups" | Busbar["id"]

// Dummy nominal voltages: shown when the bus is live, zero when dead
export const VOLTAGES = {
  grid: { live: "110 kV", dead: "0 kV" },
  aux: { live: "6.0 kV", dead: "0.0 kV" },
  vital: { live: "230 V", dead: "0 V" },
  safety: { live: "110 V DC", dead: "0 V DC" },
} as const

// The six consumers in the order of consumerDraws (largest rated first), each linking to its page; rows stand below the Auxiliary bus on a stem
export type Consumer = {
  readonly name: string
  // The page that holds the consumer's controls
  readonly part: PartId
}

export const CONSUMERS: readonly Consumer[] = [
  { name: "Boiler feed pump", part: "deaerator" },
  { name: "Recirculation pump", part: "condenser" },
  { name: "Condensation pump", part: "condenser" },
  { name: "Air extraction pump", part: "condenser" },
  { name: "Lube oil pump", part: "turbineAux" },
  { name: "Turning gear motor", part: "turbineAux" },
]

export const CONSUMER_STEM_X = 120
export const CONSUMER_BOX = { x: 150, w: 270, h: 36 } as const
export const consumerY = (index: number): number => 270 + index * 46
export const TOTAL_Y = 570

// Vital bus fed from the Auxiliary bus at this x
export const VITAL_FEED_X = 700

// UPS box, its breaker and the line down to the Safety bus
export const UPS = { x: 970, y: 450, w: 140, h: 44 } as const
export const UPS_BREAKER_Y = 550
