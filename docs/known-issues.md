# Known issues

- **Pressure runaway with closed valves.** From a cold start (20°C, `makeInitialState(20)`) at full gas
  (12000 L/s) with every valve closed, the boiler reaches 223°C / 27 bar after 2 sim-minutes, 432°C /
  228 bar after 4, and by 6 minutes pressure is `Infinity` and water volume 0. Nothing caps pressure
  or temperature. Found with the headless runner, Oct 2026; see the energy-balance work in
  [improvements.md](improvements.md).
- **Opening the turbine valve collapses the boiler.** In `startup-cold`, cracking the turbine valve
  to 5% at 11.6 bar drops the boiler to 1 bar / 100°C within 3 sim-minutes; the water then drains
  (~23 L/s) while RPM stalls near 18 and the condenser hotwell does not refill. Generator sync
  (3000 ±2 RPM) is not reachable from a cold start.
- **Steam flow switches between 0 and maximum (#11).** With the bypass at only 10% (`bypass-loop`)
  or the turbine valve at 5% (`startup-cold`), steam flow, boiler steam mass and energy delta jump
  between 0 and ~200 kg/s, and boiler pressure falls to 1 bar within minutes.
- **Condensation creates water (#10).** In `bypass-loop` the loop total (makeup, reject and drain
  undone) climbs from 60 t to ~86 t in an hour; the operator rejects water almost continuously to
  hold the hotwell. `CalculateCondensationFlow` also returns the full pump volume from an empty
  hotwell.
- **Hotwell near 100°C.** Condensate enters the hotwell at the condensation outlet temperature,
  which follows the bypass steam temperature, so the hotwell runs at ~99°C under vacuum.
- **Condensation pump overfills the boiler.** With the condensation pump valve at 50% the hotwell
  empties into the boiler, which rises past its 100,000 L total volume (137,000 L after 18 min) with
  70 t of steam mass.
- **Steam table wrong at high pressure (#22).** `getBoilingPoint(180)` gives about 434°C instead of
  357°C; the table lists saturated states past the critical point and extrapolates with a power law
  above it. `CstBoiler.DesignTemperature` is therefore a constant, not derived from the table.
- **Pressure rises during natural cooldown (#8).** In `cooldown`, with gas at 0 and every valve
  closed, boiler pressure still climbs at times (5.3 → 6.4 bar at 1200 s), caught by the
  "natural cooldown never heats" invariant.
- Extreme temperatures and pressures, and rapid input changes, may behave unrealistically.
- No historical data visualisation.
