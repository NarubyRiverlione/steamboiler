# The condenser is a limited exchanger, and every stream enters at its real enthalpy

The cooling water no longer leaves at the saturation temperature. The condenser becomes a heat exchanger with a sized surface, and each stream arrives with its real enthalpy. A perfect exchanger needed only 3600 L/s, at a rise of about 17 K, above the sourced band of 5.6 to 13.9 K ([research](../research/2026-11-condenser-heat-transfer.md)). Decided in #82.

## The model

- **Exchanger:** Q = ε·ṁ·cp·(Tsat − Tin), with ε = 1 − exp(−UA / (ṁ·cp)). The shell side is isothermal, so ε has one capacity rate.
- **Sizing:** single pass, at the rated load after [ADR 0030](0030-return-pays-real-enthalpy.md), about 262 MW (hand figure; `turbine-load` at 125 MW measures 242 MW and a 7.8 K rise), with 10 °C water: about 7400 L/s, rise 8.5 K, terminal temperature difference 6.0 K, UA about 27 MW/K, about 31 mbar. Shaped on a measured 200 MW unit; its terminal temperature difference sits slightly above the sourced band of 2.8 to 5.6 K.
- **Surface:** UA scales with cooling water flow to the power 0.5 (HEI), with no load term. Below about 46% of design flow this is an extrapolation. The cleanliness factor is folded into the fixed value.
- **Stream rule:** every stream enters at its real enthalpy. Below saturated vapour it splits into moisture and vapour ([ADR 0028](0028-exhaust-splits-by-quality-at-condenser-intake.md)). Above it, the extra heat loads the cooling water in that tick, on top of condensing the vapour. The shell holds no steam pool (#91): the extra heat is part of the demand the vapour pressure is solved for.
- **Exhaust enthalpy:** the inlet enthalpy minus the work the shaft actually took per kg, so the exhaust is drier during run-up.
- **Rated output:** `RatedEnthalpyDrop` moves from 100 mbar to the design vacuum of about 31 mbar (1016 kJ/kg). The hand estimate was about 139 MWe at 164 kg/s; measured in `max-output`, full gas makes 158 kg/s (the Return comes back colder), so `RatedSteamFlow` is 158 and rated output about 134 MWe. The shaft inertia, no-load loss and load rate follow it. The rated output cannot be held: the no-load steam comes off the full-gas flow, so the plant carries about 130 MW and `turbine-load` aims at 125 MW.
- **Exhaust work:** the shaft takes x(2 − x) of the full work at speed ratio x (the steam torque of ADR 0021 times the speed): 0 at standstill, 1 at sync speed.

## Considered options

- **Keep 3600 L/s with a limited exchanger:** rejected. It works, at about 45 to 55 mbar, but the rise stays above the sourced band.
- **Two-pass, about 5650 L/s:** rejected. Rise 11.1 K and terminal temperature difference 3.9 K fit the typical range, but those figures sit with the rows that look assumed, and single pass is the natural form for once-through cooling.
- **9000 to 12 000 L/s:** rejected. It was an unsourced figure and gives a rise of only about 5 to 7 K.
- **Tracked pool energy:** rejected. It is a second state beside the mass, and the stream rule makes the bypass exact without it.

## Consequences

- Vacuum, hotwell temperature and output move in every scenario.
- #88 lowers the load: measured at 125 MW with the extraction heater, about 207 MW of heat goes to the cooling water, a rise of 6.7 K, and the condenser keeps spare capacity.
- With every stream on real enthalpy, a whole-plant energy balance can close: fuel heat = stack + electric output + cooling water + heat loss.
- Condenser pressure is shell vapour pressure plus air pressure, replacing the steam-mass term ([ADR 0035](0035-condenser-pressure-is-vapour-plus-air.md), built in #91).
- Left out on purpose: subcooling, bypass spray (it only recirculates water, so the heat load is the same), fouling and air blanketing. The 200 kg/s bypass capacity stays.
