import { Outlet } from "react-router-dom"
import TabNavigation from "./TabNavigation"
import TimeControl from "./TimeControl"

function Layout() {
  return (
    <div className="app">
      <h1>Powerplant Simulation</h1>
      <TimeControl />
      <TabNavigation />

      <Outlet />
    </div>
  )
}

export default Layout
