import { Outlet } from "react-router-dom"
import { AnnunciatorProvider } from "./AnnunciatorProvider"
import Header from "./Header"
import { useBoardKeys } from "./useBoardKeys"
import "./LegacyLayout.css"

function Layout() {
  useBoardKeys()
  return (
    <AnnunciatorProvider>
      <div className="app board-shell">
        <Header />
        <Outlet />
      </div>
    </AnnunciatorProvider>
  )
}

export default Layout
