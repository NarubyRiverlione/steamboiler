/** Header on every page: breadcrumb and the Plant overview button. The slots stay empty until the annunciator (step 6), the clock and the speed selector (#86). */

import { Link, useLocation } from "react-router-dom"
import "../components/board/board.css"
import { OVERVIEW_PATH, PART_IDS, PARTS, type PartId } from "./plantParts"

function Header() {
  const { pathname } = useLocation()
  const part: PartId | undefined = PART_IDS.find((id: PartId) => PARTS[id].path === pathname)
  const onOverview: boolean = pathname === OVERVIEW_PATH

  return (
    <header className="board-header">
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
              <h1 className="board-breadcrumb-current" aria-current="page">
                {PARTS[part].name}
              </h1>
            </li>
          )}
        </ol>
      </nav>
      <div className="board-header-slot" data-slot="annunciator" />
      <div className="board-header-slot" data-slot="clock" />
      <div className="board-header-slot" data-slot="speed" />
      <Link
        to={OVERVIEW_PATH}
        className={onOverview ? "board-button board-button-lit" : "board-button"}
        aria-current={onOverview ? "page" : undefined}
      >
        Plant overview
      </Link>
    </header>
  )
}

export default Header
