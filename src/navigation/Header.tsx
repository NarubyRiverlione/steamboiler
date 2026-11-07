/** Header on every page, a plate like the part pages: title, the Plant overview button and the breadcrumb. The slots stay empty until the clock and speed selector (#86) and the annunciator (step 6). */

import { Link, useLocation } from "react-router-dom"
import { Screws } from "../components/board/Screws"
import "../components/board/board.css"
import { OVERVIEW_PATH, PART_IDS, PARTS, type PartId } from "./plantParts"

function Header() {
  const { pathname } = useLocation()
  const part: PartId | undefined = PART_IDS.find((id: PartId) => PARTS[id].path === pathname)
  const onOverview: boolean = pathname === OVERVIEW_PATH

  return (
    <header className="board-plate board-header">
      <Screws />
      <div className="board-panel">
        <div className="board-header-head">
          <div>
            <h1 className="board-header-title">Powerplant Simulation</h1>
            <div className="board-header-slot" data-slot="clock" />
            <div className="board-header-slot" data-slot="speed" />
          </div>
          <div className="board-header-slot" data-slot="annunciator" />
        </div>
        <div className="board-header-nav">
          <Link
            to={OVERVIEW_PATH}
            className={onOverview ? "board-lens board-lens-lit" : "board-lens"}
            aria-current={onOverview ? "page" : undefined}
          >
            Plant overview
          </Link>
          <nav aria-label="Breadcrumb">
            <ol className="board-breadcrumb">
              <li>
                {onOverview ? (
                  <span aria-current="page">Plant overview</span>
                ) : (
                  <Link to={OVERVIEW_PATH}>Plant overview</Link>
                )}
              </li>
              {part !== undefined && (
                <li>
                  <span aria-current="page">{PARTS[part].name}</span>
                </li>
              )}
            </ol>
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header
