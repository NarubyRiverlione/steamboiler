import { writeFileSync } from "node:fs"
import process from "node:process"
import { runScenario, toCsv, Scenario } from "./runner"

// Hardcoded operator scenario: heat the (warm-start) boiler, open the main steam valve, spin the turbine.
const demo: Scenario = {
  name: "demo",
  duration: 3600,
  sampleEvery: 10,
  actions: [
    { at: 0, action: { type: "INCREASE_GAS_FLOW", amount: 6000 } },
    {
      at: 0,
      action: { type: "SET_AIR_EXTRACTION_PUMP_ENABLED", payload: { isAirExtractionPumpEnabled: true } },
    },
    { at: 0, action: { type: "SET_SJAE_ENABLED", payload: { isSjaeEnabled: true } } },
    { at: 600, action: { type: "TOGGLE_MAIN_STEAM_VALVE" } },
    { at: 610, action: { type: "ADJUST_STEAM_TURBINE_VALVE", payload: { turbineValvePosition: 0.3 } } },
  ],
}

const out = process.argv[2] ?? "sim-out.csv"
const start = performance.now()
const samples = runScenario(demo)
writeFileSync(out, toCsv(samples))
const ms = Math.round(performance.now() - start)
console.log(`${demo.name}: ${String(samples.length)} samples -> ${out} (${String(ms)} ms wall)`)
