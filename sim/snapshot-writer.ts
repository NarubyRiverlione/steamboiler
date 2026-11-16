import { finalState, Scenario } from "./scenario"
import { withNeutralGas } from "./snapshot"
import PowerPlantState from "../src/context/PowerPlantState"

export type SnapshotSources = Record<string, () => Promise<Scenario>>

// Writes every source in the listed order. A source is loaded only after the previous snapshot is saved, so a
// scenario that starts from an earlier snapshot (`initial: loadSnapshot(...)` at module level) reads the fresh file.
export async function writeSnapshots(
  sources: SnapshotSources,
  save: (name: string, state: PowerPlantState) => string,
  log: (line: string) => void = () => undefined,
): Promise<void> {
  for (const [name, load] of Object.entries(sources)) {
    const scenario: Scenario = await load()
    log(`${name} <- ${scenario.name}: ${save(name, withNeutralGas(finalState(scenario)))}`)
  }
}
