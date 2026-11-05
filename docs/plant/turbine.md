# Turbine and generator

The turbine is built in phases. Steam from the boiler passes the turbine valve, spins the turbine, and the generator turns that into electricity.

| Phase | Scope | Status |
|---|---|---|
| 1 | Black box: steam flow → electricity at a fixed ratio | ✅ |
| 2 | Turbine exhaust feeds the condenser, with energy loss | ✅ |
| 3 | RPM physics, set point, free/hold mode with PID | ✅ |
| 4 | Generator breaker | partly done: see Phase 4 |
| 5 | Synchronisation and synchroscope | planned |

## Phase 1: black-box

- A fixed steam-to-electricity ratio of 35% in `CstTurbine` (replaced in #14, see Electric output)
- `Turbine` directories in `context/` and `components/`, mirroring the condenser files
- Turbine reducer wired into the PowerPlant provider and context; a 'Turbine' routing tab
- Readout shows produced electricity in MW

## Phase 2: condenser coupling

- Steam leaving the turbine has reduced energy: `outputTemp` and `outputPressure`, via a dedicated heuristic or empirical loss calculation
- The condenser takes its steam from the turbine instead of the bypass valve; all exhaust arrives, whatever the vacuum (#20)
- The bypass valve gets its own condenser intake
- Both intakes are used in the condenser calculations (see [condenser.md](condenser.md))

## Phase 3: RPM and control

- RPM readout, RPM set point slider, and a free/hold toggle in the turbine control panel
- Hold mode adjusts the turbine valve automatically to keep the set point

**RPM physics** (#69, [ADR 0021](../adr/0021-turbine-runup-from-steam-power.md)): the speed follows from the shaft power the steam delivers, in physical units (`calculateRPM`, `turbineCalculations.ts`). `TurbineTick` computes the enthalpy drop once (`getIsentropicEnthalpyDrop`) and passes it to both `calculateRPM` and `calculateElectricityOutput`.

- **Shaft power** P = flow [kg/s] × enthalpy drop [kJ/kg] × `IsentropicEfficiency`, in W.
- **Drive torque** T = (P / ω_s) · (2 − ω / ω_s) in N·m, ω_s = 2π · `SyncRPM` / 60: twice the sync-speed torque at standstill, no division by zero. It falls to zero at 2·ω_s (about 6000 rpm); there is no overspeed trip yet (#72).
- **Losses** torque k·ω² (power k·ω³). k is calibrated so the no-load flow (`NoLoadFlowFraction` × `RatedSteamFlow`, at the rated drop) delivers exactly the loss power at sync speed: k = P_noload / ω_s³, about 4.0 MW at sync speed, so 3% of rated flow (5.1 kg/s at 917 kJ/kg) holds 3000 rpm with hold mode off. It assumes no generator load torque (#71).
- **Inertia** J = 2·H·S / ω_s² in kg·m², with H = `InertiaConstant` (4 s) and S the rated electric output (`RatedSteamFlow` × `RatedEnthalpyDrop` × the two efficiencies, 130.6 MW), about 10 590 kg·m². Power factor is ignored (a real S is in MVA, about 15% more).
- **Motion** J · dω/dt = T − k·ω², stepped once per tick (Euler), floored at 0 rpm.

| Constant (`CstTurbine`) | Value | Role |
|---|---|---|
| RatedSteamFlow | 171 kg/s | the design steam flow; sizes S and the loss |
| RatedEnthalpyDrop | 917 kJ/kg | isentropic drop at 165 bar to 100 mbar; sizes S and the loss |
| InertiaConstant | 4 s | H of the shaft line; J is derived from it |
| NoLoadFlowFraction | 0.03 | of rated flow; calibrates the losses |

Sources and the departures: [design-basis.md](design-basis.md#turbine-speed-model-figures). Free acceleration to sync speed takes minutes (10 kg/s at 917 kJ/kg: about 116 s), set by J and the shaft power, not by a lag.

**PID controller** (hold mode): Kp = 0.001 (current error), Ki = 0.0001 (accumulated error, removes steady-state error), Kd = 0.0005 (damping). D acts on the measured rpm, `−Kd · (rpm_now − rpm_before_tick) / dt`, not on the error, so engaging the controller or changing the setpoint gives no derivative kick and D needs no memory. The only memory is `pidIntegralError` in `TurbineState` (a tick depends on its input state alone); it is reset to 0 whenever the PID is inactive (hold mode off or main steam valve closed), so every (re)engage starts with a zero integral ([ADR 0010](../adr/0010-pid-derivative-on-measurement.md)).

**Electricity** is only generated with the breaker closed at sync speed (3000 RPM ±2), as the generator must match the 50 Hz grid. `MaxRPM` (3300) is the overspeed limit and caps the RPM setpoint; the setpoint defaults to sync speed.

Calculations: `src/utils/turbineCalculations.ts`; tick: `src/context/Turbine/TurbineTick.ts`.

## Vacuum interlock and turbine trip

The turbine valve may only be open, or be opened, while condenser pressure is at or below the **vacuum limit** (`CstCondenser.VacuumLimit`; value and source in [design-basis.md](design-basis.md#steam-path-and-turbine)). The limit is one-sided: a deep vacuum is never refused. Decision: [ADR 0003](../adr/0003-turbine-trip-on-vacuum-limit.md).

- **Operator:** above the limit, `ADJUST_STEAM_TURBINE_VALVE` refuses any opening and leaves the state unchanged; closing is always allowed.
- **Turbine trip:** `TurbineTick` takes the condenser pressure (`PowerPlantTick` passes the pressure going into the tick). Above the limit with the valve open, it sets the valve to 0, switches hold mode off and resets `pidIntegralError` to 0, so the PID cannot restart the turbine on its own. Like a PID move, the closed valve takes effect on the steam path from the next tick (0.1 s).
- **Hold mode:** above the limit the PID may only close the valve, never open it.
- **Trip flag:** `turbineTripped` in `TurbineState` is set by a trip and cleared by the next opening of the valve, by the operator or by the hold-mode PID. The turbine status panel shows it as the "Turbine trip" indicator.

The checks (`isAboveVacuumLimit`, `maxTurbineValvePosition`, `turbineTrippedAfter`) live in `src/utils/turbineCalculations.ts`, shared by the reducer and the tick. The bypass valve and the generator breaker are not interlocked with the vacuum.

## Phase 4: generator breaker

Done:

- The breaker can only be closed at sync speed: 3000 RPM ±2 (`SyncRPM` ± `BreakerRPMMargin`, 50 Hz grid); toggling a closed breaker opens it (`TOGGLE_GENERATOR_BREAKER`)
- Electricity is only produced while the breaker is closed
- UI: `GeneratorBreakerControl.tsx`

Not built yet:

- If the steam flow cannot hold sync speed with the breaker closed, the breaker opens automatically

Sync is not reachable from a cold start today (#18).

## Phase 5: synchronisation

- Add a net demand in MW to the readout (constant in `CstTurbine`)
- Calculate the generator phase from turbine speed
- Add a synchroscope to the turbine controls showing the phase difference between generator and grid

## Electric output (#14)

`calculateElectricityOutput` (`turbineCalculations.ts`), called every tick by `TurbineTick`:

`MW = turbineSteamFlowOut [kg/s] × isentropic enthalpy drop [kJ/kg] × IsentropicEfficiency × GeneratorEfficiency / 1000`

- **Flow:** the actual `turbineSteamFlowOut`, the same flow RPM and the condenser see, not the valve position.
- **Drop:** `getIsentropicEnthalpyDrop(boilerPressure, condenserPressure)` (`steamTable.ts`): saturated steam from the boiler pressure (no superheater) expanded at constant entropy to the live condenser pressure, so poor vacuum and low boiler pressure cost output. Data: `steamEntropyData.ts`, IAPWS-IF97, 0.01 bar to 220 bar, interpolated in ln(pressure); pressures outside it clamp.
- **Constants:** `IsentropicEfficiency` 0.85, `GeneratorEfficiency` 0.98 (`CstTurbine`). `steamToElectricityEfficiency` is gone.
- **Gating:** breaker closed and at sync speed, otherwise 0 MW. Clamped at 0 MW for no flow or a non-positive drop, never negative.
- **Scope:** MW readout, from the same enthalpy drop that drives the speed model (#69); no shaft load torque (#71) and no net demand in MW.
- Rated values: see [design-basis.md](design-basis.md). Scenario: `turbine-load` (golden path).
