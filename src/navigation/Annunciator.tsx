/** Annunciator in the header: one tile per alarm flag, ACK and TEST. A tile opens the part that owns the alarm. */

import { useNavigate } from "react-router-dom"
import { LensButton } from "../components/board/LensButton"
import "../components/board/board.css"
import { useAnnunciator, type Tile } from "./useAnnunciator"
import { PARTS } from "./plantParts"

function Annunciator() {
  const { tiles, testing, acknowledge, setTesting } = useAnnunciator()
  const navigate = useNavigate()

  return (
    <div className="board-annunciator">
      <div className="board-annun-grid">
        {tiles.map((tile: Tile) => (
          <button
            key={tile.id}
            type="button"
            className={["board-tile", tile.lit ? "board-tile-lit" : "", tile.flashing ? "board-tile-flash" : ""].filter((c: string) => c !== "").join(" ")}
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
        {/* Held: lit from press to release (pointer, Space or Enter); a click alone does not toggle it */}
        <span
          onPointerDown={() => { setTesting(true); }}
          onPointerUp={() => { setTesting(false); }}
          onPointerLeave={() => { setTesting(false); }}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") setTesting(true)
          }}
          onKeyUp={() => { setTesting(false); }}
          onBlur={() => { setTesting(false); }}
        >
          <LensButton small pressed={testing} onClick={() => undefined}>
            TEST
          </LensButton>
        </span>
      </div>
    </div>
  )
}

export default Annunciator
