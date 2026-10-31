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

## Research (dated, frozen)

| Date | File |
|---|---|
| Oct 2026 | [Assessment from running the simulator](research/2026-10-assessment.md) |
| Oct 2026 | [How real plants run the feedwater loop (sourced)](research/2026-10-feedwater-loop.md) |
| Oct 2026 | [Sizing check: steam flow at full gas](research/2026-10-sizing-check.md) |

## Agent configuration

Issue tracker, triage labels, domain docs: [agents/](agents/issue-tracker.md).
