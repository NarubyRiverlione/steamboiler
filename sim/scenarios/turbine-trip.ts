import { Scenario } from "../scenario"
import { turbineLoad } from "./turbine-load"

// Seconds after the start at which the turbine trips: the load has been at 125 MW since about 2000 s
export const TripAt = 2500

// Edge (#88): the turbine trips at rated load. Hold goes back to Free and the turbine valve slams shut, while the bypass
// opens fully to dump the steam to the condenser, as a real plant's turbine bypass does. The turbine takes no steam, so the
// heater loses its tap and the Return turns cold at once (ADR 0031); the cold Return then costs the boiler heat, and the
// pressure must stay under the design pressure. Same plant and operator as `turbine-load`, whose last 600 s the load
// has held 125 MW before the trip.
export const turbineTrip: Scenario = {
  name: "turbine-trip",
  description: "From the turbine-sync snapshot: load to 125 MW, then at 2500 s the turbine valve shuts and the bypass dumps the steam",
  duration: TripAt + 300,
  sampleEvery: 1,
  initial: turbineLoad.initial,
  actions: [
    ...turbineLoad.actions,
    { at: TripAt, action: { type: "SET_SPEED_MODE", payload: { speedMode: "free" } } },
    { at: TripAt, action: { type: "ADJUST_STEAM_TURBINE_VALVE", payload: { turbineValvePosition: -1 } } },
    { at: TripAt, action: { type: "ADJUST_STEAM_BYPASS_VALVE", payload: { bypassValvePosition: 1 } } },
  ],
  operator: turbineLoad.operator,
}
