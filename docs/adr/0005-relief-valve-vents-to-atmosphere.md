# The relief valve vents to the atmosphere and is sized at 110% of full-gas steam with no Return

The boiler has one automatic relief valve on the drum. It opens fully at 178 bar and closes at 171 bar (7 bar blowdown), decides on the pressure at the start of each tick, and vents to the atmosphere. Its capacity is 110% of the steam the worst case makes at 178 bar, derived from the constants (about 457 kg/s). The worst case is full gas with no Return: the Return costs heat ([ADR 0030](0030-return-pays-real-enthalpy.md), #74), so stopping it frees the most heat for steaming, and the economizer then recovers nothing ([ADR 0029](0029-boiler-efficiency-from-flue-gas-heat-balance.md)). The valve still beats whatever the burner can make, with a Return or without. It runs first in the tick, upstream of the main steam valve. Decided in #9.

## Considered options

- **Clamp pressure or temperature in code:** simple, but it hides the energy the burner keeps adding and violates the realism rule (ADR 0001: playability never alters the physics).
- **Vent into the condenser:** keeps the water in the loop, but a real drum relief valve blows to the atmosphere, and dumping up to 500 kg/s into a condenser sized for the turbine would break vacuum.
- **Modulating valve:** holds pressure smoothly, but a drum relief valve is a full-lift valve; the lift-and-reseat cycle is what the operator should see.
- **Full-lift valve to the atmosphere at 178/171 bar, 110% capacity (chosen):** 178 bar leaves 2 bar below the 180 bar design pressure for one tick's rise; 110% of the worst-case steam means the valve always wins against the burner while water remains.

## Consequences

- Pressure and temperature caps are the same thing (pressure follows saturation), so there is no separate temperature clamp.
- Vented steam leaves the loop: a fourth boundary flow, counted in `ventedTotal` (as announced in ADR 0002).
- The valve cannot help once the boiler runs dry: the last litres jump to the critical point. Burner protection on low level is #33.
- The operator cannot open, close or test the valve; the UI shows its state and the vented mass, and the sim report marks each lift.
