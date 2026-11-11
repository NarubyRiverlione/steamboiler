/** Header on every page, a plate like the part pages: title, the Plant overview button, the breadcrumb and the Presets button. The annunciator and the headline plant values (boiler pressure, output) sit in their slots; the clock and the playback speed selector sit in their slots. */

import { Link, useLocation } from "react-router-dom"
import { Screws } from "../components/board/Screws"
import "../components/board/board.css"
import Annunciator from "./Annunciator"
import PlantValues from "./PlantValues"
import PresetsButton from "./PresetsButton"
import { Clock, SpeedSelector } from "./TimeControl"
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
            <div className="board-header-slot" data-slot="clock">
              <Clock />
            </div>
            <div className="board-header-slot" data-slot="speed">
              <SpeedSelector />
            </div>
          </div>
          <div className="board-header-slot" data-slot="values">
            <PlantValues />
          </div>
          <div className="board-header-slot" data-slot="annunciator">
            <Annunciator />
          </div>
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
              {onOverview && (
                <li>
                  <span aria-current="page">Plant overview</span>
                </li>
              )}
              {part !== undefined && (
                <li>
                  <span aria-current="page">{PARTS[part].name}</span>
                </li>
              )}
            </ol>
          </nav>
          <div className="board-header-presets">
            <PresetsButton />
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
