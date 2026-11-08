import { Outlet } from "react-router-dom"
import { AnnunciatorProvider } from "./AnnunciatorProvider"
import Header from "./Header"
import { useBoardKeys } from "./useBoardKeys"

function Layout() {
  useBoardKeys()
  return (
    <AnnunciatorProvider>
      <div className="board-shell">
        <Header />
        <main className="board-main">
          <Outlet />
        </main>
      </div>
    </AnnunciatorProvider>
  )
}

export default Layout
