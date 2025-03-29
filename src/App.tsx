import Boiler from "./components/Boiler/Boiler"
import PowerPlantProvider from "./context/PowerPlantProvider"
import "./App.css"

function App() {
  return (
    <div className="app">
      <h1>Powerplant Simulation</h1>
      <PowerPlantProvider>
        <Boiler />
      </PowerPlantProvider>
    </div>
  )
}

export default App
