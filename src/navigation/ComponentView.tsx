import { ReactNode } from "react"
import MainStatsView from "./MainStatsView"

const ComponentView = ({ children }: { children: ReactNode }) => {
  return (
    <div className="componentView-container">
      <MainStatsView />
      {children}
    </div>
  )
}

export default ComponentView
