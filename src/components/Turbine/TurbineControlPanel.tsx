// This component is no longer used - controls are directly imported in Turbine.tsx
// Keeping this file for reference or future use

import SteamValveControl from "./SteamValveControl"
import RPMControl from "./RPMControl"
import GeneratorBreakerControl from "./GeneratorBreakerControl"
import LoadControl from "./LoadControl"

const TurbineControlPanel = () => {
  return (
    <div className="controls-panel">
      <SteamValveControl />
      <RPMControl />
      <GeneratorBreakerControl />
      <LoadControl />
    </div>
  )
}

export default TurbineControlPanel
