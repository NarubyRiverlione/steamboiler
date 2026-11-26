/** Electrical overview (#171): a read-only single-line schematic of the sources, breakers, buses and consumers, drawn from electricalDiagram.ts. Every lit, dimmed, open or closed state is read through the sim helpers. A breaker or source with controls links to the page that holds them. The value labels are hidden by the Values toggle. */

import { useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { Display } from "../components/board/Display"
import { LensButton } from "../components/board/LensButton"
import { Led } from "../components/board/Led"
import { PanelFrame } from "../components/board/PanelFrame"
import { isBusLive } from "../context/AuxiliaryBus"
import { consumerDraws } from "../context/AuxiliaryLoad"
import { dieselOutput } from "../context/Diesel"
import usePowerPlant from "../context/PowerPlantContext"
import { isBatteryFeeding, isSafetyBusLive, isVitalBusLive } from "../context/SafetyBus"
import {
  BREAKER_HALF,
  BUSES,
  BUS_LOADS,
  BUS_LOAD_BOX,
  CONSUMERS,
  CONSUMER_BOX,
  CONSUMER_STEM_X,
  ELECTRICAL_HEIGHT,
  ELECTRICAL_WIDTH,
  DIESEL_X,
  GENERATOR_BOX_Y,
  GENERATOR_X,
  GRID_SUPPLY_X,
  GRID_TIE_Y,
  GRID_X,
  SOURCE_BOX,
  SOURCE_BREAKER_Y,
  UNIT_AUX_BREAKER_Y,
  TOTAL_Y,
  UPS,
  SAFETY_FEED_X,
  UPS_BREAKER_Y,
  VITAL_FEED_X,
  VOLTAGES,
  consumerY,
  type Busbar,
  type BusLoad,
  type Consumer,
  type ElectricalColour,
} from "./electricalDiagram"
import { PARTS, type PartId } from "./plantParts"

const VALUE_BOX_WIDTH = 150
const VALUE_BOX_HEIGHT = 26
const VALUES_BUTTON = { x: 800, y: 20, w: 150, h: 48 } as const

const mw = (value: number): string => value.toFixed(2) + " MW"

const line = (x1: number, y1: number, x2: number, y2: number): string =>
  "M" + String(x1) + " " + String(y1) + " L" + String(x2) + " " + String(y2)

// A node that opens the page holding its controls, or a plain group when it has none
function Node({
  part,
  name,
  children,
}: {
  readonly part?: PartId
  readonly name: string
  readonly children: ReactNode
}) {
  if (part === undefined) return <g>{children}</g>
  return (
    <Link to={PARTS[part].path} className="board-node" aria-label={name + ", opens " + PARTS[part].name}>
      {children}
    </Link>
  )
}

// IEC 60617 circuit breaker: the line broken by a switch blade pivoting at the lower contact, a cross on the upper contact. Closed: the blade lies on the line; open: it swings off. Always black. The blade tip and cross are in diagram units inside the breaker footprint.
// The symbol is drawn in the 30 unit footprint and scaled up by 150%
const BREAKER_SCALE = 1.5
const BLADE_TIP = 9
const CROSS = 4

function BreakerSymbol({
  x,
  y,
  closed,
  name,
}: {
  readonly x: number
  readonly y: number
  readonly closed: boolean
  readonly name: string
}) {
  return (
    <g
      role="img"
      aria-label={name + ": " + (closed ? "closed" : "open")}
      data-closed={closed}
      transform={"translate(" + String(x) + " " + String(y) + ") scale(" + String(BREAKER_SCALE) + ")"}
    >
      <rect
        className="board-node-hit"
        x={-BREAKER_HALF - 6}
        y={-BREAKER_HALF - 6}
        width={2 * BREAKER_HALF + 12}
        height={2 * BREAKER_HALF + 12}
      />
      <rect
        className="board-overview-bg"
        x={-BREAKER_HALF}
        y={-BREAKER_HALF}
        width={2 * BREAKER_HALF}
        height={2 * BREAKER_HALF}
      />
      <g className="board-breaker-symbol">
        <path d={line(0, -BREAKER_HALF, 0, -BLADE_TIP)} />
        <path d={line(0, BLADE_TIP, 0, BREAKER_HALF)} />
        <path d={closed ? line(0, BLADE_TIP, 0, -BLADE_TIP) : line(0, BLADE_TIP, -BLADE_TIP, -BLADE_TIP + 2)} />
        <path d={line(-CROSS, -BLADE_TIP - CROSS, CROSS, -BLADE_TIP + CROSS) + " " + line(-CROSS, -BLADE_TIP + CROSS, CROSS, -BLADE_TIP - CROSS)} />
      </g>
    </g>
  )
}

function ValueLabel({
  label,
  text,
  x,
  y,
  anchor,
  widest,
}: {
  readonly label: string
  readonly text: string
  readonly x: number
  readonly y: number
  readonly anchor: "start" | "middle" | "end"
  readonly widest: string
}) {
  const left: number =
    anchor === "start" ? x : anchor === "middle" ? x - VALUE_BOX_WIDTH / 2 : x - VALUE_BOX_WIDTH
  const justify: string = anchor === "start" ? "flex-start" : anchor === "middle" ? "center" : "flex-end"
  return (
    <foreignObject x={left} y={y} width={VALUE_BOX_WIDTH} height={VALUE_BOX_HEIGHT} pointerEvents="none">
      <div className="board-overview-value" style={{ justifyContent: justify }}>
        <Display label={label} text={text} widest={widest} />
      </div>
    </foreignObject>
  )
}

const dim = (lit: boolean): string => (lit ? "" : " board-electrical-dim")

// The colour class of a source, the UPS or a bus; its lines, boxes and closed breakers draw in currentColor
const colour = (id: ElectricalColour): string => "board-electrical-" + id

// A source box: it links to the page that holds its controls when it has a link; without one it dims while its supply is off
function SourceBox({
  x,
  y,
  name,
  part,
  lit,
}: {
  readonly x: number
  readonly y: number
  readonly name: string
  readonly part?: PartId
  readonly lit: boolean
}) {
  return (
    <Node part={part} name={name}>
      <rect className="board-node-hit" x={x - SOURCE_BOX.w / 2} y={y} width={SOURCE_BOX.w} height={SOURCE_BOX.h} />
      <rect
        className={"board-node-box board-electrical-line" + (part === undefined ? dim(lit) : "")}
        x={x - SOURCE_BOX.w / 2}
        y={y}
        width={SOURCE_BOX.w}
        height={SOURCE_BOX.h}
        rx={4}
      />
      <text className="board-node-name" x={x} y={y + SOURCE_BOX.h / 2 + 6}>
        {name}
      </text>
    </Node>
  )
}

// The grid box on top with the tie rail the grid supply and the generator breaker hang on: the grid is always up for now (#189)
function GridSource({ showValues }: { readonly showValues: boolean }) {
  return (
    <g className={colour("grid")} data-grid>
      <path className="board-pipe board-electrical-line" d={line(GRID_X, SOURCE_BOX.y + SOURCE_BOX.h, GRID_X, GRID_TIE_Y)} />
      <path className="board-pipe board-electrical-line" d={line(GRID_SUPPLY_X, GRID_TIE_Y, GENERATOR_X, GRID_TIE_Y)} />
      <SourceBox x={GRID_X} y={SOURCE_BOX.y} name="Grid" lit />
      {showValues && (
        <ValueLabel
          label="Grid voltage"
          text={VOLTAGES.grid.live}
          x={GRID_X + SOURCE_BOX.w / 2 + 12}
          y={SOURCE_BOX.y + (SOURCE_BOX.h - VALUE_BOX_HEIGHT) / 2}
          anchor="start"
          widest="110 kV"
        />
      )}
    </g>
  )
}

// The grid supply breaker: the station supply, from the tie rail to the Auxiliary bus; no export (ADR 0053)
function GridSupplyColumn({ closed }: { readonly closed: boolean }) {
  return (
    <g className={colour("grid")} data-source="grid" data-lit={closed}>
      <path
        className={"board-pipe board-electrical-line" + dim(closed)}
        d={line(GRID_SUPPLY_X, GRID_TIE_Y, GRID_SUPPLY_X, BUSES[0].y)}
      />
      <Node part="auxiliaryBus" name="Grid supply breaker">
        <BreakerSymbol x={GRID_SUPPLY_X} y={SOURCE_BREAKER_Y} closed={closed} name="Grid supply breaker" />
      </Node>
    </g>
  )
}

// The generator column: the generator breaker ties the Generator to the grid (the export), the unit aux breaker lets it feed the Auxiliary bus (#189)
function GeneratorColumn({ generatorClosed, unitAuxClosed }: { readonly generatorClosed: boolean; readonly unitAuxClosed: boolean }) {
  const boxBottom: number = GENERATOR_BOX_Y + SOURCE_BOX.h
  return (
    <>
      <g className={colour("generator")} data-source="generator-tie" data-lit={generatorClosed}>
        <path
          className={"board-pipe board-electrical-line" + dim(generatorClosed)}
          d={line(GENERATOR_X, GRID_TIE_Y, GENERATOR_X, GENERATOR_BOX_Y)}
        />
        <Node part="generation" name="Generator breaker">
          <BreakerSymbol x={GENERATOR_X} y={SOURCE_BREAKER_Y} closed={generatorClosed} name="Generator breaker" />
        </Node>
      </g>
      <g className={colour("generator")} data-source="generator" data-lit={unitAuxClosed}>
        <path
          className={"board-pipe board-electrical-line" + dim(unitAuxClosed)}
          d={line(GENERATOR_X, boxBottom, GENERATOR_X, BUSES[0].y)}
        />
        <SourceBox x={GENERATOR_X} y={GENERATOR_BOX_Y} name="Generator" part="generation" lit />
        <Node part="auxiliaryBus" name="Unit aux breaker">
          <BreakerSymbol x={GENERATOR_X} y={UNIT_AUX_BREAKER_Y} closed={unitAuxClosed} name="Unit aux breaker" />
        </Node>
      </g>
    </>
  )
}

function DieselColumn({ closed, showValues, output }: { readonly closed: boolean; readonly showValues: boolean; readonly output: number }) {
  return (
    <g className={colour("diesel")} data-source="diesel" data-lit={closed}>
      <path
        className={"board-pipe board-electrical-line" + dim(closed)}
        d={line(DIESEL_X, SOURCE_BOX.y + SOURCE_BOX.h, DIESEL_X, BUSES[0].y)}
      />
      <SourceBox x={DIESEL_X} y={SOURCE_BOX.y} name="Diesel generator" part="diesel" lit />
      <Node part="diesel" name="Diesel generator breaker">
        <BreakerSymbol x={DIESEL_X} y={SOURCE_BREAKER_Y} closed={closed} name="Diesel generator breaker" />
      </Node>
      {showValues && (
        <ValueLabel
          label="Diesel output"
          text={mw(output)}
          x={DIESEL_X + 20}
          y={SOURCE_BREAKER_Y - VALUE_BOX_HEIGHT / 2}
          anchor="start"
          widest="0.00 MW"
        />
      )}
    </g>
  )
}

function BusLine({
  bus,
  live,
  showValues,
  voltage,
}: {
  readonly bus: Busbar
  readonly live: boolean
  readonly showValues: boolean
  readonly voltage: string
}) {
  return (
    <g className={colour(bus.id) + dim(live)} data-bus={bus.id} data-live={live}>
      <path className="board-bus board-electrical-line" d={line(bus.x1, bus.y, bus.x2, bus.y)} />
      <text
        className="board-node-name board-bus-name"
        x={bus.x1}
        y={bus.y - 14}
        style={{ textAnchor: "start" }}
      >
        {bus.name}
      </text>
      {showValues && (
        <ValueLabel
          label={bus.name + " voltage"}
          text={voltage}
          x={bus.x1 + 140}
          y={bus.y - 38}
          anchor="start"
          widest="110 V DC"
        />
      )}
    </g>
  )
}

function Consumers({
  draws,
  live,
  showValues,
}: {
  readonly draws: readonly number[]
  readonly live: boolean
  readonly showValues: boolean
}) {
  const lastY: number = consumerY(CONSUMERS.length - 1)
  return (
    <g className={colour("aux")} data-consumers data-live={live}>
      <path
        className={"board-pipe board-electrical-line" + dim(live)}
        d={line(CONSUMER_STEM_X, BUSES[0].y, CONSUMER_STEM_X, lastY)}
      />
      {CONSUMERS.map(({ name, part }: Consumer, index: number) => {
        const y: number = consumerY(index)
        return (
          <g key={name}>
            <path
              className={"board-pipe board-electrical-line" + dim(live)}
              d={line(CONSUMER_STEM_X, y, CONSUMER_BOX.x, y)}
            />
            <Node part={part} name={name}>
              <rect
                className="board-node-hit"
                x={CONSUMER_BOX.x}
                y={y - CONSUMER_BOX.h / 2}
                width={CONSUMER_BOX.w}
                height={CONSUMER_BOX.h}
              />
              <rect
                className="board-node-box board-electrical-line"
                x={CONSUMER_BOX.x}
                y={y - CONSUMER_BOX.h / 2}
                width={CONSUMER_BOX.w}
                height={CONSUMER_BOX.h}
                rx={4}
              />
              <g transform={"translate(" + String(CONSUMER_BOX.x + 22) + " " + String(y) + ")"}>
                <Led lit={draws[index] > 0} tone="ok" label={name} />
              </g>
              <text
                className="board-node-name"
                x={CONSUMER_BOX.x + 46}
                y={y + 5}
                style={{ textAnchor: "start" }}
              >
                {name}
              </text>
            </Node>
            {showValues && (
              <ValueLabel
                label={name + " draw"}
                text={mw(draws[index])}
                x={CONSUMER_BOX.x + CONSUMER_BOX.w + 12}
                y={y - VALUE_BOX_HEIGHT / 2}
                anchor="start"
                widest="0.00 MW"
              />
            )}
          </g>
        )
      })}
      <text
        className={"board-node-name" + dim(live)}
        x={CONSUMER_BOX.x}
        y={TOTAL_Y + 18}
        style={{ textAnchor: "start" }}
      >
        Auxiliary load
      </text>
      {showValues && (
        <ValueLabel
          label="Auxiliary load"
          text={mw(draws.reduce((total: number, draw: number) => total + draw, 0))}
          x={CONSUMER_BOX.x + CONSUMER_BOX.w + 12}
          y={TOTAL_Y}
          anchor="start"
          widest="00.00 MW"
        />
      )}
    </g>
  )
}

function BusLoads({ vitalLive, safetyLive }: { readonly vitalLive: boolean; readonly safetyLive: boolean }) {
  return (
    <>
      {BUS_LOADS.map(({ bus, name, stemX, y }: BusLoad) => {
        const live: boolean = bus === "vital" ? vitalLive : safetyLive
        const busY: number = BUSES.find((b: Busbar) => b.id === bus)?.y ?? y
        const x: number = stemX + BUS_LOAD_BOX.gap
        return (
          <g key={name} className={colour(bus) + dim(live)} data-bus-load={bus}>
            <path className="board-pipe board-electrical-line" d={line(stemX, busY, stemX, y)} />
            <path className="board-pipe board-electrical-line" d={line(stemX, y, x, y)} />
            <rect
              className="board-node-box board-electrical-line"
              x={x}
              y={y - BUS_LOAD_BOX.h / 2}
              width={BUS_LOAD_BOX.w}
              height={BUS_LOAD_BOX.h}
              rx={4}
            />
            <g transform={"translate(" + String(x + 22) + " " + String(y) + ")"}>
              <Led lit={live} tone="ok" label={name} />
            </g>
            <text className="board-node-name" x={x + 46} y={y + 5} style={{ textAnchor: "start" }}>
              {name}
            </text>
          </g>
        )
      })}
    </>
  )
}

function ElectricalOverview() {
  const { state } = usePowerPlant()
  const [showValues, setShowValues] = useState<boolean>(true)
  const auxLive: boolean = isBusLive(state)
  const vitalLive: boolean = isVitalBusLive(state)
  const safetyLive: boolean = isSafetyBusLive(state)
  const draws: readonly number[] = consumerDraws(state)
  const [aux, vital, safety] = BUSES
  const upsLink: PartId = "auxiliaryBus"
  const voltage = (live: boolean, v: { readonly live: string; readonly dead: string }): string =>
    live ? v.live : v.dead
  return (
    <PanelFrame title="Electrical">
      <svg
        className="board-overview"
        viewBox={"0 0 " + String(ELECTRICAL_WIDTH) + " " + String(ELECTRICAL_HEIGHT)}
        role="group"
        aria-label="Electrical overview"
      >
        <rect className="board-overview-bg" width={ELECTRICAL_WIDTH} height={ELECTRICAL_HEIGHT} rx="8" />
        <foreignObject
          x={VALUES_BUTTON.x}
          y={VALUES_BUTTON.y}
          width={VALUES_BUTTON.w}
          height={VALUES_BUTTON.h}
        >
          <div className="board-overview-toggle">
            <LensButton
              pressed={showValues}
              onClick={() => {
                setShowValues(!showValues)
              }}
            >
              Values
            </LensButton>
          </div>
        </foreignObject>
        <GridSource showValues={showValues} />
        <GridSupplyColumn closed={state.gridSupplyBreaker} />
        <GeneratorColumn generatorClosed={state.Turbine.generatorBreaker} unitAuxClosed={state.Turbine.unitAuxBreaker} />
        <DieselColumn closed={state.dieselBreaker} showValues={showValues} output={dieselOutput(state)} />
        <BusLine bus={aux} live={auxLive} showValues={showValues} voltage={voltage(auxLive, VOLTAGES.aux)} />
        <Consumers draws={draws} live={auxLive} showValues={showValues} />
        <g className={colour("vital") + dim(vitalLive)} data-feed="vital">
          <path
            className="board-pipe board-electrical-line"
            d={line(VITAL_FEED_X, aux.y, VITAL_FEED_X, vital.y)}
          />
        </g>
        <BusLine
          bus={vital}
          live={vitalLive}
          showValues={showValues}
          voltage={voltage(vitalLive, VOLTAGES.vital)}
        />
        <BusLoads vitalLive={vitalLive} safetyLive={safetyLive} />
        <g className={colour("aux") + dim(auxLive)} data-feed="safety-ac">
          <path
            className="board-pipe board-electrical-line"
            d={line(SAFETY_FEED_X, aux.y, SAFETY_FEED_X, safety.y)}
          />
        </g>
        <g className={colour("ups") + dim(isBatteryFeeding(state))} data-feed="safety">
          <path
            className="board-pipe board-electrical-line"
            d={line(UPS.x, UPS_BREAKER_Y, UPS.x, safety.y)}
          />
        </g>
        <g className={colour("ups")} data-ups>
          <Node part={upsLink} name="UPS">
            <rect className="board-node-hit" x={UPS.x - UPS.w / 2} y={UPS.y} width={UPS.w} height={UPS.h} />
            <rect
              className="board-node-box board-electrical-line"
              x={UPS.x - UPS.w / 2}
              y={UPS.y}
              width={UPS.w}
              height={UPS.h}
              rx={4}
            />
            <text className="board-node-name" x={UPS.x} y={UPS.y + UPS.h / 2 + 6}>
              UPS
            </text>
          </Node>
          <path
            className="board-pipe board-electrical-line"
            d={line(UPS.x, UPS.y + UPS.h, UPS.x, UPS_BREAKER_Y)}
          />
          <Node part={upsLink} name="Battery breaker">
            <BreakerSymbol x={UPS.x} y={UPS_BREAKER_Y} closed={state.upsBreaker} name="Battery breaker" />
          </Node>
        </g>
        {showValues && (
          <ValueLabel
            label="UPS charge"
            text={String(Math.round(state.upsCharge)) + " %"}
            x={UPS.x - UPS.w / 2 - 12}
            y={UPS.y + 9}
            anchor="end"
            widest="100 %"
          />
        )}
        <BusLine
          bus={safety}
          live={safetyLive}
          showValues={showValues}
          voltage={voltage(safetyLive, VOLTAGES.safety)}
        />
      </svg>
    </PanelFrame>
  )
}

export default ElectricalOverview
