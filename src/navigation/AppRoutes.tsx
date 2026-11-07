import { Routes, Route, Navigate } from "react-router-dom"
import Layout from "./Layout"
import Boiler from "../components/Boiler/Boiler"
import Condenser from "../components/Condenser/Condenser"
import ComponentView from "./ComponentView"
import Turbine from "../components/Turbine/Turbine"
import LegacyPage from "./LegacyPage"
import PlantOverview from "./PlantOverview"

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<PlantOverview />} />
        <Route path="boiler" element={<Boiler />} />
        <Route
          path="condenser"
          element={
            <LegacyPage>
              <ComponentView>
                <Condenser />
              </ComponentView>
            </LegacyPage>
          }
        />
        <Route
          path="turbine"
          element={
            <LegacyPage>
              <ComponentView>
                <Turbine />
              </ComponentView>
            </LegacyPage>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
