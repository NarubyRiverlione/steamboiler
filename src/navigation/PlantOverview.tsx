/** Plant overview: the plant to be (ADR 0029) as a static SVG. A part with controls links to its page and carries an alarm LED; no live numbers. */

import { Link } from "react-router-dom"
import type { ReactNode } from "react"
import { PanelFrame } from "../components/board/PanelFrame"
import { Led } from "../components/board/Led"
import usePowerPlant from "../context/PowerPlantContext"
import { PARTS, type PartId, partAlarms } from "./plantParts"

const MARKERS: readonly (readonly [string, string])[] = [
  ["heat", "#d9480f"],
  ["steam", "#9c36b5"],
  ["water", "#1971c2"],
  ["cooling", "#0c8599"],
  ["power", "#b08900"],
  ["vacuum", "#6c757d"],
]

function PartNode({
  part,
  label,
  children,
}: {
  readonly part: PartId
  readonly label: string
  readonly children: ReactNode
}) {
  const { path, name } = PARTS[part]
  return (
    <Link to={path} className="board-node" aria-label={label + ", opens " + name}>
      {children}
    </Link>
  )
}

function AlarmLed({ part, x, y }: { readonly part: PartId; readonly x: number; readonly y: number }) {
  const { state } = usePowerPlant()
  const lit: boolean = partAlarms(state)[part]
  return (
    <g transform={"translate(" + String(x) + " " + String(y) + ")"}>
      <Led lit={lit} label={PARTS[part].name + " alarm"} />
    </g>
  )
}

function PlantOverview() {
  return (
    <PanelFrame title="Plant overview" heading="h1">
      <svg className="board-overview" viewBox="0 0 1660 930" role="group" aria-label="The plant to be">
        <defs>
          {MARKERS.map(([id, color]) => (
            <marker
              key={id}
              id={"a-" + id}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0 0L10 5L0 10z" fill={color} />
            </marker>
          ))}
        </defs>
        <rect className="n-heat" x="205" y="20" width="120" height="44" rx="22" />
        <text className="name" x="265" y="42">
          Gas supply
        </text>
        <PartNode part="boiler" label="Burner">
          <rect className="n-heat" x="200" y="105" width="130" height="50" rx="3" />
          <text className="name" x="265" y="130">
            Burner
          </text>
        </PartNode>
        <rect className="n-heat" x="200" y="200" width="130" height="60" rx="3" />
        <text className="name" x="265" y="230">
          Boiler surface
        </text>
        <rect className="n-heat" x="200" y="590" width="130" height="100" rx="3" />
        <text className="name" x="265" y="640">
          Economizer
        </text>
        <rect className="planned l-heat" x="200" y="750" width="130" height="60" rx="3" />
        <text className="name planned-name" x="265" y="780">
          Air preheater
        </text>
        <rect className="n-heat" x="210" y="860" width="110" height="44" rx="22" />
        <text className="name" x="265" y="882">
          Stack
        </text>
        <rect className="n-heat" x="400" y="50" width="125" height="50" rx="25" />
        <text className="name" x="462.5" y="75">
          Surroundings
        </text>
        <path className="line l-heat" d="M265 64 L265 104" markerEnd="url(#a-heat)" />
        <path className="line l-heat" d="M265 155 L265 199" markerEnd="url(#a-heat)" />
        <path className="line l-heat" d="M265 260 L265 589" markerEnd="url(#a-heat)" />
        <path className="line l-heat" d="M265 690 L265 749" markerEnd="url(#a-heat)" />
        <path className="line l-heat" d="M265 810 L265 859" markerEnd="url(#a-heat)" />
        <path className="line l-heat" d="M330 230 L399 230" markerEnd="url(#a-heat)" />
        <path className="line l-heat" d="M462 200 L462 101" markerEnd="url(#a-heat)" />
        <text className="label" x="275" y="182">
          flue gas
        </text>
        <text className="label" x="275" y="425">
          flue gas
        </text>
        <text className="label" x="275" y="725">
          flue gas
        </text>
        <text className="label" x="275" y="840">
          flue gas
        </text>
        <text className="label mid" x="365" y="220">
          heat
        </text>
        <text className="label" x="472" y="155">
          heat loss
        </text>
        <rect className="n-heat" x="420" y="755" width="130" height="50" rx="25" />
        <text className="name" x="485" y="780">
          Combustion air
        </text>
        <path className="line l-heat dash" d="M420 780 L331 780" markerEnd="url(#a-heat)" />
        <path className="line l-heat dash" d="M200 780 L110 780 L110 130 L199 130" markerEnd="url(#a-heat)" />
        <text className="label" x="120" y="450">
          hot air
        </text>
        <PartNode part="boiler" label="Boiler">
          <rect className="n-water" x="400" y="200" width="120" height="60" rx="14" />
          <text className="name" x="460" y="230">
            Boiler
          </text>
        </PartNode>
        <AlarmLed part="boiler" x={520} y={200} />
        <rect className="n-steam" x="700" y="50" width="120" height="50" rx="3" />
        <text className="name" x="760" y="75">
          Relief valve
        </text>
        <rect className="n-steam" x="890" y="50" width="120" height="50" rx="25" />
        <text className="name" x="950" y="75">
          Atmosphere
        </text>
        <PartNode part="turbine" label="Main steam valve">
          <rect className="n-steam" x="820" y="200" width="120" height="60" rx="3" />
          <text className="name" x="880" y="221.5">
            Main steam
          </text>
          <text className="name" x="880" y="238.5">
            valve
          </text>
        </PartNode>
        <PartNode part="turbine" label="Turbine valve">
          <rect className="n-steam" x="1000" y="200" width="130" height="60" rx="3" />
          <text className="name" x="1065" y="230">
            Turbine valve
          </text>
        </PartNode>
        <PartNode part="turbine" label="Turbine">
          <rect className="n-steam" x="1190" y="200" width="120" height="60" rx="3" />
          <text className="name" x="1250" y="230">
            Turbine
          </text>
        </PartNode>
        <AlarmLed part="turbine" x={1310} y={200} />
        <PartNode part="turbine" label="Bypass valve">
          <rect className="n-steam" x="820" y="330" width="120" height="50" rx="3" />
          <text className="name" x="880" y="355">
            Bypass valve
          </text>
        </PartNode>
        <path className="line l-steam" d="M520 230 L819 230" markerEnd="url(#a-steam)" />
        <path className="line l-steam" d="M760 230 L760 101" markerEnd="url(#a-steam)" />
        <path className="line l-steam" d="M820 75 L889 75" markerEnd="url(#a-steam)" />
        <path className="line l-steam" d="M940 230 L999 230" markerEnd="url(#a-steam)" />
        <path className="line l-steam" d="M1130 230 L1189 230" markerEnd="url(#a-steam)" />
        <path className="line l-steam" d="M880 260 L880 329" markerEnd="url(#a-steam)" />
        <path className="line l-steam" d="M940 355 L1220 355 L1220 399" markerEnd="url(#a-steam)" />
        <path className="line l-steam" d="M1280 260 L1280 399" markerEnd="url(#a-steam)" />
        <text className="label mid" x="640" y="220">
          steam
        </text>
        <text className="label mid" x="1080" y="345">
          vapour
        </text>
        <text className="label" x="1292" y="345">
          exhaust
        </text>
        <path
          className="line l-steam"
          d="M1220 260 L1220 300 L890 300 A10 10 0 0 0 870 300 L640 300 L640 624"
          markerEnd="url(#a-steam)"
        />
        <text className="label mid" x="1050" y="290">
          extraction steam
        </text>
        <PartNode part="boiler" label="Drain">
          <rect className="n-water" x="370" y="340" width="100" height="44" rx="22" />
          <text className="name" x="420" y="362">
            Drain
          </text>
        </PartNode>
        <PartNode part="condenser" label="Condenser">
          <rect className="n-cooling" x="1190" y="400" width="120" height="140" rx="14" />
          <text className="name" x="1250" y="470">
            Condenser
          </text>
        </PartNode>
        <AlarmLed part="condenser" x={1310} y={400} />
        <rect className="n-water" x="1190" y="610" width="120" height="90" rx="14" />
        <text className="name" x="1250" y="655">
          Hotwell
        </text>
        <PartNode part="condenser" label="Condensation pump">
          <rect className="n-water" x="820" y="625" width="140" height="60" rx="3" />
          <text className="name" x="890" y="646.5">
            Condensation
          </text>
          <text className="name" x="890" y="663.5">
            pump
          </text>
        </PartNode>
        <rect className="n-steam" x="560" y="625" width="160" height="60" rx="3" />
        <text className="name" x="640" y="655">
          Extraction heater
        </text>
        <rect className="n-water" x="1420" y="595" width="100" height="40" rx="20" />
        <text className="name" x="1470" y="615">
          Storage
        </text>
        <rect className="n-water" x="1420" y="670" width="100" height="40" rx="20" />
        <text className="name" x="1470" y="690">
          Storage
        </text>
        <path className="line l-water" d="M420 260 L420 339" markerEnd="url(#a-water)" />
        <path className="line l-water" d="M1220 540 L1220 609" markerEnd="url(#a-water)" />
        <path className="line l-water" d="M1280 540 L1280 609" markerEnd="url(#a-water)" />
        <path className="line l-water" d="M1190 655 L961 655" markerEnd="url(#a-water)" />
        <path className="line l-water" d="M820 655 L721 655" markerEnd="url(#a-water)" />
        <path className="line l-water" d="M560 655 L331 655" markerEnd="url(#a-water)" />
        <path className="line l-water" d="M330 620 L490 620 L490 261" markerEnd="url(#a-water)" />
        <path className="line l-water" d="M1420 615 L1311 630" markerEnd="url(#a-water)" />
        <path className="line l-water" d="M1310 680 L1419 690" markerEnd="url(#a-water)" />
        <path className="line l-water" d="M640 685 L640 715 L500 715 L500 656" markerEnd="url(#a-water)" />
        <text className="label mid" x="390" y="305">
          drain
        </text>
        <text className="label" textAnchor="end" x="1210" y="580">
          condensate
        </text>
        <text className="label" x="1292" y="580">
          exhaust moisture
        </text>
        <text className="label mid strong" x="770" y="645">
          Return
        </text>
        <text className="label mid strong" x="445" y="645">
          hotter Return
        </text>
        <text className="label" fontWeight="700" x="502" y="440">
          hottest Return
        </text>
        <text className="label mid" x="570" y="735">
          heater drain, pumped forward
        </text>
        <text className="label mid" x="1365" y="612">
          makeup
        </text>
        <text className="label mid" x="1365" y="705">
          reject
        </text>
        <PartNode part="condenser" label="Recirculation pump">
          <rect className="n-cooling" x="1370" y="410" width="120" height="50" rx="3" />
          <text className="name" x="1430" y="426.5">
            Recirculation
          </text>
          <text className="name" x="1430" y="443.5">
            pump
          </text>
        </PartNode>
        <rect className="n-cooling" x="1525" y="405" width="125" height="60" rx="30" />
        <text className="name" x="1587.5" y="426.5">
          Cooling water,
        </text>
        <text className="name" x="1587.5" y="443.5">
          10 °C
        </text>
        <rect className="n-cooling" x="1370" y="490" width="150" height="40" rx="20" />
        <text className="name" x="1445" y="510">
          Cooling water out
        </text>
        <path className="line l-cooling" d="M1525 435 L1491 435" markerEnd="url(#a-cooling)" />
        <path className="line l-cooling" d="M1370 435 L1311 435" markerEnd="url(#a-cooling)" />
        <path className="line l-cooling" d="M1310 510 L1369 510" markerEnd="url(#a-cooling)" />
        <text className="label mid" x="1340" y="500">
          heat
        </text>
        <rect className="n-power" x="1370" y="200" width="120" height="60" rx="3" />
        <text className="name" x="1430" y="230">
          Generator
        </text>
        <rect className="n-power" x="1550" y="205" width="80" height="50" rx="25" />
        <text className="name" x="1590" y="230">
          Load
        </text>
        <path className="line l-power" d="M1310 230 L1369 230" markerEnd="url(#a-power)" />
        <path className="line l-power" d="M1490 230 L1549 230" markerEnd="url(#a-power)" />
        <text className="label mid" x="1340" y="220">
          shaft
        </text>
        <text className="label mid" x="1520" y="220">
          electricity
        </text>
        <PartNode part="condenser" label="Air extraction pump">
          <rect className="n-vacuum" x="940" y="405" width="170" height="40" rx="3" />
          <text className="name" x="1025" y="425">
            Air extraction pump
          </text>
        </PartNode>
        <PartNode part="condenser" label="SJAE">
          <rect className="n-vacuum" x="940" y="460" width="170" height="40" rx="3" />
          <text className="name" x="1025" y="480">
            SJAE
          </text>
        </PartNode>
        <path className="line l-vacuum dash" d="M1110 425 L1189 425" markerEnd="url(#a-vacuum)" />
        <path className="line l-vacuum dash" d="M1110 480 L1189 480" markerEnd="url(#a-vacuum)" />
        <path className="line l-vacuum dash" d="M870 480 L939 480" markerEnd="url(#a-vacuum)" />
        <text className="label mid" x="1150" y="415">
          vacuum
        </text>
        <text className="label mid" x="1150" y="470">
          vacuum
        </text>
        <text className="label mid" x="800" y="472">
          motive steam from
        </text>
        <text className="label mid" x="800" y="490">
          the boiler, none taken
        </text>
      </svg>
    </PanelFrame>
  )
}

export default PlantOverview
