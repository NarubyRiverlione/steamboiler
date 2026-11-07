import TurbineReadouts from "./TurbineReadouts"
import SteamValveControl from "./SteamValveControl"
import RPMControl from "./RPMControl"
import GeneratorBreakerControl from "./GeneratorBreakerControl"
import LoadControl from "./LoadControl"

const Turbine = () => {
  return (
    <div className="component-container">
      <div className="controls-panel">
        <SteamValveControl />
        <RPMControl />
      </div>
      <div className="controls-panel">
        <GeneratorBreakerControl />
        <LoadControl />
      </div>
      <TurbineReadouts />
    </div>
  )
}

export default Turbine
