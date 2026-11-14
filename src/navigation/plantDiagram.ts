/** Data of the plant overview: the plant to be (ADR 0029) as laid out in the full-board mockup (docs/adr/0015-full-board-mockup.html). */

import type { AlarmId } from "./alarms"
import type { PartId } from "./plantParts"

export type NodeSymbol = "valve" | "pump"

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
  // The alarm that lights this node's LED alone, instead of every alarm of the part
  readonly alarm?: AlarmId
  // Drawn as the industry symbol (centred in the box, the box only joins the pipes and takes the click) instead of a box
  readonly symbol?: NodeSymbol
  // The way the flow runs through a symbol; right when left out
  readonly flow?: "left" | "down"
  // Where a symbol's name stands; above when left out
  readonly label?: "left"
  // Shifts a symbol's name to the right by this many units
  readonly labelDx?: number
}

type DiagramPipe = { readonly medium: Medium; readonly d: string; readonly dashed?: true }

type DiagramLabel = {
  readonly x: number
  readonly y: number
  readonly text: string
  readonly anchor?: "start" | "middle" | "end"
  readonly bold?: true
}

export type ValueId =
  | "boilerPressure"
  | "boilerLevel"
  | "gasFlow"
  | "mainSteamValve"
  | "turbineValve"
  | "bypassValve"
  | "turbineSpeed"
  | "output"
  | "loadSetpoint"
  | "condenserPressure"
  | "hotwellLevel"
  | "condensationPump"
  | "feedPump"
  | "deaeratorTemperature"
  | "deaeratorLevel"
  | "heaterTemperature"
  | "economizerTemperature"
  | "stackTemperature"
  | "steamTemperature"

// A live value drawn as an LCD label beside a node (#99); x and y are the anchor in diagram units, `anchor` says which edge of the label it is
export type DiagramValue = {
  readonly id: ValueId
  readonly node: string
  // Names the readout
  readonly label: string
  // The longest text it shows; sizes the label so it does not resize as the value changes
  readonly widest: string
  readonly x: number
  readonly y: number
  readonly anchor: "start" | "middle" | "end"
}

export const DIAGRAM_WIDTH = 1660
export const DIAGRAM_HEIGHT = 704

export const NODES: readonly DiagramNode[] = [
  { id: "gas", name: ["Gas supply"], x: 205, y: 14, w: 120, h: 40, medium: "heat", round: true },
  { id: "burner", name: ["Burner"], x: 200, y: 78, w: 130, h: 44, medium: "heat", part: "boiler" },
  {
    id: "superheater",
    name: ["Superheater"],
    x: 200,
    y: 146,
    w: 130,
    h: 54,
    medium: "steam",
    part: "boiler",
    led: true,
    alarm: "steamTemperatureHigh",
  },
  { id: "reheater", name: ["Reheater"], x: 200, y: 226, w: 130, h: 44, medium: "heat", parked: true },
  { id: "surface", name: ["Boiler surface"], x: 200, y: 296, w: 130, h: 54, medium: "heat" },
  { id: "economizer", name: ["Economizer"], x: 200, y: 460, w: 130, h: 90, medium: "heat" },
  { id: "preheater", name: ["Air preheater"], x: 200, y: 586, w: 130, h: 44, medium: "heat", parked: true },
  { id: "stack", name: ["Stack"], x: 210, y: 654, w: 110, h: 38, medium: "heat", round: true },
  { id: "air", name: ["Combustion air"], x: 420, y: 586, w: 140, h: 44, medium: "heat", round: true },
  {
    id: "boiler",
    name: ["Boiler"],
    x: 400,
    y: 296,
    w: 120,
    h: 54,
    medium: "water",
    part: "boiler",
    led: true,
  },
  {
    id: "msv",
    name: ["Main steam", "valve"],
    x: 820,
    y: 161,
    w: 120,
    h: 24,
    medium: "steam",
    part: "turbine",
    symbol: "valve",
  },
  {
    id: "turbinevalve",
    name: ["Turbine valve"],
    x: 1000,
    y: 161,
    w: 130,
    h: 24,
    medium: "steam",
    part: "turbine",
    symbol: "valve",
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
  { id: "generator", name: ["Generator"], x: 1370, y: 146, w: 120, h: 54, medium: "power", part: "generation" },
  { id: "load", name: ["Load"], x: 1550, y: 150, w: 80, h: 46, medium: "power", round: true },
  {
    id: "bypass",
    name: ["Bypass valve"],
    x: 900,
    y: 260,
    w: 120,
    h: 24,
    medium: "steam",
    part: "turbine",
    symbol: "valve",
  },
  { id: "drain", name: ["Drain"], x: 370, y: 400, w: 100, h: 40, medium: "water", part: "boiler" },
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
    name: ["extraction"],
    x: 920,
    y: 316,
    w: 190,
    h: 36,
    medium: "vacuum",
    part: "condenser",
    symbol: "pump",
    labelDx: 40,
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
    symbol: "pump",
    flow: "left",
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
    x: 1030,
    y: 481,
    w: 140,
    h: 54,
    medium: "water",
    part: "condenser",
    symbol: "pump",
    flow: "left",
  },
  {
    id: "deaerator",
    name: ["Deaerator"],
    x: 860,
    y: 470,
    w: 120,
    h: 76,
    medium: "water",
    part: "deaerator",
  },
  {
    id: "feedpump",
    name: ["Boiler feed pump"],
    x: 700,
    y: 486,
    w: 140,
    h: 44,
    medium: "water",
    part: "deaerator",
    symbol: "pump",
    flow: "left",
  },
  {
    id: "letdown",
    name: ["Let-down", "valve"],
    x: 735,
    y: 330,
    w: 90,
    h: 44,
    medium: "steam",
    part: "deaerator",
    symbol: "valve",
    flow: "down",
    label: "left",
  },
  { id: "heater", name: ["Extraction heater"], x: 510, y: 480, w: 150, h: 54, medium: "steam" },
  { id: "storagein", name: ["Storage"], x: 1420, y: 462, w: 100, h: 34, medium: "water", round: true },
  { id: "storageout", name: ["Storage"], x: 1420, y: 520, w: 100, h: 34, medium: "water", round: true },
]

export const PIPES: readonly DiagramPipe[] = [
  { medium: "heat", d: "M265 54 L265 77" },
  { medium: "heat", d: "M265 122 L265 145" },
  { medium: "heat", d: "M265 200 L265 225" },
  { medium: "heat", d: "M265 270 L265 295" },
  { medium: "heat", d: "M265 350 L265 459" },
  { medium: "heat", d: "M265 550 L265 585" },
  { medium: "heat", d: "M265 630 L265 653" },
  { medium: "heat", d: "M330 323 L399 323" },
  { medium: "heat", d: "M420 608 L331 608", dashed: true },
  { medium: "heat", d: "M200 608 L110 608 L110 100 L199 100", dashed: true },
  { medium: "steam", d: "M430 295 L430 190 L331 190" },
  { medium: "steam", d: "M331 173 L819 173" },
  { medium: "steam", d: "M940 173 L999 173" },
  { medium: "steam", d: "M1130 173 L1189 173" },
  { medium: "steam", d: "M880 185 L880 272 L899 272" },
  { medium: "steam", d: "M780 173 L780 329" },
  { medium: "steam", d: "M780 374 L780 440 L920 440 L920 469" },
  { medium: "steam", d: "M650 440 L779 440" },
  { medium: "steam", d: "M1020 272 L1220 272 L1220 309" },
  { medium: "steam", d: "M1280 200 L1280 309" },
  { medium: "steam", d: "M1220 200 L1220 224 L890 224 A10 10 0 0 0 870 224 L790 224 A10 10 0 0 0 770 224 L650 224 L650 479" },
  { medium: "water", d: "M420 350 L420 399" },
  { medium: "water", d: "M1220 420 L1220 469" },
  { medium: "water", d: "M1280 420 L1280 469" },
  { medium: "water", d: "M1190 508 L1171 508" },
  { medium: "water", d: "M1029 508 L981 508" },
  { medium: "water", d: "M859 508 L841 508" },
  { medium: "water", d: "M699 508 L661 508" },
  { medium: "water", d: "M509 508 L331 508" },
  { medium: "water", d: "M330 472 L490 472 L490 351" },
  { medium: "water", d: "M1420 479 L1311 494" },
  { medium: "water", d: "M1310 522 L1419 537" },
  { medium: "water", d: "M610 535 L610 570 L900 570 L900 547" },
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
  { x: 275, y: 410, text: "flue gas" },
  { x: 275, y: 572, text: "flue gas" },
  { x: 365, y: 314, text: "heat", anchor: "middle" },
  { x: 120, y: 360, text: "hot air" },
  { x: 440, y: 250, text: "steam" },
  { x: 640, y: 164, text: "superheated steam", anchor: "middle" },
  { x: 1080, y: 262, text: "vapour", anchor: "middle" },
  { x: 1292, y: 262, text: "exhaust" },
  { x: 1050, y: 215, text: "extraction steam", anchor: "middle" },
  { x: 395, y: 380, text: "drain", anchor: "middle" },
  { x: 1210, y: 450, text: "condensate", anchor: "end" },
  { x: 1292, y: 450, text: "exhaust moisture" },
  { x: 1005, y: 498, text: "Return", anchor: "middle", bold: true },
  { x: 445, y: 498, text: "hotter Return", anchor: "middle", bold: true },
  { x: 502, y: 410, text: "hottest Return", anchor: "start", bold: true },
  { x: 760, y: 588, text: "heater drain", anchor: "middle" },
  { x: 772, y: 300, text: "auxiliary steam", anchor: "end" },
  { x: 1365, y: 470, text: "makeup", anchor: "middle" },
  { x: 1365, y: 545, text: "reject", anchor: "middle" },
  { x: 1340, y: 390, text: "heat", anchor: "middle" },
  { x: 1340, y: 164, text: "shaft", anchor: "middle" },
  { x: 1520, y: 164, text: "electricity", anchor: "middle" },
  { x: 1150, y: 325, text: "vacuum", anchor: "middle" },
  { x: 1150, y: 371, text: "vacuum", anchor: "middle" },
  { x: 915, y: 398, text: "motive steam", anchor: "end" },
  { x: 640, y: 650, text: "Dashed: the air preheater, parked in #90." },
  { x: 640, y: 672, text: "Dashed: the reheater, parked in #150." },
]

export const MEDIA: readonly Medium[] = ["heat", "steam", "water", "cooling", "power", "vacuum"]

export const DIAGRAM_VALUES: readonly DiagramValue[] = [
  { id: "boilerPressure", node: "boiler", label: "Boiler pressure", widest: "999.9 bar", x: 548, y: 294, anchor: "start" },
  { id: "boilerLevel", node: "boiler", label: "Boiler level", widest: "100 %", x: 548, y: 330, anchor: "start" },
  { id: "gasFlow", node: "burner", label: "Gas flow", widest: "99999 L/s", x: 340, y: 87, anchor: "start" },
  { id: "mainSteamValve", node: "msv", label: "Main steam valve", widest: "CLOSED", x: 890, y: 190, anchor: "start" },
  { id: "turbineValve", node: "turbinevalve", label: "Turbine valve position", widest: "100 %", x: 1065, y: 110, anchor: "middle" },
  { id: "bypassValve", node: "bypass", label: "Bypass valve position", widest: "100 %", x: 960, y: 288, anchor: "middle" },
  { id: "turbineSpeed", node: "turbine", label: "Turbine speed", widest: "3500 rpm", x: 1250, y: 110, anchor: "middle" },
  { id: "output", node: "generator", label: "Output", widest: "999.9 MW", x: 1430, y: 110, anchor: "middle" },
  { id: "loadSetpoint", node: "load", label: "Load setpoint", widest: "999.9 MW", x: 1590, y: 116, anchor: "middle" },
  { id: "condenserPressure", node: "condenser", label: "Condenser pressure", widest: "1100 mbar", x: 1250, y: 388, anchor: "middle" },
  { id: "hotwellLevel", node: "hotwell", label: "Hotwell level", widest: "100 %", x: 1250, y: 516, anchor: "middle" },
  { id: "condensationPump", node: "condpump", label: "Condensation pump position", widest: "100 %", x: 1100, y: 530, anchor: "middle" },
  { id: "deaeratorTemperature", node: "deaerator", label: "Deaerator temperature", widest: "999 °C", x: 920, y: 473, anchor: "middle" },
  { id: "deaeratorLevel", node: "deaerator", label: "Deaerator level", widest: "100 %", x: 920, y: 520, anchor: "middle" },
  { id: "feedPump", node: "feedpump", label: "Boiler feed pump position", widest: "100 %", x: 770, y: 530, anchor: "middle" },
  { id: "heaterTemperature", node: "heater", label: "Extraction heater temperature", widest: "999 °C", x: 585, y: 540, anchor: "end" },
  { id: "economizerTemperature", node: "economizer", label: "Economizer temperature", widest: "999 °C", x: 265, y: 520, anchor: "middle" },
  { id: "steamTemperature", node: "superheater", label: "Steam temperature", widest: "999 °C", x: 348, y: 140, anchor: "start" },
  { id: "stackTemperature", node: "stack", label: "Stack temperature", widest: "999 °C", x: 330, y: 662, anchor: "start" },
]
