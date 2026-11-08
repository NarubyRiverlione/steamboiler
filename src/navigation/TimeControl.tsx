/** The simulated clock (an LCD display that flashes while paused) and the playback speed selector in the header's clock and speed slots. */

import { Display } from "../components/board/Display"
import { LensButton } from "../components/board/LensButton"
import usePowerPlant from "../context/PowerPlantContext"
import { PlaybackSpeeds, PlaybackSpeed, formatClock } from "../context/Playback"
import { isSpeedLocked } from "./speedLock"
import { useAnnunciator } from "./useAnnunciator"

const label = (speed: PlaybackSpeed): string => (speed === 0 ? "Pause" : `${String(speed)}x`)

export function Clock() {
  const { simulatedSeconds, playbackSpeed } = usePowerPlant()
  return (
    <Display label="Simulated clock" text={formatClock(simulatedSeconds)} flashing={playbackSpeed === 0} widest="100:00:00" />
  )
}

export function SpeedSelector() {
  const { playbackSpeed, setPlaybackSpeed } = usePowerPlant()
  const { tiles } = useAnnunciator()
  const locked: boolean = isSpeedLocked(tiles)
  return (
    <div role="group" aria-label="Playback speed" className="board-lens-row">
      {PlaybackSpeeds.map((speed: PlaybackSpeed) => (
        <LensButton
          key={speed}
          small
          pressed={speed === playbackSpeed}
          disabled={locked && speed > 1}
          onClick={() => {
            setPlaybackSpeed(speed)
          }}
        >
          {label(speed)}
        </LensButton>
      ))}
    </div>
  )
}
