# Known issues

- **Pressure runaway with closed valves.** From a cold start (20°C, `makeInitialState(20)`) at full gas
  (12000 L/s) with every valve closed, the boiler reaches 223°C / 27 bar after 2 sim-minutes, 432°C /
  228 bar after 4, and by 6 minutes pressure is `Infinity` and water volume 0. Nothing caps pressure
  or temperature. Found with the headless runner, Oct 2026; see the energy-balance work in
  [improvements.md](improvements.md).
- **Opening the turbine valve collapses the boiler.** In `startup-cold`, cracking the turbine valve
  to 5% at 11.6 bar drops the boiler to 1 bar / 100°C within 3 sim-minutes; the water then drains
  (~23 L/s) while RPM stalls near 18 and the condenser hotwell does not refill. Generator sync
  (3600 ±2 RPM) is not reachable from a cold start.
- **Condensation pump overfills the boiler.** With the condensation pump valve at 50% the hotwell
  empties into the boiler, which rises past its 100,000 L total volume (137,000 L after 18 min) with
  70 t of steam mass.
- **Turbine PID state is module-global.** `integralError` / `previousError` in
  `src/context/Turbine/TurbineTick.ts` live outside `PowerPlantState`, so hold-mode runs are not
  pure: two runs in the same process (or a UI reload without page refresh) influence each other.
  Move them into `TurbineState` before writing hold-mode scenarios.
- `StartTemperature: 250` in `src/context/const.ts` is a hardcoded warm start, a workaround for the slow
  feedback loop. The runner plan replaces it with snapshots; headless scenarios already start cold via
  `makeInitialState(20)`.
- Boiling point uses a simplified power law above the steam table range.
- Extreme temperatures and pressures, and rapid input changes, may behave unrealistically.
- No historical data visualisation.
