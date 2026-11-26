# The vital bus and the safety bus

**Status: accepted.** Decided in #143, M2 of [ADR 0046](0046-from-island-to-town-grid-in-milestones.md). Builds on [ADR 0053](0053-the-auxiliary-bus-is-fed-by-the-grid-or-the-generator.md) (the Auxiliary bus, breaker control power and the controller controls) and the research of #174. Figures: [research note](../research/2026-11-ups-runtime.md).

Two buses sit next to the **Auxiliary bus**:

| Bus | Fed by | Carries | Dead when |
|---|---|---|---|
| **Vital bus** | the Auxiliary bus | the controller controls (load setpoint, speed mode, run-up point); the board's LCD readouts and the annunciator (#144) | the Auxiliary bus is dead |
| **Safety bus** | the **Auxiliary bus** (the UPS rectifier and the DC charger hang on it) and the **battery** (UPS), through the **battery breaker** (`upsBreaker`) | breaker control power, the trip reset; the emergency light (#144), the emergency oil pump (#159) | the Auxiliary bus is dead **and** (the battery breaker is open or the **UPS charge** is 0%) |
| none | | the analog gauges (mechanical) | never |

## Decisions

- **The vital bus has no battery.** It is derived each tick (`isVitalBusLive`, `SafetyBus.ts`), never stored, and equals the Auxiliary bus. A dead Auxiliary bus kills it.
- **The safety bus is fed from the Auxiliary bus; the battery takes over on its loss, on the operator's action.** A live Auxiliary bus makes the safety bus live whatever the breaker and the charge (#190; in a real plant the rectifier and the charger sit on the station AC supply). The battery breaker (`upsBreaker`, the UPS breaker of the code and the actions `CLOSE_UPS_BREAKER`, `OPEN_UPS_BREAKER`) only matters on a dead Auxiliary bus: it is manual, never closes by itself and needs no power. On a dead Auxiliary bus the safety bus is live when the breaker is closed and the charge is above 0 (`isSafetyBusLive`).
- **UPS charge** (`upsCharge`, percent, simulated seconds, state in the tick): drains at 100% per `CstUps.NominalRuntime` (30 minutes) while the battery breaker is closed and the Auxiliary bus is dead; recharges at one fixed rate (`CstUps.RechargeTime`, 8 hours) while the Auxiliary bus is live, breaker open or closed. No other battery model.
- **0% ends the simulation.** The tick that drains the charge to 0 with the breaker closed latches `simulationEnded`; from then on `PowerPlantTick` returns the state unchanged and a batch stops. This is the first game-over state in the code; the app shows it as the ended board state: a frozen dark board with an end plate and the Presets button (#144, [ui-board.md](../dev/ui-board.md#board-states)).
- **What a dead bus does** is decided in ADR 0053 and the #174 research: with the safety bus dead, breaker open and close (generator and grid supply) do nothing, no refusal message, and the trip reset does nothing; with the vital bus dead the load setpoint, speed mode and run-up point ignore commands. Pump and valve knobs need no control power (the pumps run on the Auxiliary bus). The ±2 rpm auto-open needs no bus.
- **The board has four board states** (#144), chosen from the plant state alone: **ended** (`simulationEnded`: the board frozen dark with an end plate and the new game button), **normal** (vital bus live), **emergency** (vital bus dead, safety bus live: a red lens, every page reachable, analog gauges and lamps only, no LCD readouts except the clock, no annunciator, the UPS group on every page) and **dark** (both dead: only the battery breaker, the clock and the time controls). The lamps are on the safety bus. The annunciator is on the vital bus: it raises nothing while the bus is dead and, at power-up, shows every condition active at that moment as a new tile.
- **Default state.** The UPS breaker is closed in `makeInitialState` (every scenario; the app starts with it open from #142, which adds the board switch, via `makeUiStartState`) and the charge is 100%. With the Auxiliary bus live the charge stays at 100%, so no golden or edge scenario changes (the snapshots only gain the three fields). The new game starts with the breaker open (#142). The `dark-start` scenario starts it open and closes it at 50 s, before the grid supply breaker at 60 s: on a dead bus the battery is the only control power.
- **The emergency oil pump (#159) stays independent** of the UPS here.

## Considered options

- **Automatic battery transfer:** rejected. What stays rejected is closing the battery breaker by itself on a blackout: the operator's action is the point, and a dead board with a manual breaker is the gameplay. The AC feed from a live Auxiliary bus is not a transfer.
- **A battery model with a load-dependent runtime:** rejected. No lighting or other UPS load exists to draw on it; one constant rate is enough.
- **A real-time runtime (8 to 10 hours):** rejected for playability; 30 minutes is a recorded reduction in [design-basis.md](../plant/design-basis.md).

## Consequences

- `PowerPlantState` gains `upsBreaker`, `upsCharge` and `simulationEnded`; the CSV and the HTML report show the UPS charge.
- Closing a breaker on a dead Auxiliary bus with the battery breaker open does nothing; the app starts with the breaker open (Default state), which no longer blocks a plant with a live Auxiliary bus (#190). With the safety bus fed from the Auxiliary bus, a dead safety bus implies every source breaker is open, so the local mechanical trips of ADR 0053 have no case left; their fate is a separate ticket.
