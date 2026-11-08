import { BrowserRouter } from 'react-router-dom'
import PowerPlantProvider from "./context/PowerPlantProvider"
import AppRoutes from "./navigation/AppRoutes"

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <PowerPlantProvider>
        <AppRoutes />
      </PowerPlantProvider>
    </BrowserRouter>
  )
}

export default App
