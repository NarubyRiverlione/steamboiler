import { saveSnapshot } from "./snapshot"
import { snapshotSources } from "./snapshot-sources"
import { writeSnapshots } from "./snapshot-writer"

// usage: pnpm sim:snapshots — regenerate every committed snapshot from its source scenario
await writeSnapshots(snapshotSources, saveSnapshot, console.log)
