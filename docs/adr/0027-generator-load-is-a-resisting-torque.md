# The generator load is a resisting torque on a free-running shaft

**Status: accepted.** Implemented in #71.

With the breaker closed, the generator takes a **load**: a constant electric power that acts on the shaft as a resisting torque. The shaft balance becomes `J·dω/dt = drive torque − loss torque − load torque`, with `load torque = (load / GeneratorEfficiency) / ω`. The speed is **not** pinned to the grid. The **electric output is the load carried**, an independent input to the shaft, never derived from the steam flow.

## Why

Before this, the electric output came from steam flow, so the no-load flow reported 3.92 MW while all of that power went into the shaft losses, and steam above the no-load flow accelerated the shaft and opened the breaker at +2 rpm. A real unit carries the load its operator asks for and the steam follows it. A load set equal to the steam-based figure could never balance: it would take all the shaft power at any flow, and the speed would always fall.

## Decisions

- **Speed stays free (island model).** The speed sags under load, the Hold PID opens the valve, and more load takes more steam. This is how an island behaves, not a unit on a stiff grid. Recorded in [design-basis.md](../plant/design-basis.md) as a deliberate simplification.
- **Load setpoint:** an operator value in MW, default 0, limited to 0 up to `LoadSetpointLimit` (200 MW), above the rated output (123.0 MW), so the steam limits the load and not the setpoint (#84). Only settable with the breaker closed, in any speed mode; with the breaker open it is refused with a reason (`loadSetpointRefusal`, in the style of `speedModeRefusal`). Hold gets no new interlock. Free with the breaker closed is allowed: the operator follows the load by hand.
- **Load rate:** the load moves towards the setpoint at one fixed rate, `LoadRate` = 3% of rated output per minute (about 3.9 MW/min), up and down. The source is coal units, see [the research note](../research/2026-11-generator-load-rate.md).
- **Breaker:** the ±2 rpm rule stays for closing and auto-open. When the breaker opens for any reason (by hand or by the speed leaving the window) the load and the load setpoint drop to 0 on that tick; a reclose does not bring the load back without an operator action.
- **Failures need no special logic.** Steam that cannot carry the load, or a vacuum trip with load on, makes the speed fall and ends at the ±2 rpm breaker rule. There is no breaker-on-trip rule, reverse power protection or runback.
- **No overspeed protection for a lost load in Free until #72.** With Hold on, a lost load is pulled back by the PID; in Free nothing stops the speed.

## Considered options

- **Speed pinned to the grid:** rejected. With the speed fixed, the Hold PID sees no speed error and never opens the valve, so load could not call for steam. A real grid-connected unit uses droop or a load setpoint to the same end; the island model gets the same behaviour without a second controller.
- **Output derived from steam flow (as before):** rejected, see Why.
- **A load controller mode, droop, or a scripted demand profile:** out of scope.

## Consequences

- `TurbineState` gains `loadSetpoint`; `electricOutput` is the load carried, kept from tick to tick. `calculateRPM` takes the load; `calculateElectricityOutput` is gone.
- The load rate makes a 123.0 MW load take about 2000 s. The headless run (`turbine-load`) holds rated output within 0.02 rpm of sync speed with the PID gains unchanged, which needs the operator's gas ceiling raised above the 2000 L/s heat-up gas: gas ends at about 11 250 L/s, 94% of full gas, with the bypass shut (#74). The `max-output` run (#84) takes the load past rated: the gas is the limit at about 130 MW, the valve is fully open at about 142 MW and the breaker opens on the speed sag.
