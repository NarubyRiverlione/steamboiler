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
import type PowerPlantState from "../context/PowerPlantState"
import { isSafetyBusLive, isVitalBusLive } from "../context/SafetyBus"
import {
  BREAKER_HALF,
  BUSES,
  CONSUMERS,
  CONSUMER_BOX,
  CONSUMER_STEM_X,
  ELECTRICAL_HEIGHT,
  ELECTRICAL_WIDTH,
  SOURCES,
  SOURCE_BOX,
  SOURCE_BREAKER_Y,
  TOTAL_Y,
  UPS,
  UPS_BREAKER_Y,
  VITAL_FEED_X,
  VOLTAGES,
  consumerY,
  type Busbar,
  type ElectricalSource,
  type SourceId,
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

// A breaker symbol: filled while closed, hollow with a gap while open
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
      transform={"translate(" + String(x) + " " + String(y) + ")"}
    >
      <rect
        className="board-node-hit"
        x={-BREAKER_HALF - 6}
        y={-BREAKER_HALF - 6}
        width={2 * BREAKER_HALF + 12}
        height={2 * BREAKER_HALF + 12}
      />
      <rect
        className={
          closed
            ? "board-node-box board-medium-power board-breaker-closed"
            : "board-node-box board-medium-power"
        }
        x={-BREAKER_HALF}
        y={-BREAKER_HALF}
        width={2 * BREAKER_HALF}
        height={2 * BREAKER_HALF}
        rx={3}
      />
      {!closed && (
        <path
          className="board-medium-line-power"
          d={line(-BREAKER_HALF + 4, BREAKER_HALF - 4, BREAKER_HALF - 4, -BREAKER_HALF + 4)}
        />
      )}
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

// Whether each source feeds the Auxiliary bus: its breaker is closed
const sourceClosed = (state: PowerPlantState): Record<SourceId, boolean> => ({
  grid: state.gridSupplyBreaker,
  generator: state.Turbine.generatorBreaker,
  diesel: state.dieselBreaker,
})

function SourceColumn({
  source,
  closed,
  showValues,
  diesel,
}: {
  readonly source: ElectricalSource
  readonly closed: boolean
  readonly showValues: boolean
  readonly diesel: number
}) {
  const { x } = source
  const breakerName: string = source.id === "grid" ? "Grid supply breaker" : source.name + " breaker"
  const auxY: number = BUSES[0].y
  return (
    <g className={dim(closed).trim()} data-source={source.id} data-lit={closed}>
      <path
        className="board-pipe board-medium-line-power"
        d={line(x, SOURCE_BOX.y + SOURCE_BOX.h, x, auxY)}
      />
      <Node part={source.nodeLinks === true ? source.part : undefined} name={source.name}>
        <rect
          className="board-node-hit"
          x={x - SOURCE_BOX.w / 2}
          y={SOURCE_BOX.y}
          width={SOURCE_BOX.w}
          height={SOURCE_BOX.h}
        />
        <rect
          className="board-node-box board-medium-power"
          x={x - SOURCE_BOX.w / 2}
          y={SOURCE_BOX.y}
          width={SOURCE_BOX.w}
          height={SOURCE_BOX.h}
          rx={4}
        />
        <text className="board-node-name" x={x} y={SOURCE_BOX.y + SOURCE_BOX.h / 2 + 6}>
          {source.name}
        </text>
      </Node>
      <Node part={source.part} name={breakerName}>
        <BreakerSymbol x={x} y={SOURCE_BREAKER_Y} closed={closed} name={breakerName} />
      </Node>
      {showValues && source.id === "grid" && (
        <ValueLabel
          label="Grid voltage"
          text={VOLTAGES.grid.live}
          x={x + 20}
          y={SOURCE_BREAKER_Y - VALUE_BOX_HEIGHT / 2}
          anchor="start"
          widest="110 kV"
        />
      )}
      {showValues && source.id === "diesel" && (
        <ValueLabel
          label="Diesel output"
          text={mw(diesel)}
          x={x + 20}
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
    <g className={dim(live).trim()} data-bus={bus.id} data-live={live}>
      <path className="board-bus board-medium-line-power" d={line(bus.x1, bus.y, bus.x2, bus.y)} />
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
    <g className={dim(live).trim()} data-consumers>
      <path
        className="board-pipe board-medium-line-power"
        d={line(CONSUMER_STEM_X, BUSES[0].y, CONSUMER_STEM_X, lastY)}
      />
      {CONSUMERS.map((name: string, index: number) => {
        const y: number = consumerY(index)
        return (
          <g key={name}>
            <path
              className="board-pipe board-medium-line-power"
              d={line(CONSUMER_STEM_X, y, CONSUMER_BOX.x, y)}
            />
            <rect
              className="board-node-box board-medium-power"
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
      <text className="board-node-name" x={CONSUMER_BOX.x} y={TOTAL_Y + 18} style={{ textAnchor: "start" }}>
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

function ElectricalOverview() {
  const { state } = usePowerPlant()
  const [showValues, setShowValues] = useState<boolean>(true)
  const closed: Record<SourceId, boolean> = sourceClosed(state)
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
        {SOURCES.map((source: ElectricalSource) => (
          <SourceColumn
            key={source.id}
            source={source}
            closed={closed[source.id]}
            showValues={showValues}
            diesel={dieselOutput(state)}
          />
        ))}
        <BusLine bus={aux} live={auxLive} showValues={showValues} voltage={voltage(auxLive, VOLTAGES.aux)} />
        <Consumers draws={draws} live={auxLive} showValues={showValues} />
        <g className={dim(vitalLive).trim()} data-feed="vital">
          <path
            className="board-pipe board-medium-line-power"
            d={line(VITAL_FEED_X, aux.y, VITAL_FEED_X, vital.y)}
          />
        </g>
        <BusLine
          bus={vital}
          live={vitalLive}
          showValues={showValues}
          voltage={voltage(vitalLive, VOLTAGES.vital)}
        />
        <g className={dim(safetyLive).trim()} data-feed="safety">
          <path
            className="board-pipe board-medium-line-power"
            d={line(UPS.x, UPS_BREAKER_Y, UPS.x, safety.y)}
          />
        </g>
        <Node part={upsLink} name="UPS">
          <rect className="board-node-hit" x={UPS.x - UPS.w / 2} y={UPS.y} width={UPS.w} height={UPS.h} />
          <rect
            className={"board-node-box board-medium-power" + dim(state.upsCharge > 0)}
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
          className="board-pipe board-medium-line-power"
          d={line(UPS.x, UPS.y + UPS.h, UPS.x, UPS_BREAKER_Y)}
        />
        <Node part={upsLink} name="UPS breaker">
          <BreakerSymbol x={UPS.x} y={UPS_BREAKER_Y} closed={state.upsBreaker} name="UPS breaker" />
        </Node>
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
