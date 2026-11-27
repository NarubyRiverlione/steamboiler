# The vital bus and the safety bus

**Status: accepted.** Decided in #143, M2 of [ADR 0046](0046-from-island-to-town-grid-in-milestones.md). Builds on [ADR 0053](0053-the-auxiliary-bus-is-fed-by-the-grid-or-the-generator.md) (the Auxiliary bus, breaker control power and the controller controls) and the research of #174. Figures: [research note](../research/2026-11-ups-runtime.md). The chain between the buses and the automatic changeover are decided in [ADR 0056](0056-emergency-power-the-vital-bus-chain-and-the-emergency-diesel.md) (#196), which edits this ADR in place.

Two buses sit below the **Auxiliary bus**, as a chain: **Grid → Aux → [Aux→Vital breaker] → Vital → [Vital→Safety breaker] → Safety ◄ UPS** (#196, ADR 0056):

| Bus | Fed by | Carries | Dead when |
|---|---|---|---|
| **Vital bus** | the Auxiliary bus, through the **Aux→Vital breaker** (`vitalFeedBreaker`); the EMY diesel comes with #198 | the controller controls (load setpoint, speed mode, run-up point); the board's LCD readouts and the annunciator (#144) | the Aux→Vital breaker is open or the Auxiliary bus is dead |
| **Safety bus** | the Vital bus, through the **Vital→Safety breaker** (`safetyFeedBreaker`), and the **battery** (UPS) while that breaker is open (the derived **battery breaker**) | breaker control power, the trip reset; the emergency light (#144), the emergency oil pump (#159) | not (Vital→Safety closed on a live Vital bus) **and** not (the battery feeding with charge above 0) |
| none | | the analog gauges (mechanical) | never |

## Decisions

- **The changeover is automatic, the hand-back manual** (#196, ADR 0056). The **Aux→Vital breaker** (stored, default closed) opens by itself on any tick where the Auxiliary bus is dead (`settleEmergencyChain`, first thing in `PowerPlantTick`); the operator closes it, only while the Auxiliary bus is live, and it needs control power; the operator may open it by hand. The **Vital→Safety breaker** (stored, default closed) opens by itself when the Vital bus is dead, and the battery takes the Safety bus in that same tick (no gap: a Vital bus that just died counts as an open breaker before the tick); the operator closes it, only while the Vital bus is live, and it **needs no control power**, so a flat battery stays recoverable.
- **The Vital bus is a real bus** (`isVitalBusLive`, `SafetyBus.ts`): live when the Aux→Vital breaker is closed and the Auxiliary bus is live. A dead Auxiliary bus kills it, and it stays dead after the Auxiliary bus returns until the operator closes the breaker.
- **The battery breaker is derived** (closed = Vital→Safety open) and has no operator control; the manual `upsBreaker` and its actions are gone. The Safety bus is live when (Vital→Safety closed and the Vital bus live) or (the battery feeding and charge above 0) (`isSafetyBusLive`).
- **UPS charge** (`upsCharge`, percent, simulated seconds, state in the tick): drains at 100% per `CstUps.NominalRuntime` (30 minutes) whenever the battery feeds, i.e. whenever Vital→Safety is open, even with the Vital bus back; recharges at one fixed rate (`CstUps.RechargeTime`, 8 hours) only while it is closed and the Vital bus is live. Forgetting the hand-back costs battery. No other battery model.
- **0% on a dead Vital bus ends the simulation.** The tick that drains the charge to 0 with the Vital bus dead latches `simulationEnded`; from then on `PowerPlantTick` returns the state unchanged and a batch stops. This is the first game-over state in the code; the app shows it as the ended board state (#144, [ui-board.md](../dev/ui-board.md#board-states)). With the Vital bus live and a flat battery nothing ends: the board is normal, the Safety bus is dead and the Vital→Safety breaker is the way out.
- **What a dead bus does** is decided in ADR 0053 and the #174 research: with the safety bus dead, breaker open and close (generator, unit aux and grid supply) do nothing, no refusal message, and the trip reset does nothing; with the vital bus dead the load setpoint, speed mode and run-up point ignore commands (also with the Auxiliary bus live, since the Aux→Vital breaker may be open). Pump and valve knobs need no control power (the pumps run on the Auxiliary bus). The ±2 rpm auto-open needs no bus.
- **The board has three board states** (#144, #196), chosen from the plant state alone: **ended** (`simulationEnded`: the board frozen dark with an end plate and the new game button), **normal** (vital bus live) and **emergency** (vital bus dead: a red lens, a full-screen multiply overlay over the whole board (#197), every page reachable, analog gauges and lamps only, no LCD readouts except the clock, no annunciator; no UPS strip, the UPS charge is on the Emergency power page). The *dark* board is gone: a dead Safety bus with a dead Vital bus is the end of the game. The lamps are on the safety bus. The annunciator is on the vital bus: it raises nothing while the bus is dead and, at power-up, shows every condition active at that moment as a new tile, among them **UPS on battery** while the battery feeds.
- **Default state.** Both breakers are closed in `makeInitialState` and `makeUiStartState` (scenarios and the app alike) and the charge is 100%. With the Auxiliary bus live the charge stays at 100%, so no golden or edge scenario changes (the snapshots only change in the field set). The `dark-start` scenario starts with both breakers open (the battery feeds from the first tick) until #199 rewrites it.
- **The emergency oil pump (#159) stays independent** of the UPS here.

## Considered options

- **Automatic battery transfer:** first rejected (a manual battery breaker, the operator's action as the gameplay), then **adopted** in #196 (ADR 0056): the point of a UPS is an uninterrupted bus, so the changeover is automatic and only the hand-back is the operator's.
- **A battery model with a load-dependent runtime:** rejected. No lighting or other UPS load exists to draw on it; one constant rate is enough.
- **A real-time runtime (8 to 10 hours):** rejected for playability; 30 minutes is a recorded reduction in [design-basis.md](../plant/design-basis.md).

## Consequences

- `PowerPlantState` gains `vitalFeedBreaker`, `safetyFeedBreaker`, `upsCharge` and `simulationEnded` (#196 replaced `upsBreaker`); the CSV and the HTML report show the UPS charge.
- With the Safety bus fed through the Vital bus, a dead Safety bus with a live Auxiliary bus is possible again (the Aux→Vital breaker open by hand and a flat battery), so the local mechanical trips of ADR 0053 (#193) and the controller controls on a dead Vital bus (#188) get a case again; both stay in triage.
