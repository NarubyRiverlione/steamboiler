import { expect, test } from "vitest"
import { makeInitialState } from "../src/context/PowerPlantReducer"
import { Scenario } from "./scenario"
import { writeSnapshots } from "./snapshot-writer"

const scenario = (name: string): Scenario => ({
  name,
  description: "fixture",
  duration: 10,
  sampleEvery: 10,
  initial: makeInitialState(),
  actions: [],
})

test("loads a source only after the snapshot before it is saved, so a chained source reads a fresh parent", async () => {
  const events: string[] = []
  const loader = (name: string) => () => {
    events.push(`load ${name}`)
    return Promise.resolve(scenario(name))
  }
  await writeSnapshots({ parent: loader("parent"), child: loader("child") }, (name) => {
    events.push(`save ${name}`)
    return name
  })
  expect(events).toEqual(["load parent", "save parent", "load child", "save child"])
})
