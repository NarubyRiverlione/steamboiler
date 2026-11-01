# Hotwell level control: how real plants run it

Frozen research record. The loop as built is in [plant/feedwater-loop.md](../plant/feedwater-loop.md) and [plant/condenser.md](../plant/condenser.md); earlier findings are in [2026-10-feedwater-loop.md](2026-10-feedwater-loop.md).

Web research, Nov 2026, to judge the proposal of auto-REJECT at 95% and auto-MAKEUP at 10% of the 15 m3 hotwell
(operator fix, #45). "Real plant" statements are sourced. **No standard or OEM manual with hotwell setpoints could be
read**: the HEI standard is paywalled, the NRC PDFs returned 403 or were scanned images. All numbers below come from
a trade article, a training site, a forum thread and flashcards, so they are illustrations of the *pattern*, not
design values. Items not backed by a primary source are marked UNVERIFIED.

## How the control is arranged

- The hotwell is a buffer: HEI sizes it at **1 to 5 minutes of total condensate flow**, and that volume sets the
  normal condensate level. Low level is supplemented by emergency makeup of demineralised water.
  ([HEI Tech Sheet 136](https://assets.noviams.com/novi-file-uploads/hei/TDS/Condenser/Tech_Sheet_136_Condenser_Hotwells_04-09-15-3c5b34ac.pdf),
  quoted via search snippet; the PDF text could not be extracted.)
- Level floats around a **normal level**; makeup and reject are corrections around it. A staged scheme described by
  plant staff: normal makeup valve opens just below normal and is fully open at "low"; an emergency makeup valve
  joins below that; "low low" trips the condensate extraction pump with both makeup valves fully open; at "high" a
  dump valve sends water to the condensate storage tank; at "high high" the steam inlet to the condenser is closed to
  avoid overflow. ([cheresources thread](https://www.cheresources.com/invision/topic/21623-set-points-of-levels-in-condenser-hot-well), forum, UNVERIFIED as a design rule.)
- Condensate flow is itself a level actuator. In a common arrangement a PI controller splits its range between a
  main condensate control valve (opens on rising level, sends water to the deaerator) and a recirculation valve
  (opens on falling level, returns deaerator-side water to the hotwell). The deaerator level then sets the net draw.
  ([instrumentationtools.com](https://instrumentationtools.com/hot-well-level-control-system-in-condensing-turbine), training site.)
  In another process description the makeup is controlled by the deaerator level (LIC on the deaerator base)
  ([Simtronics](https://simtronics.com/spm/?p=239), vendor description, not setpoint data).
- Makeup and reject are level-switch or level-controller driven from the condensate storage tank: low level, makeup
  pump and block valve from the makeup storage tank; high level, condensate return valve back to that tank.
  ([US patent 3955358](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/3955358), description of one combined-cycle plant.)

## Protection

- **Low-low**: trips the running condensate pump and inhibits pump start while below it, to protect the impeller from
  cavitation. NPSH available comes from impeller submergence below the hotwell level plus the pump elevation.
  ([Turbomachinery Magazine, NPSH in condensate pumps](https://turbomachinerymag.com/view/npsh-in-condensate-pumps), no numeric levels given.)
  Pump-industry FAQ: available NPSH can be as little as 2 to 4 ft of submergence
  ([Pumps & Systems](https://pumpsandsystems.com/vertical-pumps-power-generation-condensate-pump-design-considerations?page=2), snippet only).
- The low-low trip is set by the pump's NPSH required, and cannot be below the top of the suction pipe plus a margin
  (cheresources thread, forum, UNVERIFIED).
- **High level** hurts vacuum (tubes flooded, less condensing surface) and, if extreme, can carry water to the LP
  blades (instrumentationtools, training site). High level can also mean a condensate pump fault, which trips the
  running pump and starts the standby (Turbomachinery Magazine, above).
- Not found in any source read: that a hotwell high-high trips the turbine. Only "steam inlet to condenser closed" is
  claimed, by one forum poster. UNVERIFIED.

## Summary of setpoints found

| Level | Value | Source (type) |
|---|---|---|
| Normal | 25.0 in of a 40 in hotwell = 62.5% of height | cheresources, forum example |
| Normal | "60% of its range"; CEP start 70%, stop 60% | instrumentationtools (training) |
| Makeup opens | about 66% (normal makeup valve modulating) | Brainscape flashcards, one plant, UNVERIFIED |
| Reject opens | about 76% (modulating, controller only) | same flashcards, UNVERIFIED |
| High | 25.5 in = 102% of normal (about 64% of height) | cheresources example |
| High-high | 30 in = 120% of normal (75% of height) | cheresources example |
| Low | 7.5 in = 30% of normal (19% of height) | cheresources example |
| Low-low (pump trip) | 3.0 in = 12% of normal (7.5% of height), set by NPSHR | cheresources example |
| Low-low, other plant | 0.2 ft; high-high alarm 6 ft | flashcards, UNVERIFIED |

Pattern: every example holds **normal near 60 to 70% of height**, acts on makeup/reject within **about 5 to 15
points of normal**, and keeps the pump trip in the bottom **under 10 to 20%**. The 66%/76% pair also matches the one
plant already cited in the October note.

## What this means for 95% reject and 10% makeup

- **95% reject: too high as a control point.** Real high-high (flood protection) sits near 75% of height, high
  at about 64%. At 95% the hotwell is practically brim-full, which in a real plant means flooded tubes and lost
  vacuum. Use 95% at most as an overfill clamp, not the working reject point.
- **10% makeup: too low as a control point.** That is at or below the real low-low pump-trip level (about 7.5%
  in the one worked example). Makeup there would run the pump into cavitation first. Makeup belongs just below normal.
- **Agree with the idea of two limits, disagree with the numbers.** 10% and 95% are good as the *protection* tier
  (low-low pump trip or inhibit, overfill clamp). They are poor as the *regulation* tier.
- **Yes, a normal band belongs between them.** Real plants float around a normal level, with makeup and reject as
  slow corrections, and the condensate draw is trimmed by the deaerator level. With only 10% and 95%, the level
  would wander over 85 points before anything reacts, and the condensation pump (the faster actuator) would
  dominate. Compare with the headless run: in `bypass-loop` the level swings 53% to 99.96% and the operator rejects
  69 t and makes up 57 t in an hour, mostly churn between the 0.65 and 0.75 limits, because the loop moves more
  water per minute than the makeup and reject valves can correct. A wider, slower scheme alone will not fix that.
- The sim hotwell has 15 m3, flow at full bypass is about 167 kg/s, so the buffer is about 90 s. That is at the
  bottom of HEI's 1 to 5 minute range. A narrow band is physically a few seconds of flow. This is a sizing issue to
  record in `design-basis.md` if the hotwell is enlarged (own inference, not a source).

## Recommended band (proposal, our own numbers, not from a source)

| Tier | Level | Action |
|---|---|---|
| Normal band | 55 to 75%, target 65% | no makeup or reject; pump follows boiler level |
| Makeup | opens below 55%, proportional, closes at target | slow correction |
| Reject | opens above 75%, proportional, closes at target | slow correction |
| Alarm | below 25%, above 85% | operator alert |
| Protection | below 10%: condensation pump trips and cannot start; above 95%: clamp (reject full, bypass steam limited) | protection |

This keeps the owner's 10% and 95% as the protection tier and puts regulation where plants put it. Proportional
valves (position grows with distance from the band) fit the real "modulating" valves better than on/off with
hysteresis and should reduce churn.

## Open decisions for the owner

- Are 10% and 95% protection limits (trip / clamp) or the operator's working setpoints? This note recommends the former.
- Does the pump trip at low-low (needs a trip mechanism in `CondenserTick`), or does it only stop returning water?
- On/off with hysteresis versus proportional makeup and reject. Rate limits for the valves (slow corrections).
- Normal target: 60% (training site, forum) versus 65 to 70% (the current 0.70). Level is volumetric and shifts with
  temperature ([ADR 0007](../adr/0007-water-state-is-mass-in-kg.md)); decide whether bands are on level or mass.
- Whether the hotwell should be enlarged (buffer of about 90 s at full bypass) and whether the operator should
  trim condensate flow from the deaerator level (no deaerator in the sim yet).
- Should high-high do anything to the steam inlet, as one forum poster describes?

## UNVERIFIED

- All numeric setpoints in the table: forum, flashcards and training site, not a standard, OEM manual or utility document.
- HEI 1 to 5 minutes figure: seen only in a search snippet of Tech Sheet 136; the PDF text could not be read.
- HEI Standards for Steam Surface Condensers (12th ed.) hotwell section: not read (paywalled).
- Any NRC FSAR or plant setpoint document: the NRC links tried returned 403 or scanned images.
- High-high hotwell level tripping the turbine or closing the condenser steam inlet.
- That makeup is deaerator-level driven in power plants generally (one vendor description only).
