/** RESET lens button beside a trip tile (ADR 0043): enabled only while its trip is latched and its cause has gone. */

import usePowerPlant from "../../context/PowerPlantContext"
import { isTripped, tripResetRefusal, type TripId } from "../../context/tripReset"
import { LensButton } from "./LensButton"

type TripResetButtonProps = {
  readonly trip: TripId
  readonly label: string
}

export function TripResetButton({ trip, label }: TripResetButtonProps) {
  const { state, dispatch } = usePowerPlant()
  const tripped: boolean = isTripped(state, trip)
  const refusal: string | undefined = tripped ? tripResetRefusal(state, trip) : "Not tripped"
  return (
    <LensButton
      small
      disabled={refusal !== undefined}
      title={refusal ?? `Reset the ${label}: it clears the trip only, restart is a separate step`}
      onClick={() => {
        dispatch({ type: "RESET_TRIP", payload: { trip } })
      }}
    >
      RESET
    </LensButton>
  )
}
