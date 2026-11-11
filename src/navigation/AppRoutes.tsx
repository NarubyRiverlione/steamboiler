import { Routes, Route, Navigate } from "react-router-dom"
import Layout from "./Layout"
import Boiler from "../components/Boiler/Boiler"
import Condenser from "../components/Condenser/Condenser"
import Deaerator from "../components/Deaerator/Deaerator"
import Turbine from "../components/Turbine/Turbine"
import PlantOverview from "./PlantOverview"

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<PlantOverview />} />
        <Route path="boiler" element={<Boiler />} />
        <Route path="deaerator" element={<Deaerator />} />
        <Route path="condenser" element={<Condenser />} />
        <Route path="turbine" element={<Turbine />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
