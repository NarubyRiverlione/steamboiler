/** The board shell. The board state (#144, ADR 0055) is derived here once: normal, emergency (red lens, UPS strip), dark (UPS breaker, clock and time controls only) or ended (end plate and Presets). No part page knows about the buses. */

import { Outlet, useLocation } from "react-router-dom"
import { UpsGroup } from "../components/AuxiliaryBus/UpsGroup"
import { BoardStateContext } from "../components/board/boardStateContext"
import { PlantValveRamp } from "../components/board/PlantValveRamp"
import usePowerPlant from "../context/PowerPlantContext"
import { AnnunciatorProvider } from "./AnnunciatorProvider"
import { deriveBoardState, type BoardState } from "./boardState"
import Header from "./Header"
import PresetsButton from "./PresetsButton"
import { PARTS } from "./plantParts"
import { Clock, SpeedSelector } from "./TimeControl"
import { useBoardKeys } from "./useBoardKeys"

function Layout() {
  useBoardKeys()
  const { state, toggleUpsBreaker } = usePowerPlant()
  const { pathname } = useLocation()
  const boardState: BoardState = deriveBoardState(state)

  if (boardState === "ended") {
    return (
      <AnnunciatorProvider>
        <BoardStateContext.Provider value={boardState}>
          <div className="board-shell board-ended">
            <section className="board-plate board-end-plate" aria-label="Simulation ended">
              <p className="board-end-text">The UPS discharged to 0% and the simulation has ended.</p>
              <PresetsButton />
            </section>
          </div>
        </BoardStateContext.Provider>
      </AnnunciatorProvider>
    )
  }

  if (boardState === "dark") {
    return (
      <AnnunciatorProvider>
        <BoardStateContext.Provider value={boardState}>
          <div className="board-shell board-dark">
            <Clock />
            <SpeedSelector />
            <UpsGroup state={state} onToggleUpsBreaker={toggleUpsBreaker} breakerOnly />
          </div>
        </BoardStateContext.Provider>
      </AnnunciatorProvider>
    )
  }

  // The Auxiliary bus page has its own UPS group
  const upsStrip: boolean = boardState === "emergency" && pathname !== PARTS.auxiliaryBus.path
  return (
    <AnnunciatorProvider>
      <BoardStateContext.Provider value={boardState}>
        <PlantValveRamp>
          <div className={boardState === "emergency" ? "board-shell board-emergency" : "board-shell"}>
            <Header />
            {upsStrip && (
              <div className="board-ups-strip">
                <UpsGroup state={state} onToggleUpsBreaker={toggleUpsBreaker} />
              </div>
            )}
            <main className="board-main">
              <Outlet />
            </main>
          </div>
        </PlantValveRamp>
      </BoardStateContext.Provider>
    </AnnunciatorProvider>
  )
}

export default Layout
