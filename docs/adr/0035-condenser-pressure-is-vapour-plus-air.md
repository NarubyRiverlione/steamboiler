# The condenser pressure is shell vapour pressure plus air pressure

The condenser pressure stops being a made-up number (atmospheric, minus a vacuum that builds at a fixed rate, plus `steamMass / 1000`) and becomes two physical parts, as in the `GLOSSARY.md` section Condenser vacuum: the **shell vapour pressure** and the **air pressure**. Decided in the #91 grilling; the figures are sourced in the [research note](../research/2026-11-condenser-air-system.md) (#100). The code is #91.

## The model

- **Shell vapour pressure is algebraic.** Each tick, solve for the saturation temperature at which the limited exchanger ([ADR 0032](0032-limited-condenser-and-stream-enthalpy.md), `condenserHeatCapacity`) takes the heat the intake brings. The exchanger is linear in Tsat (Q = ε · ṁ · cp · (Tsat − Tin), ε fixed by the flow), so the root is Tsat = Tin + Q ÷ (ε · ṁ · cp). The intake heat itself depends on Tsat (the latent heat, the stream split of [ADR 0028](0028-exhaust-splits-by-quality-at-condenser-intake.md)), so the solve is a short fixed point or a bisection, not a closed form. The steam-mass pool and the `steamMass / 1000` term are gone; the shell holds no vapour inventory.
- **The ceiling.** What the exchanger cannot take builds pressure along the saturation curve, up to the hood relief pressure. The vacuum limit trip (`VacuumLimit`, 327 mbar, [ADR 0003](0003-turbine-trip-on-vacuum-limit.md)) fires long before it. Total pressure is capped at the ceiling; where the steam goes above it is left to #91 (vented through the relief, so it leaves the loop like the boiler Vent, is the expected form).
- **Air is a mass inventory** in the shell (kg). In: in-leakage, a constant mass flow (a leak chokes below about half atmospheric pressure). Out: the vacuum system. Air pressure is P = m · R · T ÷ V with V the shell volume and T the shell saturation temperature. The plant starts in the Cold state with the shell full of air at 1 bar.
- **Condenser pressure** = shell vapour pressure + air pressure.
- **The vacuum system removes volume, not pressure.** Air removed per second = S · ρ_air(P_air, T). The air extraction pump and the SJAE each have a volumetric capacity S. Operator controls are unchanged (pump toggle, SJAE toggle and valve). SJAE capacity scales linearly with the valve position. The SJAE keeps its two conditions: boiler pressure above `MainSteamValveMinimumPressure`, and the shell pressure below the ejector limit (the "break", below). The pump hogs; the SJAE holds.
- **No vacuum decay constant.** With the vacuum system stopped, the vacuum is lost by air in-leakage only.
- **Pumps remove air only, not vapour.** A real pump carries the vapour with the air. Air blanketing of the exchanger (UA) is not modelled.

## Sized values

| Constant (new) | Value | Source |
|---|---|---|
| Shell steam-space volume `ShellVolume` | 450 m³ | **UNVERIFIED.** Derived from a 30 minute hogging time to 10 inHgA with a 200 SCFM hogger (Maarky table pair 10/200) and the ideal gas law; good to a factor 2. Includes the exhaust neck and turbine casing. Research (b) |
| Air in-leakage `AirLeakRate` (replaces `LeakingRate` 0.01) | 0.0022 kg/s (3.75 SCFM) | ASME PTC 12.2 Table 10-1, one shell, 1 to 2 million lb/h of exhaust (158 kg/s is 1.25 million), via EPRI TR-112819 §10.1. The sourced range is 0.0007 (Westinghouse, 1 SCFM per 100 MW) to 0.0087 (HEI-class design, 15 SCFM). Research (a) |
| SJAE capacity `SJAE_Capacity` | 0.96 m³/s at the full valve | 57.5 m³/min of air and vapour for an HEI holding requirement of 15 SCFM at 1 inHgA (POWER, HEI Table 9 worked example). The air-only convention makes the true load smaller, so this holds the air at about 2 mbar. The unit size of the example is not stated. Research (c) |
| SJAE suction limit `SJAE_SuctionLimit` (replaces `SJAE_MaxPressureDifference`) | 170 mbar (5 inHgA) | an ejector designed for 1 inHgA "breaks" to 4 to 5 inHgA (EPRI §8.3.8); 135 mbar at the lower end. Above the limit it removes nothing. Research (c) |
| Air pump capacity `CAR_Capacity` (replaces `CAR_MaxVacuum`, `CAR_TimeNeeded`) | about 26 m³/s | **Over-dimensioned utility, not a real size**: the volume that pulls 1013 mbar down to 31 mbar in one minute for 450 m³ (V · ln(1013 ÷ 31) ÷ 60). A real hogger takes 30 minutes (HEI Table 8) and is about 0.3 m³/s. A pull-down of "about a minute" is a playability choice recorded in `design-basis.md`; there is no speed-up constant. Research (c) |
| Hood relief pressure `HoodReliefPressure` | 1353 mbar abs (0.34 barg) | atmospheric relief diaphragm bursts at 0.34 barg (a plant blog; a patent says 5 psi, the same). A failure analysis says 0.7 barg (snippet only, UNVERIFIED). Research (d) |

`ShellVolume` and the capacities are tuned together with the headless runner in #91 (CAR pull-down about one minute; SJAE holds the air at a few mbar).

## Constants replaced

`CAR_MaxVacuum`, `CAR_TimeNeeded`, `SJAE_VacuumIncreaseRate`, `SJAE_MaxPressureDifference`, `VacuumDecayRate`, `MaxVacuum`, `PressureMultiplier`, `SteamVolumeBaseLine` are removed. `LeakingRate` (unused, unsourced 0.01) is replaced by `AirLeakRate`. `OptimalPressure` and `OptimalPressureBellWidth` stay (readout band only). `VacuumLimit` stays.

## Considered options

- **Keep the steam-mass pressure term and add air:** rejected. The term is not derived from anything, and steam mass in a vessel at 30 mbar is a few kg; the pressure is set by the condensing balance, not by the inventory.
- **Pump capacity as a pressure rate (mbar/s):** rejected. Air removed must be a mass, so that a leak, a pump and a stopped system share one balance and the vacuum loss needs no extra constant.
- **A pull-down constant to hit one minute:** rejected by the realism rule. The pump is oversized instead, and recorded.
- **Pumps carry vapour:** rejected for now. It adds a second flow through the pump, and the vapour is already condensed by the exchanger; recorded as an omission.

## Consequences

- **The vacuum is lost in hours, not minutes (flag for the owner).** The grilling assumed that with the vacuum system stopped the vacuum would go in minutes. With sourced in-leakage and a 450 m³ shell it does not: 31 to 62 mbar takes about 2 hours at 0.0022 kg/s (about 30 minutes at the HEI-class 0.0087), and reaching the 327 mbar trip takes 5 to 60 hours across the sourced range. Real-plant "20 to 25 minutes" needs about 0.13 kg/s, 15 to 190 times a sourced figure, and comes from leakage this model leaves out (opened vacuum breaker, lost gland seal steam). Following the realism rule, the sourced value is used and no leak is inflated. If the owner wants it quicker, the honest levers are a smaller shell volume or a modelled gland seal steam loss, each its own decision. See research (e).
- A vacuum that holds for hours makes a cold stop and restart cheap to the operator; the playable consequence of the loss is the first pull-down, which is a minute.
- The condenser pressure now depends on the air inventory in every scenario: golden snapshots, the vacuum readout and the turbine back-pressure move. #91 owns the code, tests and snapshots.
- The hood relief ceiling means a lost circulating water flow gives a hard cap on pressure; the turbine has already tripped on the vacuum limit.

## Deliberate reductions for `design-basis.md` (the file changes in #91)

| Item | Our value | Real plant | Why |
|---|---|---|---|
| Air extraction pump over-dimensioned (utility) | about 26 m³/s, a pull-down from 1 bar to the design vacuum in about 1 minute | a 0.3 m³/s hogger takes 30 minutes (HEI Table 8), then it is shut and the holding unit runs | playability by sizing the utility, no speed-up constant; the pump may stay on at no cost |
| Pumps remove air only | the pump and SJAE move air only | they carry the water vapour with the air; capacities are quoted for the mixture | simplified; the SJAE capacity is taken for the mixture so the air-only error is on the safe side |
| Air blanketing not modelled | UA is independent of the air pressure | air blankets the tubes and raises the pressure above the two-term sum | out of scope; [ADR 0032](0032-limited-condenser-and-stream-enthalpy.md) already leaves it out |
| Shell volume UNVERIFIED | 450 m³ | unit specific | derived, see sized values |
| Leak constant, and no gland seal or vacuum breaker leak | 0.0022 kg/s at all times | rises on a trip (vacuum breaker, lost gland seal steam) | simplified; this makes the vacuum last hours |
| SJAE hard break | no capacity above 170 mbar | capacity falls steeply near the break | simplified |
| SJAE and the pump hold at any air pressure | air only, no pump ultimate pressure | a liquid ring pump stops at the seal water vapour pressure (EPRI §2.2.1) | the vapour term is the floor |
| Hood relief | pressure capped at 1353 mbar | one of several rupture devices, 0.34 to 0.7 barg | weak sources; the vacuum limit trips first |
