import { Routes, Route, Navigate } from "react-router-dom"
import Layout from "./Layout"
import Boiler from "../components/Boiler/Boiler"
import Condenser from "../components/Condenser/Condenser"
import ComponentView from "./ComponentView"

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
      </Route>
    </Routes>
  )
}

export default AppRoutes
