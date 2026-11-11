import type { ReactNode } from "react"
/** Plant overview: the plant to be (ADR 0029) as an SVG, drawn from plantDiagram.ts. A part with controls links to its page and carries an alarm LED. The only live values are the deaerator's: temperature, level and, while the start-up vent is open, the safe-to-close lamp (ADR 0038). */

import { Link } from "react-router-dom"
import { PanelFrame } from "../components/board/PanelFrame"
import { Led } from "../components/board/Led"
import usePowerPlant from "../context/PowerPlantContext"
import { DIAGRAM_HEIGHT, DIAGRAM_WIDTH, LABELS, MEDIA, NODES, PIPES, type DiagramNode, type NodeSymbol } from "./plantDiagram"
import { CstDeaerator } from "../context/const"
import { PARTS, partAlarms } from "./plantParts"

const GLYPH_HALF = 18

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
  const labelAnchor: "start" | "middle" = node.label === "right" ? "start" : "middle"
  const labelX: number = node.label === "right" ? cx + GLYPH_HALF + 8 : cx
  const lineHeight = 18
  const firstY: number =
    node.label === "below"
      ? cy + GLYPH_HALF + 16
      : node.label === "right"
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
        <text key={line} className="board-node-name" x={labelX} y={firstY + index * lineHeight} textAnchor={labelAnchor}>
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

function PlantOverview() {
  const { state } = usePowerPlant()
  const alarms = partAlarms(state)
  const { temperature, waterVolume, startUpVentOpen, safeToClose } = state.Deaerator
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
            <text className="board-node-value" x={deaerator.x + deaerator.w / 2} y={deaerator.y + 20}>
              {temperature.toFixed(0)} °C
            </text>
            <text className="board-node-value" x={deaerator.x + deaerator.w / 2} y={deaerator.y + deaerator.h - 10}>
              {((waterVolume / CstDeaerator.TotalVolume) * 100).toFixed(0)} %
            </text>
            {startUpVentOpen && (
              <g transform={"translate(" + String(deaerator.x + deaerator.w) + " " + String(deaerator.y) + ")"}>
                <Led lit={safeToClose} tone="ok" label="Deaerator safe to close" />
              </g>
            )}
          </g>
        )}
      </svg>
    </PanelFrame>
  )
}

export default PlantOverview
