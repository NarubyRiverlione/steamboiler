import { Routes, Route, Navigate } from "react-router-dom"
import Layout from "./Layout"
import Boiler from "../components/Boiler/Boiler"
import Condenser from "../components/Condenser/Condenser"
import ComponentView from "./ComponentView"
import Turbine from "../components/Turbine/Turbine"

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/boiler" replace />} />
        <Route path="boiler" element={<Boiler />} />
        <Route
          path="condenser"
          element={
            <ComponentView>
              <Condenser />
            </ComponentView>
          }
        />
        <Route
          path="turbine"
          element={
            <ComponentView>
              <Turbine />
            </ComponentView>
          }
        />
      </Route>
    </Routes>
  )
}

export default AppRoutes
