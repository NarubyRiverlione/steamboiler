# The turbine runs up on steam power, at a rate set by hold mode

**Status: accepted; the speed model is implemented (#69), the run-up rate is not yet (#70).** Split from #66.

The turbine's speed follows from the **shaft power** the steam delivers (flow × enthalpy drop × efficiency), minus losses that rise steeply with speed, on a shaft line with a real inertia. The run-up to sync speed is paced by **hold mode**: its speed setpoint moves toward the operator's setpoint at a fixed run-up rate. The fixed turbine valve opening that has to land on an asymptote is no longer used.

## Why

In the `turbine-runup` run of 2026-11-03 (`sim/reports/turbine-runup-2026-11-03_201456.csv`, not committed), the pressure hold starts at t ≈ 2200 s with 18.2 kg/s at 165 bar. The speed then climbs as a first-order lag: 757 rpm at 2500 s, 2139 at 5000 s, 2875 at 10000 s, and 2975 when the run ends at 13990 s.

That follows from `calculateRPM`:

- torque = `TorqueFactor` × flow × boiler pressure, the same at every speed, in units of kg/s × bar;
- friction = `FrictionFactor` × rpm, linear in speed, and at steady state it uses up all of the steam torque;
- equilibrium speed = flow × pressure = 3003 rpm (which is why the load opening is 9.1%);
- time constant τ = I·2π / (60·`FrictionFactor`) ≈ 2620 s, **set only by inertia and friction**. More steam raises the speed the rotor settles at but does not get it there sooner. Reaching 3000 rpm takes about 7τ, around 5 h.

Rough estimates for a shaft line of this class (~130 MWe, see #14) say otherwise. These are **estimates, not sourced figures**; sourcing them is #68:

- inertia constant H ≈ 3–4 s, so about 0.4–0.5 GJ stored at 3000 rpm (J of the order of 10⁴ kg·m², the same order as today's 5000);
- 18 kg/s across a few hundred kJ/kg gives roughly 10–20 MW at the shaft, so free acceleration to sync speed takes about a minute;
- windage and bearing losses rise with roughly ω³ in power. A no-load flow of 5–10% of rated flow is typical, and 18 kg/s against ~171 kg/s at full gas fits that;
- real run-up time is set by the operator or governor (run-up rates of the order of 100–300 rpm/min, with soak holds), giving minutes on a hot start and tens of minutes on a cold start.

[#68](../research/2026-11-turbine-runup-figures.md) sourced these: H of 4 s is inside the sourced 2.5–6 s range; the loss exponent of 3 holds for windage; the **cold run-up rate is 25–50 rpm/min** (so the sim uses 50, not 100–300; the hot-start range stays an estimate); and **no source supports a 5–10% no-load flow**, only 1.5–3%. The loss calibration was decided in #69: **3% of rated flow** (the sourced roll-up flow, top of the sourced 1.5–3%), not the 5–10% estimate. The values are in `design-basis.md`.

So the steam flow is about right, but the model turns it into speed far too slowly and can never quite reach its target. The constants have no physical units, so they can't be checked against plant data, and `docs/plant/turbine.md` lists values (25000 / 0.02 / 0.05) that no longer match `const.ts` (5000 / 0.2 / 0.2).

## Decision

- **Drive torque:** shaft power P = ṁ · Δh · η, using the enthalpy drop of #14 (one implementation, shared with the electric output). Torque follows a linear torque–speed characteristic, T = (P / ω_s) · (2 − ω / ω_s): twice the sync-speed torque at standstill, so there is no division by zero at 0 rpm.
- **Losses:** loss power ∝ ω³ (torque ∝ ω²), calibrated so that the sourced no-load steam flow holds the turbine at sync speed with hold mode off.
- **Inertia:** J = 2·H·S / ω_s², from a sourced inertia constant H and the unit rating.
- **Run-up rate:** in hold mode the PID follows a speed setpoint that moves toward the operator's setpoint at a fixed rate in rpm/min. This is the speed reference ramp of a real turbine governor.

### Realism rule

This makes the run-up faster, so it has to clear the rule against magic numbers that speed up a process. It does:

- the speed-up comes from **correcting the physics**: physical units, a sourced inertia and sourced losses. No factor is added for playability;
- the run-up rate is a **real control feature**, and its value comes from a source, not from what feels playable;
- every value is recorded in `design-basis.md` with its source.

## Considered options

- **Keep the model and tune the constants** (e.g. raise `FrictionFactor` to cut τ): rejected. τ would still be independent of steam flow, the units would stay meaningless, and choosing a constant to make it faster is exactly the magic number the realism rule forbids.
- **Physical torque, free acceleration only (no run-up rate):** physically right, but the turbine would reach sync speed in about a minute and overshoot unless the operator throttles by hand. A real plant limits the acceleration to protect the rotor from thermal stress.
- **Physical torque with a governor run-up rate (chosen).**
- **Torque = P / max(ω, ω_min):** simpler, but the torque at standstill depends on an arbitrary ω_min. The linear characteristic is the usual textbook approximation.

## Consequences

- **Supersedes part of [ADR 0008](0008-pressure-hold-with-gas.md):** its consequence that the turbine speed has a time constant of about 2600 s, and the turbine valve's fixed load opening (9.1%, "steam × pressure = 3003 rpm"). The gas pressure hold itself stays.
- `turbine-runup` uses hold mode for the run-up instead of keeping it off. `StartupSettings.TurbineLoadOpening` is re-derived or goes, and the scenario gets much shorter.
- `turbine-sync` starts from the `turbine-runup` snapshot, so it changes too. `sim/snapshots/` has to be regenerated.
- The PID gains (`PID_Kp`, `PID_Ki`, `PID_Kd`) were tuned against the old ~2600 s lag. They are retuned against the new dynamics in #63, which #70 now blocks.
- #14 blocks #66: its enthalpy drop is the input for the drive torque. #14's scope note ("the RPM/torque model is untouched") still holds there; this ADR is the follow-up.
- `docs/plant/turbine.md` and the `const.ts` comments are brought in line with the code in the same change.
- The [ADR 0010](0010-pid-derivative-on-measurement.md) derivative-on-measurement still applies. A setpoint that ramps gives no derivative kick.
- **One run-up rate.** A real governor picks it from rotor metal temperature (hot and cold starts differ), which the sim does not model. The sim always starts the turbine from the cold state, so it uses the cold-start value; the hot-start rate is recorded in `design-basis.md` as a deliberate simplification.
- **The ramp starts at the current speed** when hold mode is switched on, runs at the same rate up and down, and resets to the current speed when hold mode is switched off or the turbine trips, as the PID memory does. The operator's setpoint stays the target; the ramped value is internal state.
- **S in J = 2·H·S/ω_s²** is the rated electric output of `design-basis.md` (about 131 MWe at the rated 171 kg/s, from #14), not a second number. It ignores power factor (a real S is in MVA, about 15% more); that is within the uncertainty of H. `design-basis.md` says so.
- **No generator load on the shaft yet.** The no-load calibration assumes no load torque: with the breaker closed, flow above the no-load flow still accelerates the shaft and opens the breaker at +2 rpm, as today. Grid-locked speed and load torque are #71.
- **No overspeed protection yet.** The linear characteristic drops to zero torque at twice sync speed, so full flow with hold mode off settles near 6000 rpm and nothing trips it (`MaxRPM` only caps the setpoint). The trip is #72.
- Free acceleration is fast on purpose: with hold mode off, a manual full opening reaches sync speed in about a minute, and the operator is responsible for throttling.
