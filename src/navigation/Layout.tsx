import { Outlet } from "react-router-dom"
import TabNavigation from "./TabNavigation"

function Layout() {
  return (
    <div className="app">
      <h1>Powerplant Simulation</h1>
      <TabNavigation />

      <Outlet />
    </div>
  )
}

export default Layout
