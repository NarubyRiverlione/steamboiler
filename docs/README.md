# Documentation

Each fact has one home, and the kind of doc decides where that is:

- **Reference** (`plant/`, `dev/`) describes the plant and the code as they are today. Edit it in the same commit as the change it describes.
- **Decisions** (`adr/`) say why. Never edit one after the fact; supersede it with a new ADR.
- **Research** (`research/`) holds dated findings, sources and measurements. Frozen once written.
- **Work** (what to do next, bugs, ideas) lives only in GitHub issues, ordered in [ROADMAP.md](../ROADMAP.md). Never in a doc.

What the simulator is and why: the [README](../README.md). Domain terms: [GLOSSARY.md](../GLOSSARY.md).

## The plant (reference)

| Topic | File |
|---|---|
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

## Decisions

| ADR | |
|---|---|
| [0001](adr/0001-boiler-pressure-follows-saturation.md) | Boiler pressure follows saturation; playability never alters the physics |
| [0002](adr/0002-makeup-into-hotwell.md) | Makeup water enters at the hotwell; the boiler is fed only by the condensation pump |
| [0003](adr/0003-turbine-trip-on-vacuum-limit.md) | The turbine valve trips above the vacuum limit |
| [0004](adr/0004-return-stops-at-full-boiler.md) | The Return stops at a full boiler; no overflow |
| [0005](adr/0005-relief-valve-vents-to-atmosphere.md) | The relief valve vents to the atmosphere and is sized at 110% of full-gas steam |
| [0006](adr/0006-heating-rate-alarm-only.md) | The heating-rate limit is a time-compressed alarm on one lumped boiler temperature |
| [0007](adr/0007-water-state-is-mass-in-kg.md) | The water state is mass in kg; volume and level are derived |
| [0008](adr/0008-pressure-hold-with-gas.md) | The scenarios hold working pressure with gas, not with the steam valve |
| [0009](adr/0009-hotwell-sized-from-condensate-flow.md) | The hotwell is sized from condensate flow: 50 m³ |
| [0010](adr/0010-ui-redo-industrial-style.md) | Proposed, not decided: a UI redo in an industrial style (analog board after MC-v2, or a modern DCS screen) |

## Research (dated, frozen)

| Date | File |
|---|---|
| Oct 2026 | [Assessment from running the simulator](research/2026-10-assessment.md) |
| Oct 2026 | [How real plants run the feedwater loop (sourced)](research/2026-10-feedwater-loop.md) |
| Oct 2026 | [Sizing check: steam flow at full gas](research/2026-10-sizing-check.md) |
| Oct 2026 | [Cold startup: how real plants do it (sourced)](research/2026-10-startup-procedure.md) |
| Nov 2026 | [Hotwell level control: how real plants run it (sourced)](research/2026-11-hotwell-level-control.md) |
| Nov 2026 | [Hotwell sizing for this plant (sourced)](research/2026-11-hotwell-sizing.md) |

## Agent configuration

Issue tracker, triage labels, domain docs: [agents/](agents/issue-tracker.md).
