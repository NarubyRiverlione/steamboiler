import { BrowserRouter } from 'react-router-dom'
import PowerPlantProvider from "./context/PowerPlantProvider"
import AppRoutes from "./navigation/AppRoutes"
import "./App.css"

function App() {
  return (
    <BrowserRouter>
      <PowerPlantProvider>
        <AppRoutes />
      </PowerPlantProvider>
    </BrowserRouter>
  )
}

export default App
