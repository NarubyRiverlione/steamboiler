import Boiler from "./components/Boiler/Boiler"
import BoilerProvider from "./context/BoilerProvider"
import "./App.css"

function App() {
  return (
    <div className="app">
      <h1>Steam Boiler Simulation</h1>
      <BoilerProvider>
        <Boiler />
      </BoilerProvider>
    </div>
  )
}

export default App
