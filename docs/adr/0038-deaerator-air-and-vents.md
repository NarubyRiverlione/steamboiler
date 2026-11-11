# The deaerator holds one amount of air and has two vents; mistakes cost steam, never damage

Decided in #40 (start-up discussion, 2026-11-09); built in #120 (the numbers and rules below are in [deaerator.md](../plant/deaerator.md)).

- **Cold start is vented:** the vessel starts full of air at atmospheric pressure. The operator heats it with the start-up vent open and closes it once the air is out.
- **One tracked amount of non-condensable air.** Total pressure is air pressure plus the saturation pressure of the water temperature (as [ADR 0035](0035-condenser-pressure-is-vapour-plus-air.md) does for the condenser). The same amount drives the safe-to-close lamp, the vent consequences and, later, the O₂ reading (#114).
- **Two vents:** a manual **start-up vent** (open/close, operator control) and an automatic **operating vent** (a small fixed orifice, always open, no control, not drawn). The operating vent's steam loss is part of the water and energy balance and is recorded in `design-basis.md`.
- **Vent open with air present** removes the air. **Vent open with no air left** passes steam only; that mass leaves the water balance and returns as makeup demand ([ADR 0002](0002-makeup-into-hotwell.md)), and pressure cannot build, so the temperature stalls near 100 °C.
- **Vent closed with air present:** steam cannot push the air out, pressure climbs while the temperature lags saturation, heating is slow, and above the relief pressure the relief valve lifts and loses steam.
- **No damage and no O₂ penalties.** Those are the P4 ticket #114.
- **Safe-to-close lamp** comes from the air amount (air partial pressure below a small threshold), not from a separate rule.
- **Warnings, not trips:** the sim exposes two flags (closed with air present; open with no air left). The yellow annunciator tile belongs to #116; it declares `severity: "warning"` in `alarms.ts` (the severity colours are built, #115).
- **Panel:** own page with temperature, pressure, saturation pressure (the gap to pressure is the air), level %, lamp, vent control and warning text. The overview shows temperature, level % and the lamp while the start-up vent is open.

## Answered (owner, 2026-11-10)

- **Relief valve:** yes, a simple relief at **4 bar** (the 3 bar setpoint plus about 33%). It vents steam to the atmosphere and does no damage, like [ADR 0005](0005-relief-valve-vents-to-atmosphere.md). It is built with the vents, not with the vessel.
- **Vent loss:** not shown. The steam lost through the vents and the relief is felt only as makeup demand ([ADR 0002](0002-makeup-into-hotwell.md)); there is no flow readout.
- **Slicing:** two implementation tickets. A builds the vessel ([ADR 0036](0036-deaerator-is-a-steam-heated-tank.md), [ADR 0037](0037-deaerator-cold-fill-at-38-percent.md)); B builds the air, vents, relief and panel of this ADR and is blocked by A. #40 closes as the decision ticket.
- **Numbers to set in the headless runner while building B:** starting air amount, lamp threshold, operating vent size. They are tuning values, not decisions.

## Built in #120

- **The steam control stays on the heat, not on the total pressure.** The pressure loop of [ADR 0036](0036-deaerator-is-a-steam-heated-tank.md) asks for the heat that brings the water to the saturation temperature of 3 bar. Air therefore shows as a higher total pressure and the relief valve lifts, as this ADR says; only where the source pressure is low (cold start) does the air slow the steam, since the let-down valve and the tap's non-return valve work on the actual vessel pressure. A controller that held 3 bar of total pressure would throttle the steam and never reach the relief valve.
- **Relief valve:** lift at 4 bar, seat at 3.6 bar (10% blowdown, own estimate), 120 kg/s of mixture, decided on the pressure at the start of the tick.
- **Lamp** lights below 0.05 bar of air and holds until 0.075 bar; the air pressure of a closed vessel rises with its temperature, and a lamp without the hold would flicker right after the operator closes the vent. The flags follow the lamp: closed with the lamp out, open with the lamp lit.
- **Tuning values set in the headless runner:** the cold vessel holds 109 kg of air (0.99 bar over the 0.023 bar of vapour at 20 °C, 93 m³ of gas space, not a free number); lamp threshold 0.05 bar; operating vent 0.0001 m² (0.08 kg/s of steam at 3 bar); the start-up vent 0.06 m². Recorded in `design-basis.md`.
- **A settled plant needs steady makeup (owner, 2026-11-11, seen after #112).** The operating vent loses about 0.08 kg/s whether or not air is left, since the sim has no air ingress and the orifice is fixed; makeup replaces it, so `makeupTotal` rises in the golden scenarios (from #120, not #112). Accepted as realistic: real deaerators vent continuously and the plant makes it up. A vent that throttles with the air left, or a vent condenser returning the steam, were considered and not built.
- **Left open** the loop stalls the vessel at 100 °C only after the steam supply ends: the vent passes up to about 20 kg/s while steam is admitted, which costs the boiler its water (`deaerator-vent-open`).

## Consequences

- `deaerator.md`, `ui-board.md` and `design-basis.md` (operating-vent loss, start state) are updated with the build.
- The headless runner needs three cold-start runs: vent opened and closed on time, never opened, left open. The loop invariants hold in all three.
