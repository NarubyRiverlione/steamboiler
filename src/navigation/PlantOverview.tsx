/** Plant overview: the plant to be (ADR 0029) as a static SVG, drawn from plantDiagram.ts. A part with controls links to its page and carries an alarm LED; no live numbers. */

import { Link } from "react-router-dom"
import { PanelFrame } from "../components/board/PanelFrame"
import { Led } from "../components/board/Led"
import usePowerPlant from "../context/PowerPlantContext"
import { DIAGRAM_HEIGHT, DIAGRAM_WIDTH, LABELS, MEDIA, NODES, PIPES, type DiagramNode } from "./plantDiagram"
import { PARTS, partAlarms } from "./plantParts"

function NodeShape({ node }: { readonly node: DiagramNode }) {
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
  return (
    <PanelFrame title="Plant" heading="h1">
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
      </svg>
    </PanelFrame>
  )
}

export default PlantOverview
