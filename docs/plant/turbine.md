# Turbine and generator

The turbine is built in phases. Steam from the boiler passes the turbine valve, spins the turbine, and the generator turns that into electricity.

| Phase | Scope | Status |
|---|---|---|
| 1 | Black box: steam flow → electricity at a fixed ratio | ✅ |
| 2 | Turbine exhaust feeds the condenser, with energy loss | ✅ |
| 3 | RPM physics, run-up points, Free / Ramp up / Hold speed modes with PID | ✅ |
| 4 | Generator breaker | partly done: see Phase 4 |
| 5 | Synchronisation and synchroscope | planned |

## Phase 1: black-box

- A fixed steam-to-electricity ratio of 35% in `CstTurbine` (replaced in #14, see Electric output)
- `Turbine` directories in `context/` and `components/`, mirroring the condenser files
- Turbine reducer wired into the PowerPlant provider and context; a 'Turbine' routing tab
- Readout shows produced electricity in MW

## Phase 2: condenser coupling

- Steam leaving the turbine has reduced energy: its exhaust quality, the vapour share by mass, follows from the enthalpy drop at the live condenser pressure (see [Electric output](#electric-output-14-since-71-the-load-carried), #81)
- The condenser takes its steam from the turbine instead of the bypass valve; all exhaust arrives, whatever the vacuum (#20)
- The bypass valve gets its own condenser intake
- Both intakes are used in the condenser calculations (see [condenser.md](condenser.md))

## Phase 3: RPM and control

- RPM readout, run-up point buttons and a Free / Ramp up / Hold mode selector in the turbine control panel
- Ramp up and Hold move the turbine valve automatically (the PID); Free leaves it to the operator

**RPM physics** (#69, [ADR 0021](../adr/0021-turbine-runup-from-steam-power.md)): the speed follows from the shaft power the steam delivers, in physical units (`calculateRPM`, `turbineCalculations.ts`). `TurbineTick` computes the enthalpy drop once (`getIsentropicEnthalpyDrop`) and passes it to `calculateRPM` together with the load the generator carries (see Generator load).

- **Shaft power** P = flow [kg/s] × enthalpy drop [kJ/kg] × `IsentropicEfficiency`, in W.
- **Drive torque** T = (P / ω_s) · (2 − ω / ω_s) in N·m, ω_s = 2π · `SyncRPM` / 60: twice the sync-speed torque at standstill, no division by zero. It falls to zero at 2·ω_s (about 6000 rpm); the turbine trips at `MaxRPM` before it gets there ([ADR 0040](../adr/0040-turbine-trip-on-overspeed.md), #72).
- **Losses** torque k·ω² (power k·ω³). k is calibrated so the no-load flow (`NoLoadFlowFraction` × `RatedSteamFlow`, at the rated drop) delivers exactly the loss power at sync speed: k = P_noload / ω_s³, about 4.0 MW at sync speed, so 3% of rated flow (5.1 kg/s at 917 kJ/kg) holds 3000 rpm in Free. The generator load is a separate torque (see Generator load).
- **Inertia** J = 2·H·S / ω_s² in kg·m², with H = `InertiaConstant` (4 s) and S the rated electric output (`RatedSteamFlow` × the drop that does work, `RatedEnthalpyDrop` less the extraction share below the tap, × the two efficiencies, 141.3 MW), about 11 450 kg·m². Power factor is ignored (a real S is in MVA, about 15% more).
- **Motion** J · dω/dt = T − k·ω², stepped once per tick (Euler), floored at 0 rpm.

| Constant (`CstTurbine`) | Value | Role |
|---|---|---|
| RatedSteamFlow | 192 kg/s | what full gas makes at 165 bar with the feedwater heated by the deaerator and the extraction heater (re-checked in #119: still within 3 kg/s; measured in `max-output`, #88, was 158 with no heater in #82 and 161 in #74, ADR 0030, ADR 0031); sizes S, the loss and the tap pressure |
| RatedEnthalpyDrop | 1016 kJ/kg | isentropic drop at 165 bar to the 31 mbar design vacuum (ADR 0032); sizes S and the loss |
| InertiaConstant | 4 s | H of the shaft line; J is derived from it |
| NoLoadFlowFraction | 0.03 | of rated flow; calibrates the losses |

Sources and the departures: [design-basis.md](design-basis.md#turbine-speed-model-figures). Free acceleration to sync speed takes minutes (10 kg/s at 1016 kJ/kg: about 105 s), set by J and the shaft power, not by a lag.

**Speed modes** (#70, [ADR 0021](../adr/0021-turbine-runup-from-steam-power.md); terms in `GLOSSARY.md`). `TurbineState.speedMode` is `free`, `rampUp`, `hold` or `synchronised`; `runUpPoint` is the selected point and `speedReference` the rpm the PID aims at.

| Mode | Valve moved by | PID target | Engaged when |
|---|---|---|---|
| Free | the operator | none | always (`SET_SPEED_MODE`) |
| Ramp up | the PID | `speedReference`, climbing at `RunUpRate` (50 rpm/min) and stopping at the point | main steam valve open and the point above the speed |
| Hold | the PID | the selected point, no ramp | speed within `HoldEngageWindow` (±5 rpm) of the point |
| Synchronised | the PID (as Hold, same gains) | 3000 rpm (`SyncRPM`) | closing the generator breaker (#135); never selected |

- **Run-up points:** `CstTurbine.RunUpPoints` = 500, 1500, 2500, 3000 rpm, default 3000 (`DefaultRunUpPoint`), chosen with `SELECT_RUN_UP_POINT`. There is no free setpoint.
- **Picking a point:** in Free it only selects the target. In Ramp up or Hold a point above the speed (main steam valve open) starts or retargets Ramp up (from Hold the reference starts at the current speed, a running ramp keeps its reference); a point at or below the speed is refused.
- **Arrival:** when the reference has reached the point and the speed is within the window of it, `TurbineTick` changes Ramp up to Hold. Hold stays on if the speed leaves the window.
- **Refusals** leave the state unchanged (like the breaker toggle and the valve refusal of ADR 0003). `speedModeRefusal` and `runUpPointRefusal` (`turbineCalculations.ts`) give the reason; the reducer refuses on it and the UI shows it as the tooltip of the disabled button. With the breaker closed every speed mode and run-up point is refused with one constant reason (#135, "Generator synchronised: open the breaker to change the speed mode"), also in the window after a trip.
- **Synchronised** (#135): closing the breaker sets `synchronised`, `runUpPoint` and reference 3000 and the integral 0, from any mode. Opening it by hand returns to Free (integral cleared, reference on the rpm); the tick's auto-open (speed outside ±2 rpm) goes to Hold at 3000 rpm with `runUpPoint` 3000, so a load rejection is still governed (`max-output`); a trip returns to Free, with the breaker closed until the speed leaves the window. The SYNC lamp and `MODE_LABELS` show it.
- **Up only:** no ramp down. To slow down, switch to Free and close the valve.
- **PID inactive** (Free, or main steam valve closed): the integral resets and `speedReference` follows the speed; the mode stays as it is.

**PID controller** (Ramp up and Hold): Kp = 0.001 (current error), Ki = 0.0001 (accumulated error, removes steady-state error), Kd = 0.0005 (damping). D acts on the measured rpm, `−Kd · (rpm_now − rpm_before_tick) / dt`, not on the error, so engaging the controller or changing the setpoint gives no derivative kick and D needs no memory. The only memory is `pidIntegralError` in `TurbineState` (a tick depends on its input state alone); it is reset to 0 whenever the PID is inactive (Free or main steam valve closed), so every (re)engage starts with a zero integral ([ADR 0010](../adr/0010-pid-derivative-on-measurement.md)).

These gains need no retune for the engage (#63). Hold engaged from Free at the edge of its window, with the valve at 0.5 to 1.5 times its no-load position, stays between 2994 and 3006 rpm, is back within ±2 rpm in under a second, and the valve never shuts (0.4–4.0%). Under generator load (`turbine-load`, rated output at the load rate) the speed stays within 0.02 rpm of sync with these gains, so no retune for #71.

**Electricity** is only generated with the breaker closed at sync speed (3000 RPM ±2), as the generator must match the 50 Hz grid. `MaxRPM` (3300) is the overspeed limit: at or above it with the turbine valve open the turbine trips (valve to 0, Free, integral cleared, `turbineTripped`, as for the vacuum trip), and the reducer refuses to open the valve there (ADR 0040, #72).

**Generator frequency** follows from shaft speed alone: `generatorFrequency` gives `f = rpm × GeneratorPoles / 120`, so the two-pole, direct-coupled generator makes 50 Hz at 3000 rpm and the ±2 rpm breaker window is 50 Hz ± 0.033 Hz. It is derived, not state, and shown in the headless report only. The speed is never locked to the grid ([ADR 0027](../adr/0027-generator-load-is-a-resisting-torque.md)): with the breaker closed it still follows the rpm, which sags under load; Synchronised holds 3000 rpm with the Hold PID, it does not lock the speed to the grid.

Calculations: `src/utils/turbineCalculations.ts`; tick: `src/context/Turbine/TurbineTick.ts`.

## Vacuum interlock and turbine trip

The turbine valve may only be open, or be opened, while condenser pressure is at or below the **vacuum limit** (`CstCondenser.VacuumLimit`; value and source in [design-basis.md](design-basis.md#steam-path-and-turbine)). The limit is one-sided: a deep vacuum is never refused. Decision: [ADR 0003](../adr/0003-turbine-trip-on-vacuum-limit.md).

- **Operator:** above the limit, `ADJUST_STEAM_TURBINE_VALVE` refuses any opening and leaves the state unchanged; closing is always allowed.
- **Turbine trip:** `TurbineTick` takes the condenser pressure (`PowerPlantTick` passes the pressure going into the tick). Above the limit with the valve open, it sets the valve to 0, returns the speed mode to Free and resets `pidIntegralError` to 0, so the PID cannot restart the turbine on its own. Like a PID move, the closed valve takes effect on the steam path from the next tick (0.1 s).
- **Ramp up and Hold:** above the limit the PID may only close the valve, never open it.
- **Trip flag:** `turbineTripped` in `TurbineState` is set by a trip and cleared by the next opening of the valve, by the operator or by the PID. The turbine status panel shows it as the "Turbine trip" indicator.

The checks (`isAboveVacuumLimit`, `maxTurbineValvePosition`, `turbineTrippedAfter`) live in `src/utils/turbineCalculations.ts`, shared by the reducer and the tick. The bypass valve and the generator breaker are not interlocked with the vacuum.

## Low-pressure closure

When boiler pressure at the start of a tick is at or below `MainSteamValveMinimumPressure` (10 bar), `MainSteamValveLowPressureClosure` closes the main steam valve. `PowerPlantTick` runs it before any steam is removed, so no steam leaves on that tick. The valve stays closed until the operator reopens it, and `TOGGLE_MAIN_STEAM_VALVE` refuses that at or below 10 bar; the "Opening not possible" indicator matches that refusal exactly. There is no hysteresis and no automatic reopening. Decision: [ADR 0026](../adr/0026-valve-flow-follows-pressure.md).

- **Turbine valve open:** the closure is a turbine trip, with the same values as the vacuum trip: valve to 0, speed mode to Free, `pidIntegralError` to 0, `turbineTripped` set.
- **Turbine valve shut:** only the main steam valve closes. No trip flag, and the speed mode stays. The bypass valve keeps its position in both cases, passing nothing while the main steam valve is shut.

## Phase 4: generator breaker

Done:

- The breaker can only be closed at sync speed: 3000 RPM ±2 (`SyncRPM` ± `BreakerRPMMargin`, 50 Hz grid); toggling a closed breaker opens it (`TOGGLE_GENERATOR_BREAKER`)
- The generator carries load only while the breaker is closed; opening it, by hand or automatically, drops the load and the load setpoint to 0 on that tick
- If the steam cannot hold sync speed with the breaker closed (the speed leaves ±2 rpm), the breaker opens automatically
- UI: `GeneratorBreakerControl.tsx`

Sync is not reachable from a cold start today (#18).

## Phase 5: synchronisation

- Net demand in MW: the operator's load setpoint of #71 replaces the planned constant (see Generator load)
- Calculate the generator phase from turbine speed
- Add a synchroscope to the turbine controls showing the phase difference between generator and grid

## Generator load (#71)

[ADR 0027](../adr/0027-generator-load-is-a-resisting-torque.md). The electric output is the load the generator carries, an input to the shaft balance, not a result of the steam flow.

- **Shaft balance:** `J·dω/dt = drive torque − loss torque − load torque`, `load torque = (load / GeneratorEfficiency) / ω` (constant power). `calculateRPM(rpm, flow, drop, loadMW)`; the load is 0 with the breaker open.
- **Speed is free** (island model): it sags under load, the Hold PID opens the valve, and more load takes more steam. At the no-load flow the output is 0 MW.
- **Load setpoint** (`TurbineState.loadSetpoint`, action `SET_LOAD_SETPOINT`): MW, default 0, clamped to 0 up to `LoadSetpointLimit` (200), above the rated output (`ratedOutputMW`, 141.3), so the steam limits the load (#84). Only with the breaker closed, in any speed mode; otherwise refused by `loadSetpointRefusal` ("Close the generator breaker first") and the state is unchanged. Hold has no new interlock; in Free the operator follows the load by hand.
- **Load rate:** `electricOutput` moves toward the setpoint at `LoadRate` (3% of rated output per minute, about 3.9 MW/min), up and down (`loadAfter`), kept from tick to tick.
- **Breaker:** the ±2 rpm rule stays. Whenever it opens, the load and setpoint are 0 on that tick and a reclose brings no load back. Steam that cannot carry the load, or a vacuum trip with load on, makes the speed fall and ends there. No reverse power protection or runback. A load lost in Free ends in the overspeed trip at `MaxRPM` (#72).
- **UI:** `LoadControl.tsx` (setpoint field, disabled with the refusal as its reason) and the load and load setpoint readouts in `TurbineReadouts.tsx`.
- **Scenario:** `turbine-load` shuts the bypass and sets the setpoint to 125 MW at t = 0 (rated output, 141.3 MW, is out of reach: the no-load steam comes off the full-gas flow, about 130 MW is the most the gas carries) (#74: the 10 kg/s through the bypass is heat rated output cannot afford) and runs 3000 s with the gas ceiling at full gas: speed within ±2 rpm of sync, 165 bar, breaker never opens, output 125 MW from about 2000 s (steam 152 kg/s, gas about 11 400 L/s, condenser 29 mbar, cooling water rise 7.8 K). `max-output` (#84) takes the load past rated with the bypass shut: the gas is the limit. Full gas at about 130 MW and 158 kg/s, pressure then sags, the valve is fully open at about 143 MW (171 kg/s, 146 bar), then the speed sags and the breaker opens at −2 rpm. The load rejection that follows peaks at about 3140 rpm, Hold shuts the valve and is back within ±2 rpm in about 12 s, and the steam it no longer takes lifts the relief valve, because the gas hold comes down slowly.

## Electric output (#14, since #71 the load carried)

The enthalpy drop (`getIsentropicEnthalpyDrop`, `steamTable.ts`) no longer sets the electric output; it sets the shaft power and, at the rated flow, the rated output that sizes the inertia and the load limit.

- **Drop:** `getIsentropicEnthalpyDrop(boilerPressure, condenserPressure)`: saturated steam from the boiler pressure (no superheater) expanded at constant entropy to the live condenser pressure, so poor vacuum and low boiler pressure cost shaft power, and so steam, for the same load. Data: `steamEntropyData.ts`, IAPWS-IF97, 0.01 bar to 220 bar, interpolated in ln(pressure); pressures outside it clamp.
- **Constants:** `IsentropicEfficiency` 0.85, `GeneratorEfficiency` 0.98 (`CstTurbine`). `calculateElectricityOutput` and `steamToElectricityEfficiency` are gone.
- **Exhaust enthalpy and quality:** `getExhaustEnthalpy(boilerPressure, condenserPressure, IsentropicEfficiency, workFraction)` (`steamTable.ts`): the exhaust enthalpy is the inlet enthalpy minus the work the shaft took per kg, `IsentropicEfficiency` × the drop × `workFraction`, with `workFraction` = `shaftWorkFraction(rpm)` = x(2 − x) for x = rpm ÷ sync (the steam torque of the speed model times the speed): 1 at sync speed, 0 at standstill, where the exhaust is the inlet steam. `getExhaustQuality` (same arguments) turns it into the vapour share, about 0.67 at 165 bar to 100 mbar at sync speed; limited to 0–1, and 1 with a zero or negative drop. The condenser takes the enthalpy and splits the exhaust itself ([ADR 0028](../adr/0028-exhaust-splits-by-quality-at-condenser-intake.md), [condenser.md](condenser.md#intakes)).
- Rated values: see [design-basis.md](design-basis.md). Scenario: `turbine-load` (golden path).

## Extraction heater (#88)

[ADR 0031](../adr/0031-one-extraction-heater.md). One passive heater takes steam from the turbine at a tap partway through the expansion and heats the feedwater from the deaerator before the economizer; the deaerator takes its own steam from the same tap ([deaerator.md](deaerator.md)). Functions: `src/utils/extractionHeater.ts`; the tick wiring is in `PowerPlantTick`; constants in `CstHeater`.

- **Two sections on one expansion line:** the full flow expands from boiler pressure to the tap, what is left expands on to the condenser, both at `IsentropicEfficiency`. The tap steam is at `h_in − workFraction × η × drop(boiler → tap)` and the exhaust is at `h_in − workFraction × η × drop(boiler → condenser)` as before. With no extraction the shaft power and the exhaust are exactly what they were ([ADR 0022](../adr/0022-electric-output-from-enthalpy-drop.md), [ADR 0028](../adr/0028-exhaust-splits-by-quality-at-condenser-intake.md)), and a test pins it.
- **Shaft power:** `calculateRPM` still takes one enthalpy drop. `shaftDropWithExtraction` gives it the drop that does the same work per kg of turbine flow: the full drop less the extracted share of the drop below the tap. `TurbineTick` takes the extraction flows of the last tick, heater and deaerator tap together (`HeaterState.extractionFlow` + `DeaeratorState.extractionFlow`); `ratedExtractionShare` sizes the rated output on both (141.9 MW, #119).
- **Tap pressure** is proportional to the turbine flow, `TapPressureAtRated` (5 bar) at `RatedSteamFlow`. The heater pressure is the tap pressure less `LineDrop` (6%), and the feedwater leaves `TerminalTemperatureDifference` (2 K) below its saturation temperature. The water is never cooled: if it is already hotter, nothing is extracted. Fed from the deaerator at 133.5 °C the heater is off below a tap pressure of about 3.2 bar (about 64% of the rated flow).
- **Extraction steam** follows from the heat the Return takes, on enthalpy: `flow = feedwater × (h(T_out) − h(T_in)) / (h_tap − h_saturated liquid at the heater pressure)`, capped at the turbine flow. Zero with no turbine flow or no Return. The feedwater is the last tick's deaerator outflow and temperature (a lag of one tick, 0.1 s), because the condenser runs after the exhaust flow is known.
- **Drain:** the steam condenses and its drain **cascades back into the deaerator** (#119, [ADR 0036](../adr/0036-deaerator-is-a-steam-heated-tank.md)) as saturated liquid at the heater pressure (`drainEnthalpyOf`), so its heat replaces some deaerator steam. The feedwater takes the heat from the tap enthalpy to the drain (`heatFeedwater`, never above the heater saturation). Mass and heat are conserved: the extraction steam never reaches the condenser and the boiler gets it back as water through the deaerator.
- **State:** `Heater` in the plant state holds `extractionFlow`, `tapPressure`, `heaterPressure` and `returnTemperature` (the feedwater after the heater, what the economizer receives). The sim report shows the extraction flow and tap pressure in the Turbine group and the Return after the heater in the Boiler group.
- **Measured** (`turbine-load`, 125 MW; #88 alone: steam 173 kg/s, extraction 44 kg/s, Return 144 °C after the heater, boiler 90.1%, plant 33.2%, 31.4% with no heater): with the deaerator (#119) steam 176 kg/s, heater 5 kg/s and deaerator tap 38 kg/s, tap 4.6 bar, feedwater 144 °C after the heater and 198 °C after the economizer, stack 229 °C, boiler 90.0%, plant 32.4%. At the rated flow (192 kg/s) the tap is at 5.0 bar and the feedwater at 148 °C.
- **Trip:** the `turbine-trip` edge scenario shuts the turbine valve at 125 MW and dumps the steam through the bypass. The extraction is zero from the next tick and the Return reaches the economizer at the hotwell temperature; the cold Return costs the boiler heat and the pressure falls to about 136 bar, never above the design pressure.
