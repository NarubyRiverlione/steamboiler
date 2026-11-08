# Hot-start golden scenario

This project does not add a `startup-hot` golden-path scenario (turbine start from a plant already at pressure), nor a `bypass-transient` scenario.

## Why this is out of scope

The hot-standby start state is not new: it is the `bypass-loop` snapshot (165 bar, turbine still, loop settled), which the UI's Hot standby preset (#24) loads too. A `startup-hot` run from it would repeat what the golden path already guards in pieces: `turbine-runup` (to 3000 rpm), `turbine-sync` (breaker closes) and `turbine-load` (load climbs). It would only skip the first ~20 minutes of heating, so it would add runtime to the `dev` gate for almost no new coverage.

ADR 0021 also has the turbine start cold every time and records the hot-start rate as a simplification, so a hot start would run the same 50 rpm/min run-up as the cold one.

`bypass-transient` (open and close the bypass at pressure) has no limit or goal, and [ADR 0016](../docs/adr/0016-scenario-definition-and-test-layers.md) says a run with no goal check is not a scenario. If a limit worth judging turns up, file it as its own ticket.

## Prior requests

- #64: "Hot-start scenario: startup-hot from a hot-standby snapshot"
