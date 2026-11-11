/** Data of the plant overview: the plant to be (ADR 0029) as laid out in the full-board mockup (docs/adr/0015-full-board-mockup.html). */

import type { PartId } from "./plantParts"

export type Medium = "heat" | "steam" | "water" | "cooling" | "power" | "vacuum"

export type DiagramNode = {
  readonly id: string
  readonly name: readonly string[]
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  readonly medium: Medium
  readonly round?: true
  readonly parked?: true
  // The page that holds this node's controls; a node without one is shown but not clickable
  readonly part?: PartId
  // The node that carries the part's alarm LED
  readonly led?: true
}

type DiagramPipe = { readonly medium: Medium; readonly d: string; readonly dashed?: true }

type DiagramLabel = {
  readonly x: number
  readonly y: number
  readonly text: string
  readonly anchor?: "start" | "middle" | "end"
  readonly bold?: true
}

export const DIAGRAM_WIDTH = 1660
export const DIAGRAM_HEIGHT = 704

export const NODES: readonly DiagramNode[] = [
  { id: "gas", name: ["Gas supply"], x: 205, y: 14, w: 120, h: 40, medium: "heat", round: true },
  { id: "burner", name: ["Burner"], x: 200, y: 78, w: 130, h: 44, medium: "heat", part: "boiler" },
  { id: "surface", name: ["Boiler surface"], x: 200, y: 146, w: 130, h: 54, medium: "heat" },
  { id: "economizer", name: ["Economizer"], x: 200, y: 460, w: 130, h: 90, medium: "heat" },
  { id: "preheater", name: ["Air preheater"], x: 200, y: 586, w: 130, h: 44, medium: "heat", parked: true },
  { id: "stack", name: ["Stack"], x: 210, y: 654, w: 110, h: 38, medium: "heat", round: true },
  { id: "surroundings", name: ["Surroundings"], x: 400, y: 40, w: 125, h: 44, medium: "heat", round: true },
  { id: "air", name: ["Combustion air"], x: 420, y: 586, w: 140, h: 44, medium: "heat", round: true },
  {
    id: "boiler",
    name: ["Boiler"],
    x: 400,
    y: 146,
    w: 120,
    h: 54,
    medium: "water",
    part: "boiler",
    led: true,
  },
  { id: "relief", name: ["Relief valve"], x: 700, y: 40, w: 120, h: 44, medium: "steam" },
  { id: "atmosphere", name: ["Atmosphere"], x: 890, y: 40, w: 120, h: 44, medium: "steam", round: true },
  {
    id: "msv",
    name: ["Main steam", "valve"],
    x: 820,
    y: 146,
    w: 120,
    h: 54,
    medium: "steam",
    part: "turbine",
  },
  {
    id: "turbinevalve",
    name: ["Turbine valve"],
    x: 1000,
    y: 146,
    w: 130,
    h: 54,
    medium: "steam",
    part: "turbine",
  },
  {
    id: "turbine",
    name: ["Turbine"],
    x: 1190,
    y: 146,
    w: 120,
    h: 54,
    medium: "steam",
    part: "turbine",
    led: true,
  },
  { id: "generator", name: ["Generator"], x: 1370, y: 146, w: 120, h: 54, medium: "power", part: "turbine" },
  { id: "load", name: ["Load"], x: 1550, y: 150, w: 80, h: 46, medium: "power", round: true },
  { id: "bypass", name: ["Bypass valve"], x: 820, y: 250, w: 120, h: 44, medium: "steam", part: "turbine" },
  { id: "drain", name: ["Drain"], x: 370, y: 250, w: 100, h: 40, medium: "water", part: "boiler" },
  {
    id: "condenser",
    name: ["Condenser"],
    x: 1190,
    y: 310,
    w: 120,
    h: 110,
    medium: "cooling",
    part: "condenser",
    led: true,
  },
  {
    id: "car",
    name: ["Air extraction pump"],
    x: 920,
    y: 316,
    w: 190,
    h: 36,
    medium: "vacuum",
    part: "condenser",
  },
  { id: "sjae", name: ["SJAE"], x: 920, y: 362, w: 190, h: 36, medium: "vacuum", part: "condenser" },
  {
    id: "recirc",
    name: ["Recirculation", "pump"],
    x: 1370,
    y: 312,
    w: 120,
    h: 50,
    medium: "cooling",
    part: "condenser",
  },
  {
    id: "coolin",
    name: ["Cooling water,", "10 °C"],
    x: 1525,
    y: 308,
    w: 125,
    h: 58,
    medium: "cooling",
    round: true,
  },
  {
    id: "coolout",
    name: ["Cooling water out"],
    x: 1370,
    y: 380,
    w: 170,
    h: 36,
    medium: "cooling",
    round: true,
  },
  { id: "hotwell", name: ["Hotwell"], x: 1190, y: 470, w: 120, h: 76, medium: "water", part: "condenser" },
  {
    id: "condpump",
    name: ["Condensation", "pump"],
    x: 820,
    y: 480,
    w: 140,
    h: 54,
    medium: "water",
    part: "condenser",
  },
  {
    id: "deaerator",
    name: ["Deaerator"],
    x: 740,
    y: 580,
    w: 120,
    h: 76,
    medium: "water",
    part: "deaerator",
  },
  { id: "heater", name: ["Extraction heater"], x: 560, y: 480, w: 160, h: 54, medium: "steam" },
  { id: "storagein", name: ["Storage"], x: 1420, y: 462, w: 100, h: 34, medium: "water", round: true },
  { id: "storageout", name: ["Storage"], x: 1420, y: 520, w: 100, h: 34, medium: "water", round: true },
]

export const PIPES: readonly DiagramPipe[] = [
  { medium: "heat", d: "M265 54 L265 77" },
  { medium: "heat", d: "M265 122 L265 145" },
  { medium: "heat", d: "M265 200 L265 459" },
  { medium: "heat", d: "M265 550 L265 585" },
  { medium: "heat", d: "M265 630 L265 653" },
  { medium: "heat", d: "M330 173 L399 173" },
  { medium: "heat", d: "M462 146 L462 85" },
  { medium: "heat", d: "M420 608 L331 608", dashed: true },
  { medium: "heat", d: "M200 608 L110 608 L110 100 L199 100", dashed: true },
  { medium: "steam", d: "M520 173 L819 173" },
  { medium: "steam", d: "M760 173 L760 85" },
  { medium: "steam", d: "M820 62 L889 62" },
  { medium: "steam", d: "M940 173 L999 173" },
  { medium: "steam", d: "M1130 173 L1189 173" },
  { medium: "steam", d: "M880 200 L880 249" },
  { medium: "steam", d: "M940 272 L1220 272 L1220 309" },
  { medium: "steam", d: "M1280 200 L1280 309" },
  { medium: "steam", d: "M1220 200 L1220 224 L890 224 A10 10 0 0 0 870 224 L640 224 L640 479" },
  { medium: "water", d: "M420 200 L420 249" },
  { medium: "water", d: "M1220 420 L1220 469" },
  { medium: "water", d: "M1280 420 L1280 469" },
  { medium: "water", d: "M1190 508 L961 508" },
  { medium: "water", d: "M890 534 L890 618 L861 618" },
  { medium: "water", d: "M739 618 L700 618 L700 535" },
  { medium: "water", d: "M560 508 L331 508" },
  { medium: "water", d: "M330 472 L490 472 L490 201" },
  { medium: "water", d: "M1420 479 L1311 494" },
  { medium: "water", d: "M1310 522 L1419 537" },
  { medium: "water", d: "M640 534 L640 566 L500 566 L500 509" },
  { medium: "cooling", d: "M1525 337 L1491 337" },
  { medium: "cooling", d: "M1370 337 L1311 337" },
  { medium: "cooling", d: "M1310 398 L1369 398" },
  { medium: "power", d: "M1310 173 L1369 173" },
  { medium: "power", d: "M1490 173 L1549 173" },
  { medium: "vacuum", d: "M1110 334 L1189 334", dashed: true },
  { medium: "vacuum", d: "M1110 380 L1189 380", dashed: true },
  { medium: "vacuum", d: "M850 380 L919 380", dashed: true },
]

export const LABELS: readonly DiagramLabel[] = [
  { x: 275, y: 138, text: "flue gas" },
  { x: 275, y: 335, text: "flue gas" },
  { x: 275, y: 572, text: "flue gas" },
  { x: 365, y: 164, text: "heat", anchor: "middle" },
  { x: 472, y: 118, text: "heat loss" },
  { x: 120, y: 360, text: "hot air" },
  { x: 640, y: 164, text: "steam", anchor: "middle" },
  { x: 1080, y: 262, text: "vapour", anchor: "middle" },
  { x: 1292, y: 262, text: "exhaust" },
  { x: 1050, y: 215, text: "extraction steam", anchor: "middle" },
  { x: 395, y: 230, text: "drain", anchor: "middle" },
  { x: 1210, y: 450, text: "condensate", anchor: "end" },
  { x: 1292, y: 450, text: "exhaust moisture" },
  { x: 770, y: 498, text: "Return", anchor: "middle", bold: true },
  { x: 445, y: 498, text: "hotter Return", anchor: "middle", bold: true },
  { x: 502, y: 350, text: "hottest Return", anchor: "start", bold: true },
  { x: 632, y: 560, text: "heater drain, pumped forward", anchor: "end" },
  { x: 1365, y: 470, text: "makeup", anchor: "middle" },
  { x: 1365, y: 545, text: "reject", anchor: "middle" },
  { x: 1340, y: 390, text: "heat", anchor: "middle" },
  { x: 1340, y: 164, text: "shaft", anchor: "middle" },
  { x: 1520, y: 164, text: "electricity", anchor: "middle" },
  { x: 1150, y: 325, text: "vacuum", anchor: "middle" },
  { x: 1150, y: 371, text: "vacuum", anchor: "middle" },
  { x: 840, y: 372, text: "motive steam", anchor: "end" },
  { x: 640, y: 650, text: "Dashed: the air preheater, parked in #90." },
]

export const MEDIA: readonly Medium[] = ["heat", "steam", "water", "cooling", "power", "vacuum"]
