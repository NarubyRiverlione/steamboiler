/** Annunciator in the header: one tile per alarm flag, ACK and RESET. A tile opens the part that owns the alarm. */

import { useNavigate } from "react-router-dom"
import { LensButton } from "../components/board/LensButton"
import "../components/board/board.css"
import { useAnnunciator, type Tile } from "./useAnnunciator"
import { PARTS } from "./plantParts"
import type { AlarmSeverity } from "./alarms"

// Backlight colour class per severity
const SEVERITY_CLASS: Record<AlarmSeverity, string> = { error: "board-tile-error", warning: "board-tile-warning" }

function Annunciator() {
  const { tiles, acknowledge, reset } = useAnnunciator()
  const navigate = useNavigate()

  return (
    <div className="board-annunciator">
      <div className="board-annun-grid">
        {tiles.map((tile: Tile) => (
          <button
            key={tile.id}
            type="button"
            className={["board-tile", SEVERITY_CLASS[tile.severity], tile.lit ? "board-tile-lit" : "", tile.flashing ? "board-tile-flash" : ""].filter((c: string) => c !== "").join(" ")}
            title={"Open " + PARTS[tile.part].name}
            onClick={() => void navigate(PARTS[tile.part].path)}
          >
            {tile.label}
          </button>
        ))}
      </div>
      <div className="board-lens-row board-annun-buttons">
        <LensButton small onClick={acknowledge}>
          ACK
        </LensButton>
        <LensButton small onClick={reset}>
          RESET
        </LensButton>
      </div>
    </div>
  )
}

export default Annunciator
