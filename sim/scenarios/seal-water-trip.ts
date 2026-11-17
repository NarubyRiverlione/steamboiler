import { Scenario } from "../scenario"
import { loadSnapshot } from "../snapshot"
import PowerPlantState from "../../src/context/PowerPlantState"
import { holdLoop } from "./loop-operator"

// Edge (#166): the same plant with the seal water cooler lost (no operator action exists for it yet). The pump takes its shaft power into
// the seal water: the warning comes on, then the pump trips on cavitation protection. The SJAE keeps the vacuum.
export const sealWaterTrip: Scenario = {
  name: "seal-water-trip",
  description: "From the turbine-sync snapshot with the seal water cooler lost: the seal water heats, the warning comes on and the air pump trips",
  duration: 3000,
  sampleEvery: 10,
  initial: (() => {
    const synced: PowerPlantState = loadSnapshot("turbine-sync")
    return { ...synced, Condenser: { ...synced.Condenser, sealWaterCoolerOn: false } }
  })(),
  actions: [],
  operator: (state, time) => holdLoop(state, time),
}
