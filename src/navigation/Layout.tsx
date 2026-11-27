/** The board shell. The board state (#144, ADR 0055, #196) is derived here once: normal, emergency (red lens) or ended (end plate and Presets). No part page knows about the buses. */

import { Outlet } from "react-router-dom"
import { BoardStateContext } from "../components/board/boardStateContext"
import { PlantValveRamp } from "../components/board/PlantValveRamp"
import usePowerPlant from "../context/PowerPlantContext"
import { AnnunciatorProvider } from "./AnnunciatorProvider"
import { deriveBoardState, type BoardState } from "./boardState"
import Header from "./Header"
import PresetsButton from "./PresetsButton"
import { useBoardKeys } from "./useBoardKeys"

function Layout() {
  useBoardKeys()
  const { state } = usePowerPlant()
  const boardState: BoardState = deriveBoardState(state)

  if (boardState === "ended") {
    return (
      <AnnunciatorProvider>
        <BoardStateContext.Provider value={boardState}>
          <div className="board-shell board-ended">
            <section className="board-plate board-end-plate" aria-label="Simulation ended">
              <p className="board-end-text">The UPS discharged to 0% with the Vital bus dead and the simulation has ended.</p>
              <PresetsButton />
            </section>
          </div>
        </BoardStateContext.Provider>
      </AnnunciatorProvider>
    )
  }

  return (
    <AnnunciatorProvider>
      <BoardStateContext.Provider value={boardState}>
        <PlantValveRamp>
          <div className={boardState === "emergency" ? "board-shell board-emergency" : "board-shell"}>
            <Header />
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
