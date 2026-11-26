import { Routes, Route, Navigate } from "react-router-dom"
import Layout from "./Layout"
import AuxiliaryBus from "../components/AuxiliaryBus/AuxiliaryBus"
import Boiler from "../components/Boiler/Boiler"
import Condenser from "../components/Condenser/Condenser"
import Deaerator from "../components/Deaerator/Deaerator"
import Diesel from "../components/Diesel/Diesel"
import Generation from "../components/Generation/Generation"
import Steam from "../components/Steam/Steam"
import Turbine from "../components/Turbine/Turbine"
import TurbineAux from "../components/TurbineAux/TurbineAux"
import ElectricalOverview from "./ElectricalOverview"
import PlantOverview from "./PlantOverview"

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<PlantOverview />} />
        <Route path="electrical" element={<ElectricalOverview />} />
        <Route path="boiler" element={<Boiler />} />
        <Route path="steam" element={<Steam />} />
        <Route path="deaerator" element={<Deaerator />} />
        <Route path="condenser" element={<Condenser />} />
        <Route path="turbine" element={<Turbine />} />
        <Route path="turbine-aux" element={<TurbineAux />} />
        <Route path="generation" element={<Generation />} />
        <Route path="auxiliary-bus" element={<AuxiliaryBus />} />
        <Route path="diesel" element={<Diesel />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default AppRoutes
