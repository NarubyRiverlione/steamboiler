/** Annunciator in the header: master error and warning lights, the toggle for the folded tile grid, ACK and RESET (always visible). The unfolded grid overlays the page, tiles grouped by owning part; a tile opens its part. */

import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LensButton } from "../components/board/LensButton"
import "../components/board/board.css"
import { useAnnunciator, type Tile } from "./useAnnunciator"
import { PART_IDS, PARTS, type PartId } from "./plantParts"
import type { AlarmSeverity } from "./alarms"
import { masterLights, type MasterLights, type MasterState } from "./masterLights"

// Backlight colour class per severity
const SEVERITY_CLASS: Record<AlarmSeverity, string> = { error: "board-tile-error", warning: "board-tile-warning" }

const PANEL_ID = "annunciator-panel"

const MASTER_LABEL: Record<AlarmSeverity, string> = { error: "Master error", warning: "Master warning" }

// Backlight classes of a tile or master light
const lightClass = (base: string, severity: AlarmSeverity, lit: boolean, flashing: boolean): string =>
  [base, SEVERITY_CLASS[severity], lit ? "board-tile-lit" : "", flashing ? "board-tile-flash" : ""].filter((c: string) => c !== "").join(" ")

function MasterLight({ severity, state }: { readonly severity: AlarmSeverity; readonly state: MasterState }) {
  const className: string = lightClass("board-master", severity, state !== "off", state === "flashing")
  return <span role="img" className={className} aria-label={MASTER_LABEL[severity] + " " + state} data-state={state} />
}

function Annunciator() {
  const { tiles, acknowledge, reset } = useAnnunciator()
  const navigate = useNavigate()
  const [open, setOpen] = useState<boolean>(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const lights: MasterLights = masterLights(tiles)

  // While unfolded, Esc and a click outside fold the panel; Esc is handled here so it does not also go to the overview
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event: KeyboardEvent): void => {
      // A handled Esc (the Presets popup closing) is left to its owner
      if (event.key !== "Escape" || event.defaultPrevented) return
      event.preventDefault()
      setOpen(false)
    }
    const onPointer = (event: MouseEvent): void => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target) === true) return
      setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onPointer)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onPointer)
    }
  }, [open])

  return (
    <div className="board-annunciator" ref={rootRef}>
      <div className="board-annun-bar">
        <LensButton
          small
          onClick={() => {
            setOpen((prev: boolean) => !prev)
          }}
          aria-expanded={open}
          aria-controls={PANEL_ID}
        >
          Annunciator
        </LensButton>
        <MasterLight severity="error" state={lights.error} />
        <MasterLight severity="warning" state={lights.warning} />
      </div>
      <div className="board-lens-row board-annun-buttons">
        <LensButton small onClick={acknowledge}>
          ACK
        </LensButton>
        <LensButton small onClick={reset}>
          RESET
        </LensButton>
      </div>
      <div id={PANEL_ID} className="board-annun-panel" hidden={!open}>
        {PART_IDS.map((part: PartId) => {
          const partTiles: readonly Tile[] = tiles.filter((tile: Tile) => tile.part === part)
          if (partTiles.length === 0) return null
          return (
            <section key={part} className="board-annun-group" aria-label={PARTS[part].name}>
              <h2 className="board-annun-group-title">{PARTS[part].name}</h2>
              <div className="board-annun-grid">
                {partTiles.map((tile: Tile) => (
                  <button
                    key={tile.id}
                    type="button"
                    className={lightClass("board-tile", tile.severity, tile.lit, tile.flashing)}
                    title={"Open " + PARTS[tile.part].name}
                    onClick={() => {
                      setOpen(false)
                      void navigate(PARTS[tile.part].path)
                    }}
                  >
                    {tile.label}
                  </button>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

export default Annunciator
