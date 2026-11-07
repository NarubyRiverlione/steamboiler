import { Outlet } from "react-router-dom"
import Header from "./Header"
import { useBoardKeys } from "./useBoardKeys"
import "./LegacyLayout.css"

function Layout() {
  useBoardKeys()
  return (
    <div className="app">
      <Header />
      <Outlet />
    </div>
  )
}

export default Layout
