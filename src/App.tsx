import Boiler from "./components/Boiler/Boiler"
import PowerPlantProvider from "./context/PowerPlantProvider"
import "./App.css"
import Condenser from "./components/Condenser/Condenser"

function App() {
  return (
    <div className="app">
      <h1>Powerplant Simulation</h1>
      <PowerPlantProvider>
        <Boiler />
        <Condenser />
      </PowerPlantProvider>
    </div>
  )
}

export default App
