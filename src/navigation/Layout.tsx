import { Outlet } from "react-router-dom"
import { PlantValveRamp } from "../components/board/PlantValveRamp"
import { AnnunciatorProvider } from "./AnnunciatorProvider"
import Header from "./Header"
import { useBoardKeys } from "./useBoardKeys"

function Layout() {
  useBoardKeys()
  return (
    <AnnunciatorProvider>
      <PlantValveRamp>
        <div className="board-shell">
          <Header />
          <main className="board-main">
            <Outlet />
          </main>
        </div>
      </PlantValveRamp>
    </AnnunciatorProvider>
  )
}

export default Layout
