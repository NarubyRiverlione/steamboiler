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
// The breaker symbol is drawn in its 30 unit footprint and scaled up by 150%; BREAKER_DRAWN_HALF is the half size as it stands on the diagram
export const BREAKER_SCALE = 1.5
export const BREAKER_DRAWN_HALF = BREAKER_HALF * BREAKER_SCALE
export const GRID_X = 280
export const GRID_TIE_Y = 100
export const GRID_SUPPLY_X = 160
export const GENERATOR_X = 400
export const GENERATOR_BOX_Y = 200
export const UNIT_AUX_BREAKER_Y = 287
// The grid supply breaker stands level with the unit aux breaker it is interlocked with
export const GRID_SUPPLY_BREAKER_Y = UNIT_AUX_BREAKER_Y
export const DIESEL_X = 640

// The busbars: horizontal lines at `y` from `x1` to `x2`
export type Busbar = {
  readonly id: "aux" | "vital" | "safety"
  readonly name: string
  readonly y: number
  readonly x1: number
  readonly x2: number
  // Where the name stands, clear of the feed lines that join the bus
  readonly nameX: number
  readonly nameAnchor: "start" | "end"
  // The name and readouts stand in a row below the bus instead of above it, clear of what runs above (the Auxiliary bus: the grid supply interlock line)
  readonly labelsBelow?: boolean
}

// The stem the consumers hang from, down from the left end of the Auxiliary bus
export const CONSUMER_STEM_X = 120

// The row below the Auxiliary bus: its name right of the consumer stem, then its voltage and the Auxiliary load total
export const AUX_ROW = { gap: 12, nameX: CONSUMER_STEM_X + 14, voltageX: 260, loadX: 420 } as const

export const BUSES: readonly Busbar[] = [
  { id: "aux", name: "Auxiliary bus", y: 330, x1: 80, x2: 760, nameX: AUX_ROW.nameX, nameAnchor: "start", labelsBelow: true },
  { id: "vital", name: "Vital bus", y: 460, x1: 590, x2: 1040, nameX: 620, nameAnchor: "start" },
  { id: "safety", name: "Safety bus", y: 730, x1: 600, x2: 1040, nameX: 612, nameAnchor: "start" },
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

export const CONSUMER_BOX = { x: 150, w: 270, h: 36 } as const
// The consumers follow the readout row below the Auxiliary bus
export const FIRST_CONSUMER_Y = 400
export const consumerY = (index: number): number => FIRST_CONSUMER_Y + index * 46

// Vital bus fed from the Auxiliary bus at this x, through the Aux→Vital breaker (#196)
export const VITAL_FEED_X = 700
export const VITAL_FEED_BREAKER_Y = 395

// The EMY diesel (#198): a source box right of the Auxiliary bus, its automatic EMY breaker and the line down to the Vital bus
export const EMY_X = 900
export const EMY_BOX_Y = 330
export const EMY_BREAKER_Y = 405

// UPS box, its derived battery breaker (closed = Vital→Safety open) and the line down to the Safety bus
export const UPS = { x: 970, y: 570, w: 140, h: 44 } as const
export const UPS_BREAKER_Y = 670

// The Vital→Safety feed: a line from the Vital bus down to the Safety bus, through the Vital→Safety breaker (#196), level with the Battery breaker it is interlocked with
export const SAFETY_FEED_X = 600
export const SAFETY_FEED_BREAKER_Y = UPS_BREAKER_Y

// Two interlocked breakers, joined by a dashed line from the edge of one (the automatic one, when there is one) to the edge of the other.
// EMY: closes only while the Aux→Vital breaker is open, and closing Aux→Vital opens it (ADR 0056). Battery: closed exactly while Vital→Safety is open.
// Grid supply and unit aux: closing one opens the other (#189), both by hand.
export type Interlock = {
  readonly id: "emy" | "battery" | "aux-supply"
  readonly from: string
  readonly to: string
  readonly points: readonly (readonly [number, number])[]
}

// Straight across between the two breakers, at a height inside both footprints
const EMY_INTERLOCK_Y = (VITAL_FEED_BREAKER_Y + EMY_BREAKER_Y) / 2

export const INTERLOCKS: readonly Interlock[] = [
  {
    id: "emy",
    from: "EMY breaker",
    to: "Aux to Vital breaker",
    points: [
      [EMY_X - BREAKER_DRAWN_HALF, EMY_INTERLOCK_Y],
      [VITAL_FEED_X + BREAKER_DRAWN_HALF, EMY_INTERLOCK_Y],
    ],
  },
  {
    id: "battery",
    from: "Battery breaker",
    to: "Vital to Safety breaker",
    points: [
      [UPS.x - BREAKER_DRAWN_HALF, UPS_BREAKER_Y],
      [SAFETY_FEED_X + BREAKER_DRAWN_HALF, SAFETY_FEED_BREAKER_Y],
    ],
  },
  {
    id: "aux-supply",
    from: "Grid supply breaker",
    to: "Unit aux breaker",
    points: [
      [GRID_SUPPLY_X + BREAKER_DRAWN_HALF, GRID_SUPPLY_BREAKER_Y],
      [GENERATOR_X - BREAKER_DRAWN_HALF, UNIT_AUX_BREAKER_Y],
    ],
  },
]

// One load per bus below the Auxiliary bus: Instrumentation on the Vital bus, Emergency equipment on the Safety bus. Plain boxes, no link: each stands for several pages.
export type BusLoad = {
  readonly bus: "vital" | "safety"
  readonly name: string
  readonly stemX: number
  readonly y: number
}

export const BUS_LOAD_BOX = { w: 230, h: 36, gap: 30 } as const

export const BUS_LOADS: readonly BusLoad[] = [
  { bus: "vital", name: "Instrumentation", stemX: 640, y: 510 },
  { bus: "safety", name: "Emergency equipment", stemX: 640, y: 780 },
]
