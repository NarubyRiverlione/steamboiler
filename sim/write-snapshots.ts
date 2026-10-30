import { finalState } from "./scenario"
import { saveSnapshot } from "./snapshot"
import { snapshotSources } from "./snapshot-sources"

// usage: pnpm sim:snapshots — regenerate every committed snapshot from its source scenario
for (const [name, scenario] of Object.entries(snapshotSources)) {
  console.log(`${name} <- ${scenario.name}: ${saveSnapshot(name, finalState(scenario))}`)
}
