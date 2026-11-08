import usePowerPlant from "../context/PowerPlantContext"
import { PlaybackSpeeds, PlaybackSpeed, formatClock } from "../context/Playback"

const label = (speed: PlaybackSpeed): string => (speed === 0 ? "Pause" : `${String(speed)}x`)

// Plain header controls: the simulated clock and the playback speed selector (the styled versions are #86)
function TimeControl() {
  const { playbackSpeed, simulatedSeconds, speedLocked, setPlaybackSpeed, acknowledgeAlarms } = usePowerPlant()
  return (
    <div className="time-control">
      <span className="clock" aria-label="Simulated clock">
        {formatClock(simulatedSeconds)}
      </span>
      <span className="speed" role="group" aria-label="Playback speed">
        {PlaybackSpeeds.map((speed) => (
          <button
            key={speed}
            type="button"
            aria-pressed={speed === playbackSpeed}
            disabled={speedLocked && speed > 1}
            onClick={() => { setPlaybackSpeed(speed); }}
          >
            {label(speed)}
          </button>
        ))}
      </span>
      {speedLocked && (
        <button type="button" onClick={acknowledgeAlarms}>
          ACK
        </button>
      )}
    </div>
  )
}

export default TimeControl
