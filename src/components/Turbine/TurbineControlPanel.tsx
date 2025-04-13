import SteamValveControl from "./SteamValveControl"
import RPMControl from "./RPMControl"

const TurbineControlPanel = () => {
  return (
    <div className="controls-panel">
      <SteamValveControl />
      <RPMControl />
    </div>
  )
}

export default TurbineControlPanel
