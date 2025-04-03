import { NavLink } from "react-router-dom"
import "./TabNavigation.css"

function TabNavigation() {
  return (
    <nav className="tab-navigation">
      <NavLink to="/boiler" className={({ isActive }) => (isActive ? "active-tab" : "")}>
        Boiler
      </NavLink>
      <NavLink to="/condenser" className={({ isActive }) => (isActive ? "active-tab" : "")}>
        Condenser
      </NavLink>
      <NavLink to="/turbine" className={({ isActive }) => (isActive ? "active-tab" : "")}>
        Turbine
      </NavLink>
    </nav>
  )
}

export default TabNavigation
