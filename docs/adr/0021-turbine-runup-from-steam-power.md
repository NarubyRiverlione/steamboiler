# The turbine runs up on steam power, in Ramp up mode between fixed run-up points

**Status: accepted; implemented: the speed model (#69), the speed modes and the run-up rate (#70).** Split from #66.

The turbine's speed follows from the **shaft power** the steam delivers (flow × enthalpy drop × efficiency), minus losses that rise steeply with speed, on a shaft line with a real inertia. The turbine has three **speed modes**: Free (the operator moves the valve), Ramp up (the PID takes the turbine to a fixed run-up point at the run-up rate) and Hold (the PID keeps it there). Every start is meant to go through Ramp up. The fixed turbine valve opening that has to land on an asymptote is no longer used.

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
- **Losses:** loss power ∝ ω³ (torque ∝ ω²), calibrated so that the sourced no-load steam flow holds the turbine at sync speed in Free.
- **Inertia:** J = 2·H·S / ω_s², from a sourced inertia constant H and the unit rating.
- **Run-up rate:** in Ramp up the PID follows a speed reference that moves toward the selected run-up point at a fixed rate in rpm/min. This is the speed reference ramp of a real turbine governor.

### Speed modes

| Mode | Valve moved by | PID target | Can be engaged |
|---|---|---|---|
| **Free** | the operator | none | always |
| **Ramp up** | the PID | the speed reference, moving up at the run-up rate | main steam valve open and the selected point above the current speed |
| **Hold** | the PID | the selected run-up point, no ramp | within ±5 rpm of the selected point |

- **Run-up points:** the operator picks 500, 1500, 2500 or 3000 rpm. There is no free setpoint, so a setpoint step can never reach Hold.
- **Arrival:** when the speed reference reaches the selected point and the speed is within ±5 rpm of it, Ramp up engages Hold at that point. The turbine stays there until the operator picks a higher point, which starts Ramp up again, or switches to Free.
- **Hold stays on** if the speed leaves the ±5 rpm window: pulling it back is the PID's job. Switching to Free is always allowed.
- **Up only:** there is no ramp down. To slow down, the operator switches to Free and closes the valve.
- **No minimum time at a point:** the sim has no rotor temperature for a soak to act on, so a forced wait would only be a timer.
- **Hold is the mode that carries load:** when electrical load is added to the shaft as a resisting torque (#71), the speed sags and the Hold PID opens the valve, so more load takes more steam.

### Realism rule

This makes the run-up faster, so it has to clear the rule against magic numbers that speed up a process. It does:

- the speed-up comes from **correcting the physics**: physical units, a sourced inertia and sourced losses. No factor is added for playability;
- the run-up rate is a **real control feature**, and its value comes from a source, not from what feels playable;
- every value is recorded in `design-basis.md` with its source.

## Considered options

- **Keep the model and tune the constants** (e.g. raise `FrictionFactor` to cut τ): rejected. τ would still be independent of steam flow, the units would stay meaningless, and choosing a constant to make it faster is exactly the magic number the realism rule forbids.
- **Physical torque, free acceleration only (no run-up rate):** physically right, but the turbine would reach sync speed in about a minute and overshoot unless the operator throttles by hand. A real plant limits the acceleration to protect the rotor from thermal stress.
- **Physical torque with a governor run-up rate (chosen).**
- **Run up inside hold mode, with a free setpoint:** the earlier form of this decision. One mode would both change the speed and keep it, so it conflicted with the rule that hold mode only holds (#56), and any setpoint step would reach the PID unramped. Rejected for separate Ramp up and Hold modes.
- **Hold engage window of ±50 rpm (#56):** rejected by the owner for ±5 rpm. Hold is meant to engage at the target, and Ramp up arrives well inside ±5. By hand it is tight: one 1% valve click moves the speed about 5 rpm/s near sync, so Free to Hold will be rare.
- **Ramp up and down at the same rate:** not needed with fixed points, since the operator slows the turbine in Free.
- **Torque = P / max(ω, ω_min):** simpler, but the torque at standstill depends on an arbitrary ω_min. The linear characteristic is the usual textbook approximation.

## Consequences

- **Supersedes part of [ADR 0008](0008-pressure-hold-with-gas.md):** its consequence that the turbine speed has a time constant of about 2600 s, and the turbine valve's fixed load opening (9.1%, "steam × pressure = 3003 rpm"). The gas pressure hold itself stays.
- `turbine-runup` uses Ramp up through the four run-up points and ends in Hold at 3000 rpm, instead of a fixed valve opening. `StartupSettings.TurbineLoadOpening` goes, and the scenario gets much shorter. It can no longer build pressure by cracking the turbine valve to 5%: at working pressure that passes 10 kg/s against about 4.3 kg/s of no-load flow and spins the rotor past `MaxRPM` before any ramp starts. It builds pressure on the bypass instead, so the turbine-runup parts of [ADR 0008](0008-pressure-hold-with-gas.md) and [ADR 0018](0018-cold-fill-at-35-percent.md) are updated in #70.
- `turbine-sync` starts from the `turbine-runup` snapshot, so it changes too. `sim/snapshots/` has to be regenerated.
- The PID gains (`PID_Kp`, `PID_Ki`, `PID_Kd`) were tuned against the old ~2600 s lag. A rough model of the new dynamics (not the simulator) tracked the ramp within 0.4 rpm with these gains. The headless runner (#70) confirms it: in `turbine-runup` the speed stays within 0.4 rpm of the reference all the way up, Hold engages at 500, 1500 and 2500 rpm as soon as the reference arrives, and at 3000 rpm at ~5010 s (60 min of Ramp up from ~1410 s; #79 moved the boiler level hold to working pressure, #80 made the flow follow pressure), so #70 did not need a retune. #63 checked the engage once Hold only engaged near its target and found nothing left to retune: with the ±5 rpm window the valve no longer slams and the breaker no longer chatters. The gains under generator load are still open (#71).
- #14 blocks #66: its enthalpy drop is the input for the drive torque. #14's scope note ("the RPM/torque model is untouched") still holds there; this ADR is the follow-up.
- `docs/plant/turbine.md` and the `const.ts` comments are brought in line with the code in the same change.
- The [ADR 0010](0010-pid-derivative-on-measurement.md) derivative-on-measurement still applies. A setpoint that ramps gives no derivative kick.
- **One run-up rate.** A real governor picks it from rotor metal temperature (hot and cold starts differ), which the sim does not model. The sim always starts the turbine from the cold state, so it uses the cold-start value; the hot-start rate is recorded in `design-basis.md` as a deliberate simplification.
- **The run-up points are the owner's choice, not sourced.** The research only has example hold speeds. They are recorded in `design-basis.md` with the ±5 rpm window, which is an estimate.
- **The ramp starts at the current speed** when Ramp up is engaged, and the reference follows the current speed whenever the PID is inactive (Free, or main steam valve closed), as the PID memory resets. A turbine trip returns to Free. The selected point stays the target; the speed reference is internal state.
- **S in J = 2·H·S/ω_s²** is the rated electric output of `design-basis.md` (about 131 MWe at the rated 171 kg/s, from #14), not a second number. It ignores power factor (a real S is in MVA, about 15% more); that is within the uncertainty of H. `design-basis.md` says so.
- **No generator load on the shaft yet.** The no-load calibration assumes no load torque: with the breaker closed, flow above the no-load flow still accelerates the shaft and opens the breaker at +2 rpm, as today. Load torque is #71. It must not pin the shaft speed to the grid: Hold would then see no speed error and never open the valve.
- **No overspeed protection yet.** The linear characteristic drops to zero torque at twice sync speed, so full flow in Free settles near 6000 rpm and nothing trips it (`MaxRPM` is only a figure). The trip is #72.
- Free acceleration is fast on purpose: Free does not forbid a manual start, but a manual full opening reaches sync speed in about a minute, and the operator is responsible for throttling.
