# The vital bus and the safety bus

**Status: accepted.** Decided in #143, M2 of [ADR 0046](0046-from-island-to-town-grid-in-milestones.md). Builds on [ADR 0053](0053-the-auxiliary-bus-is-fed-by-the-grid-or-the-generator.md) (the Auxiliary bus, breaker control power and the controller controls) and the research of #174. Figures: [research note](../research/2026-11-ups-runtime.md).

Two buses sit next to the **Auxiliary bus**:

| Bus | Fed by | Carries | Dead when |
|---|---|---|---|
| **Vital bus** | the Auxiliary bus | the controller controls (load setpoint, speed mode, run-up point); the board's LCD readouts and the annunciator (#144) | the Auxiliary bus is dead |
| **Safety bus** | the **UPS**, through the **UPS breaker** | breaker control power, the trip reset; the emergency light (#144), the emergency oil pump (#159) | the UPS breaker is open or the **UPS charge** is 0% |
| none | | the analog gauges (mechanical) | never |

## Decisions

- **The vital bus has no battery.** It is derived each tick (`isVitalBusLive`, `SafetyBus.ts`), never stored, and equals the Auxiliary bus. A dead Auxiliary bus kills it.
- **The UPS carries the safety bus on the operator's action.** The UPS breaker (`upsBreaker`) is manual, never closes by itself and needs no power: its actions (`CLOSE_UPS_BREAKER`, `OPEN_UPS_BREAKER`) work on a dead safety bus. The safety bus is live when the breaker is closed and the charge is above 0 (`isSafetyBusLive`).
- **UPS charge** (`upsCharge`, percent, simulated seconds, state in the tick): drains at 100% per `CstUps.NominalRuntime` (30 minutes) while the UPS breaker is closed and the Auxiliary bus is dead; recharges at one fixed rate (`CstUps.RechargeTime`, 8 hours) while the Auxiliary bus is live, breaker open or closed. No other battery model.
- **0% ends the simulation.** The tick that drains the charge to 0 with the breaker closed latches `simulationEnded`; from then on `PowerPlantTick` returns the state unchanged and a batch stops. This is the first game-over state in the code; what the app shows for it is #144.
- **What a dead bus does** is decided in ADR 0053 and the #174 research: with the safety bus dead, breaker open and close (generator and grid supply) do nothing, no refusal message, and the trip reset does nothing; with the vital bus dead the load setpoint, speed mode and run-up point ignore commands. Pump and valve knobs need no control power (the pumps run on the Auxiliary bus). The ±2 rpm auto-open needs no bus.
- **Default state.** The UPS breaker is closed in `makeInitialState` (every scenario and, until #144 adds the board switch, the app) and the charge is 100%. With the Auxiliary bus live the charge stays at 100%, so no golden or edge scenario changes (the snapshots only gain the three fields). The new game is meant to start with the breaker open once the board has the switch. The `dark-start` scenario starts it open and closes it at 50 s, before the grid supply breaker at 60 s.
- **The emergency oil pump (#159) stays independent** of the UPS here.

## Considered options

- **Automatic UPS transfer:** rejected. The operator's action is the point; a dead board with a manual breaker is the gameplay.
- **A battery model with a load-dependent runtime:** rejected. No lighting or other UPS load exists to draw on it; one constant rate is enough.
- **A real-time runtime (8 to 10 hours):** rejected for playability; 30 minutes is a recorded reduction in [design-basis.md](../plant/design-basis.md).

## Consequences

- `PowerPlantState` gains `upsBreaker`, `upsCharge` and `simulationEnded`; the CSV and the HTML report show the UPS charge.
- Closing a breaker on a plant with the UPS breaker open does nothing: scenarios and the app start with it closed.
