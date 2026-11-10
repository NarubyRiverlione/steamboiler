# The deaerator holds one amount of air and has two vents; mistakes cost steam, never damage

Decided in #40 (start-up discussion, 2026-11-09); built in #120.

- **Cold start is vented:** the vessel starts full of air at atmospheric pressure. The operator heats it with the start-up vent open and closes it once the air is out.
- **One tracked amount of non-condensable air.** Total pressure is air pressure plus the saturation pressure of the water temperature (as [ADR 0035](0035-condenser-pressure-is-vapour-plus-air.md) does for the condenser). The same amount drives the safe-to-close lamp, the vent consequences and, later, the O₂ reading (#114).
- **Two vents:** a manual **start-up vent** (open/close, operator control) and an automatic **operating vent** (a small fixed orifice, always open, no control, not drawn). The operating vent's steam loss is part of the water and energy balance and is recorded in `design-basis.md`.
- **Vent open with air present** removes the air. **Vent open with no air left** passes steam only; that mass leaves the water balance and returns as makeup demand ([ADR 0002](0002-makeup-into-hotwell.md)), and pressure cannot build, so the temperature stalls near 100 °C.
- **Vent closed with air present:** steam cannot push the air out, pressure climbs while the temperature lags saturation, heating is slow, and above the relief pressure the relief valve lifts and loses steam.
- **No damage and no O₂ penalties.** Those are the P4 ticket #114.
- **Safe-to-close lamp** comes from the air amount (air partial pressure below a small threshold), not from a separate rule.
- **Warnings, not trips:** the sim exposes two flags (closed with air present; open with no air left). The yellow annunciator tile belongs to the owner's annunciator ticket (#115, #116).
- **Panel:** own page with temperature, pressure, saturation pressure (the gap to pressure is the air), level %, lamp, vent control and warning text. The overview shows temperature, level % and the lamp while the start-up vent is open.

## Answered (owner, 2026-11-10)

- **Relief valve:** yes, a simple relief at **4 bar** (the 3 bar setpoint plus about 33%). It vents steam to the atmosphere and does no damage, like [ADR 0005](0005-relief-valve-vents-to-atmosphere.md). It is built with the vents, not with the vessel.
- **Vent loss:** not shown. The steam lost through the vents and the relief is felt only as makeup demand ([ADR 0002](0002-makeup-into-hotwell.md)); there is no flow readout.
- **Slicing:** two implementation tickets. A builds the vessel ([ADR 0036](0036-deaerator-is-a-steam-heated-tank.md), [ADR 0037](0037-deaerator-cold-fill-at-38-percent.md)); B builds the air, vents, relief and panel of this ADR and is blocked by A. #40 closes as the decision ticket.
- **Numbers to set in the headless runner while building B:** starting air amount, lamp threshold, operating vent size. They are tuning values, not decisions.

## Consequences

- `deaerator.md`, `ui-board.md` and `design-basis.md` (operating-vent loss, start state) are updated with the build.
- The headless runner needs three cold-start runs: vent opened and closed on time, never opened, left open. The loop invariants hold in all three.
