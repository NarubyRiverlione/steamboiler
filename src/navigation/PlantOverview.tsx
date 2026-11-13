/** Plant overview: the plant to be (ADR 0029) as an SVG, drawn from plantDiagram.ts. A part with controls links to its page and carries an alarm LED. The live values (#99) are LCD labels beside the nodes, all hidden by the Values toggle: the list is DIAGRAM_VALUES; the deaerator's safe-to-close lamp (ADR 0038) is not a value and always shows. */

import { useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { PanelFrame } from "../components/board/PanelFrame"
import { Led } from "../components/board/Led"
import { Display } from "../components/board/Display"
import { LensButton } from "../components/board/LensButton"
import usePowerPlant from "../context/PowerPlantContext"
import useEMA from "../utils/useEMA"
import {
  DIAGRAM_HEIGHT,
  DIAGRAM_VALUES,
  DIAGRAM_WIDTH,
  LABELS,
  MEDIA,
  NODES,
  PIPES,
  type DiagramNode,
  type DiagramValue,
  type NodeSymbol,
} from "./plantDiagram"
import { hotwellFraction, overviewValueTexts } from "./overviewValues"
import { PARTS, partAlarms } from "./plantParts"

const GLYPH_HALF = 18
// A value label is a foreignObject this wide and tall; the LCD inside sits at the edge its anchor names
const VALUE_BOX_WIDTH = 150
const VALUE_BOX_HEIGHT = 26
// The Values toggle stands in the free spot left of the gas supply
const VALUES_BUTTON = { x: 40, y: 14, w: 140, h: 40 } as const
const VALUE_JUSTIFY = { start: "flex-start", middle: "center", end: "flex-end" } as const

function glyphPaths(symbol: NodeSymbol): ReactNode {
  if (symbol === "valve") return <path d="M-16 -11 L16 11 L16 -11 L-16 11 Z" />
  return (
    <>
      <circle r={GLYPH_HALF} />
      <path d="M-7 -9 L9 0 L-7 9 Z" />
    </>
  )
}

// The industry symbol of a valve, check valve or pump, on a line through the node's box that joins the pipes
function SymbolShape({ node, symbol }: { readonly node: DiagramNode; readonly symbol: NodeSymbol }) {
  const cx: number = node.x + node.w / 2
  const cy: number = node.y + node.h / 2
  const down: boolean = node.flow === "down"
  const transform: string =
    "translate(" + String(cx) + " " + String(cy) + ")" + (down ? " rotate(90)" : node.flow === "left" ? " scale(-1 1)" : "")
  const side: boolean = node.label === "left"
  const labelAnchor: "end" | "middle" = side ? "end" : "middle"
  const labelX: number = side ? cx - GLYPH_HALF - 8 : cx + (node.labelDx ?? 0)
  const lineHeight = 18
  const firstY: number =
    side
      ? cy + 5 - ((node.name.length - 1) * lineHeight) / 2
      : cy - GLYPH_HALF - 6 - (node.name.length - 1) * lineHeight
  return (
    <>
      <rect className="board-node-hit" x={node.x} y={node.y} width={node.w} height={node.h} />
      {down ? (
        <path className={"board-pipe board-medium-line-" + node.medium} d={"M" + String(cx) + " " + String(node.y) + " L" + String(cx) + " " + String(node.y + node.h)} />
      ) : (
        <path className={"board-pipe board-medium-line-" + node.medium} d={"M" + String(node.x) + " " + String(cy) + " L" + String(node.x + node.w) + " " + String(cy)} />
      )}
      <g className={"board-node-box board-node-symbol board-medium-" + node.medium} transform={transform}>
        {glyphPaths(symbol)}
      </g>
      {node.name.map((line: string, index: number) => (
        <text key={line} className="board-node-name" x={labelX} y={firstY + index * lineHeight} style={{ textAnchor: labelAnchor }}>
          {line}
        </text>
      ))}
    </>
  )
}

function NodeShape({ node }: { readonly node: DiagramNode }) {
  if (node.symbol !== undefined) return <SymbolShape node={node} symbol={node.symbol} />
  const lineHeight = 18
  const first: number = node.y + node.h / 2 + 6 - (node.name.length - 1) * (lineHeight / 2)
  return (
    <>
      <rect
        className={"board-node-box board-medium-" + node.medium}
        x={node.x}
        y={node.y}
        width={node.w}
        height={node.h}
        rx={node.round === true ? node.h / 2 : 4}
        strokeDasharray={node.parked === true ? "8 6" : undefined}
      />
      {node.name.map((line: string, index: number) => (
        <text key={line} className="board-node-name" x={node.x + node.w / 2} y={first + index * lineHeight}>
          {line}
        </text>
      ))}
    </>
  )
}

function ValueLabel({ value, text }: { readonly value: DiagramValue; readonly text: string }) {
  const left: number = value.anchor === "start" ? value.x : value.anchor === "middle" ? value.x - VALUE_BOX_WIDTH / 2 : value.x - VALUE_BOX_WIDTH
  return (
    <foreignObject x={left} y={value.y} width={VALUE_BOX_WIDTH} height={VALUE_BOX_HEIGHT} pointerEvents="none">
      <div className="board-overview-value" style={{ justifyContent: VALUE_JUSTIFY[value.anchor] }}>
        <Display label={value.label} text={text} widest={value.widest} />
      </div>
    </foreignObject>
  )
}

function PlantOverview() {
  const { state } = usePowerPlant()
  const [showValues, setShowValues] = useState<boolean>(true)
  // Same smoothing as the Boiler and Condenser pages, so the numbers match
  const smoothPressure: number = useEMA(state.Boiler.pressure, 0.01)
  const hotwellLevel: number = useEMA(hotwellFraction(state), 0.1)
  const texts = overviewValueTexts(state, { pressure: smoothPressure, hotwellLevel })
  const alarms = partAlarms(state)
  const { startUpVentOpen, safeToClose } = state.Deaerator
  const deaerator: DiagramNode | undefined = NODES.find((node: DiagramNode) => node.id === "deaerator")
  return (
    <PanelFrame title="Plant">
      <svg
        className="board-overview"
        viewBox={"0 0 " + String(DIAGRAM_WIDTH) + " " + String(DIAGRAM_HEIGHT)}
        role="group"
        aria-label="Plant overview"
      >
        <defs>
          {MEDIA.map((medium: string) => (
            <marker
              key={medium}
              id={"board-arrow-" + medium}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path className={"board-medium-fill-" + medium} d="M0 0L10 5L0 10z" />
            </marker>
          ))}
        </defs>
        <rect className="board-overview-bg" width={DIAGRAM_WIDTH} height={DIAGRAM_HEIGHT} rx="8" />
        {PIPES.map((pipe) => (
          <path
            key={pipe.d}
            className={"board-pipe board-medium-line-" + pipe.medium}
            d={pipe.d}
            markerEnd={"url(#board-arrow-" + pipe.medium + ")"}
            strokeDasharray={pipe.dashed === true ? "8 6" : undefined}
          />
        ))}
        {LABELS.map((label) => (
          <text
            key={label.text + String(label.x) + String(label.y)}
            className={label.bold === true ? "board-pipe-label board-pipe-label-bold" : "board-pipe-label"}
            x={label.x}
            y={label.y}
            textAnchor={label.anchor ?? "start"}
          >
            {label.text}
          </text>
        ))}
        <foreignObject x={VALUES_BUTTON.x} y={VALUES_BUTTON.y} width={VALUES_BUTTON.w} height={VALUES_BUTTON.h}>
          <div className="board-overview-toggle">
            <LensButton small pressed={showValues} onClick={() => { setShowValues(!showValues); }}>
              Values
            </LensButton>
          </div>
        </foreignObject>
        {NODES.map((node: DiagramNode) =>
          node.part === undefined ? (
            <g key={node.id} className={node.parked === true ? "board-node-parked" : undefined}>
              <NodeShape node={node} />
            </g>
          ) : (
            <Link
              key={node.id}
              to={PARTS[node.part].path}
              className="board-node"
              aria-label={node.name.join(" ") + ", opens " + PARTS[node.part].name}
            >
              <NodeShape node={node} />
            </Link>
          ),
        )}
        {NODES.filter((node: DiagramNode) => node.led === true && node.part !== undefined).map(
          (node: DiagramNode) => (
            <g
              key={node.id + "-led"}
              transform={"translate(" + String(node.x + node.w) + " " + String(node.y) + ")"}
            >
              <Led lit={alarms[node.part ?? "boiler"]} label={PARTS[node.part ?? "boiler"].name + " alarm"} />
            </g>
          ),
        )}
        {deaerator !== undefined && (
          <g className="board-node-values" pointerEvents="none">
            {startUpVentOpen && (
              <g transform={"translate(" + String(deaerator.x + deaerator.w) + " " + String(deaerator.y) + ")"}>
                <Led lit={safeToClose} tone="ok" label="Deaerator safe to close" />
              </g>
            )}
          </g>
        )}
        {showValues && DIAGRAM_VALUES.map((value: DiagramValue) => <ValueLabel key={value.id} value={value} text={texts[value.id]} />)}
      </svg>
    </PanelFrame>
  )
}

export default PlantOverview
