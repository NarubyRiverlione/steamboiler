# Documentation

Each fact has one home, and the kind of doc decides where that is:

- **Reference** (`plant/`, `dev/`) describes the plant and the code as they are today. Edit it in the same commit as the change it describes.
- **Decisions** (`adr/`) say why, and are the rules tickets must honor. Edit one when the thinking changes, so it always reflects the current decision; git keeps the history.
- **Tickets** are the unit of work.
- **Research** (`research/`) holds dated findings, sources and measurements. Frozen once written.
- **Work** (what to do next, bugs, ideas) lives only in GitHub issues, ordered in [ROADMAP.md](../ROADMAP.md). Never in a doc.

What the simulator is and why: the [README](../README.md). Domain terms: [GLOSSARY.md](../GLOSSARY.md).

## The plant (reference)

| Topic | File |
|---|---|
| Schema of all parts, what each does, where the energy comes from | [plant/overview.md](plant/overview.md) |
| What a real plant has that this one does not | [plant/real-plant-gaps.md](plant/real-plant-gaps.md) |
| Size, limits and deliberate departures from a real plant (the register) | [plant/design-basis.md](plant/design-basis.md) |
| Boiler physics and constants | [plant/boiler.md](plant/boiler.md) |
| Turbine and generator, phases 1–5 | [plant/turbine.md](plant/turbine.md) |
| Condenser, vacuum system, hotwell | [plant/condenser.md](plant/condenser.md) |
| Water loop: boundary flows, level targets, control | [plant/feedwater-loop.md](plant/feedwater-loop.md) |

## The code (reference)

| Topic | File |
|---|---|
| State management, simulation loop, source layout, conventions | [dev/architecture.md](dev/architecture.md) |
| Headless scenario runner: scenarios, report, invariants, snapshots | [dev/headless-runner.md](dev/headless-runner.md) |
| Test layers, scenario definition, definition of done | [dev/testing.md](dev/testing.md) |
| Branches (`dev` for work, `ui` for the UI redo, `main` for releases), CI and GitHub Pages deployment | [dev/branching.md](dev/branching.md) |

## Decisions

| ADR | |
|---|---|
| [0001](adr/0001-boiler-pressure-follows-saturation.md) | Boiler pressure follows saturation; playability never alters the physics |
| [0002](adr/0002-makeup-into-hotwell.md) | Makeup water enters at the hotwell; the boiler is fed only by the condensation pump |
| [0003](adr/0003-turbine-trip-on-vacuum-limit.md) | The turbine valve trips above the vacuum limit |
| [0004](adr/0004-return-stops-at-full-boiler.md) | The Return stops at a full boiler; no overflow |
| [0005](adr/0005-relief-valve-vents-to-atmosphere.md) | The relief valve vents to the atmosphere and is sized at 110% of full-gas steam with no Return |
| [0006](adr/0006-heating-rate-alarm-only.md) | The heating-rate limit is a time-compressed alarm on one lumped boiler temperature |
| [0007](adr/0007-water-state-is-mass-in-kg.md) | The water state is mass in kg; volume and level are derived |
| [0008](adr/0008-pressure-hold-with-gas.md) | The scenarios hold working pressure with gas, not with the steam valve |
| [0009](adr/0009-hotwell-sized-from-condensate-flow.md) | The hotwell is sized from condensate flow: 50 m³ |
| [0010](adr/0010-pid-derivative-on-measurement.md) | The hold-mode PID takes its derivative on the measurement |
| [0011](adr/0011-hotwell-protections-in-the-tick.md) | Hotwell protections live in the tick; the working band is operator policy |
| [0012](adr/0012-dev-branch-main-for-releases.md) | `dev` is the working branch; `main` holds milestone releases |
| [0013](adr/0013-release-by-pull-request.md) | Releases reach `main` by pull request, gated by CI |
| [0014](adr/0014-ticket-branches-and-test-gates.md) | Every ticket on its own branch; merges into `dev` and `main` are test gates; UI tickets go through a temporary `ui` branch |
| [0015](adr/0015-ui-redo-analog-board-preferred.md) | A UI redo in an industrial style: the analog control-room board (with a [boiler mockup](adr/0015-boiler-panel-mockup.html) and a [full board mockup](adr/0015-full-board-mockup.html)) |
| [0016](adr/0016-scenario-definition-and-test-layers.md) | A scenario ends in goal checks; golden path and edge classes; unit, golden and edge test layers |
| [0017](adr/0017-burner-trips-on-low-water-level.md) | The burner trips on low water level |
| [0018](adr/0018-cold-fill-at-35-percent.md) | The boiler is filled cold to 35% so it expands to the working level |
| [0019](adr/0019-boiler-is-one-lumped-vessel.md) | The boiler is one lumped vessel, not a drum with risers and downcomers |
| [0020](adr/0020-snapshots-compare-with-tolerance.md) | Committed snapshots compare with a relative tolerance (1e-9), not exact digits |
| [0021](adr/0021-turbine-runup-from-steam-power.md) | The turbine runs up on steam power (physical torque, losses, inertia), paced by a hold-mode run-up rate |
| [0022](adr/0022-electric-output-from-enthalpy-drop.md) | Electric output from the isentropic enthalpy drop, flow and live condenser pressure |
| [0023](adr/0023-runner-speed-guard-is-opt-in.md) | The runner speed guard is its own opt-in layer, outside the `dev` gate |
| [0024](adr/0024-ticket-priority-by-kind-of-work.md) | Ticket priority says what kind of work a ticket is |
| [0025](adr/0025-finer-steam-table-for-density-slope.md) | A finer steam table above 300 °C smooths the steam density slope |
| [0026](adr/0026-valve-flow-follows-pressure.md) | Valve flow follows boiler pressure; the main steam valve closes at low pressure |
| [0027](adr/0027-generator-load-is-a-resisting-torque.md) | The generator load is a resisting torque on a free-running shaft; electric output is the load carried |
| [0028](adr/0028-exhaust-splits-by-quality-at-condenser-intake.md) | The turbine exhaust splits by its quality at the condenser intake |
| [0029](adr/0029-boiler-efficiency-from-flue-gas-heat-balance.md) | Boiler efficiency follows from a two-stage flue gas heat balance |
| [0030](adr/0030-return-pays-real-enthalpy.md) | The Return pays its real enthalpy, and rated steam flow follows what full gas makes |
| [0031](adr/0031-one-extraction-heater.md) | One passive extraction heater heats the Return, with its drain pumped forward |
| [0032](adr/0032-limited-condenser-and-stream-enthalpy.md) | The condenser is a limited exchanger, and every stream enters at its real enthalpy |

## Research (dated, frozen)

| Date | File |
|---|---|
| Oct 2026 | [Assessment from running the simulator](research/2026-10-assessment.md) |
| Oct 2026 | [How real plants run the feedwater loop (sourced)](research/2026-10-feedwater-loop.md) |
| Oct 2026 | [Sizing check: steam flow at full gas](research/2026-10-sizing-check.md) |
| Oct 2026 | [Cold startup: how real plants do it (sourced)](research/2026-10-startup-procedure.md) |
| Nov 2026 | [Condenser heat transfer: figures for a limited exchanger (sourced)](research/2026-11-condenser-heat-transfer.md) |
| Nov 2026 | [Economizer and flue gas: figures for the two-stage model (sourced)](research/2026-11-economizer-flue-gas.md) |
| Nov 2026 | [Extraction heaters: figures for regenerative feedwater heating (sourced)](research/2026-11-extraction-heaters.md) |
| Nov 2026 | [Hotwell level control: how real plants run it (sourced)](research/2026-11-hotwell-level-control.md) |
| Nov 2026 | [Hotwell sizing for this plant (sourced)](research/2026-11-hotwell-sizing.md) |
| Nov 2026 | [SJAE motive steam: where it comes from on a cold start (sourced)](research/2026-11-sjae-motive-steam.md) |

## Agent configuration

Issue tracker, triage labels, domain docs: [agents/](agents/issue-tracker.md).
