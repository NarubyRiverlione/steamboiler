/** Data of the Electrical overview (#171): the single-line schematic of sources, breakers, buses and consumers, in diagram units. The voltages are UI constants, not modelled (ADR 0046). */

import type { PartId } from "./plantParts"

export const ELECTRICAL_WIDTH = 1100
export const ELECTRICAL_HEIGHT = 820

export type SourceId = "grid" | "generator" | "diesel"

// Where the tie to the grid, the generator and the diesel stand: the grid on top with its tie rail, the grid supply breaker down to the
// Auxiliary bus, the generator column from the rail down through the generator breaker, the Generator box and the unit aux breaker (#189)
export const SOURCE_BOX = { y: 30, w: 150, h: 44 } as const
export const SOURCE_BREAKER_Y = 150
export const BREAKER_HALF = 15
export const GRID_X = 280
export const GRID_TIE_Y = 100
export const GRID_SUPPLY_X = 160
export const GENERATOR_X = 400
export const GENERATOR_BOX_Y = 200
export const UNIT_AUX_BREAKER_Y = 287
export const DIESEL_X = 640

// The busbars: horizontal lines at `y` from `x1` to `x2`
export type Busbar = {
  readonly id: "aux" | "vital" | "safety"
  readonly name: string
  readonly y: number
  readonly x1: number
  readonly x2: number
}

export const BUSES: readonly Busbar[] = [
  { id: "aux", name: "Auxiliary bus", y: 330, x1: 80, x2: 760 },
  { id: "vital", name: "Vital bus", y: 460, x1: 620, x2: 1040 },
  { id: "safety", name: "Safety bus", y: 730, x1: 600, x2: 1040 },
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
export const consumerY = (index: number): number => 390 + index * 46
export const TOTAL_Y = 690

// Vital bus fed from the Auxiliary bus at this x
export const VITAL_FEED_X = 700

// UPS box, its breaker and the line down to the Safety bus
export const UPS = { x: 970, y: 570, w: 140, h: 44 } as const
export const UPS_BREAKER_Y = 670

// The rectifier feed: a line from the Auxiliary bus down to the Safety bus, left of the Vital bus
export const SAFETY_FEED_X = 600
