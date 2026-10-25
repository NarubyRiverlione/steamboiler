# Assessment, 25 October 2026

Findings from running the simulator (suite, lint, UI, and a headless probe driving the real
`PowerPlantTick` through `powerPlantReducer`). Nothing in the repo was changed. The probe was a
throwaway; it is the seed for step 1 of [headless runner.md](headless%20runner.md).

## Verdict

The pure-function architecture is sound and the runner plan is right. The physics is not realistic
yet, and the cause is structural (missing invariants and a few bugs), not parameter tuning.

## Project state

- Tests: 16 of 17 pass; the failure is the known `electricOutput` test in `TurbineTick.test.ts`.
- Lint: fails on 2 unused variables in `SteamValveControl.tsx` (`useEMA`, `turbineSteamFlowOut`).
- `pnpm test` runs in watch mode and hangs in scripts; use `vitest run`.
- Branch `turbine-4` has about 14 uncommitted files; Phase 4 (generator breaker) is half-landed.
- UI loads with gas at 0, 239 °C, 13.8 bar and an energy change of -191 MJ/s (the flash-steam artifact below).

## Probe results

| Run | Result |
|---|---|
| Warm start (250 °C), gas off | 1,194 kg of steam appears within seconds, pressure jumps to 145 bar, boiler loses 191 MJ/s with nothing heating it |
| Warm start, full gas | Pressure hits the steam-table cap (~1,218 bar), temperature keeps rising to 733 °C, NaN at ~283 s |
| Cold start (20 °C), full gas | 117 °C / 1.9 bar at 60 s, 221 °C / 26 bar at 2 min, runaway to 430 °C / 226 bar, NaN at ~297 s |
| 30% gas, main steam valve open, turbine valve 40% | Stored steam is dumped, boiler falls to 100 °C / 1 bar by ~5 min, RPM peaks ~509 and decays, never near 3000 |
| Same run, water | Boiler water reaches 124,847 L (capacity 100,000 L) while the hotwell reads 0 |

## Problems, in suggested fix order

1. **Steam generation ignores the gas setting.** `calculateSteamGeneration` hardcodes `MaxGasFlow`.
   This is the energy-balance item in [improvements.md](improvements.md) and the root of most runaways.
2. **No safety valve or temperature cap.** The steam table clamps near 509 °C, nothing stops the runaway,
   and it ends in NaN.
3. **Inconsistent start state.** 250 °C water at 1 bar flashes violently on tick one.
   `StartTemperature: 250` creates the first pressure spike, not just a convenience.
4. **Water mass not conserved.** No cap on the boiler when condensate returns, and the condensate pump
   returns water even when the hotwell is empty.
5. **Steam flow units, suspected (not confirmed).** `MaxSteamRemovalRate` is documented as kg/s, but
   `valveFlow` in `BoilerRemoveSteam` is used as kg per tick and then divided by `DeltaTime`.
   A 40% valve gave ~354 kg/s against a 200 kg/s rated maximum.
6. **Arbitrary pressure model.** `Psat·(1+√(V1/V2)−1)` with 800–1600x "expansion factors" gives
   100–300+ bar in normal-looking states.
7. **Heating too fast.** No drum/metal thermal mass: 357 MW into 50 t of water goes 20 → 220 °C in ~2 min.
   Cooling is a constant rate, not proportional to the temperature difference.
8. **Electrical output is dimensionally off.** `steamFlow × 0.35` labelled MW is a black box.
9. **Slow UX.** Gas moves in 250–500 L/s clicks against a 12,000 L/s maximum (up to 24 clicks to full gas).
   Also, the `MaxGasFlow` comment says "typical 700–900 L/s" but the value is 12,000.

## Suggested first runner assertions

These fail today and would drive the fixes in order:

- No NaN or Infinity in any state field.
- Pressure stays under a design limit.
- Boiler water volume stays within 0 and `TotalVolume`.
- Steam rate is zero (or falls) when gas is zero.
- Total water mass is conserved across boiler, condenser and hotwell.

## Housekeeping

- 17 stray `vite` dev servers (16 from MC-v2, 1 from this project) were running and were killed on 25 Oct 2026.

## Open decision

Turn the probe into runner step 1 (loop + CSV, `tsx` as a dev dependency), or write the invariant
assertions first?
