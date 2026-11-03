# SJAE motive steam: where it comes from on a cold start

Frozen research record. The plant as built is in [plant/design-basis.md](../plant/design-basis.md) and [plant/condenser.md](../plant/condenser.md); the related research is [2026-10-startup-procedure.md](2026-10-startup-procedure.md) and [2026-10-feedwater-loop.md](2026-10-feedwater-loop.md).

Web research, Nov 2026. Question: where does the steam jet air ejector (SJAE) get its motive steam during a cold
start, and can it run with the main steam valve closed? The sources are a vendor conference paper (Maarky, ASME
POWER 2016), two NRC training manuals (Westinghouse PWR), a CANDU course, a 210 MW unit start-up deck and a plant
blog. No Graham or Croll-Reynolds data sheet and no HEI table could be read in full. Every number varies by unit and
is quoted to show an order of magnitude. Lines marked **Sim** and items marked *inference* are our own reading.

## Short answer

Yes, on a cold start, because the sourced cold-start supply is **auxiliary steam**. It comes from an auxiliary
header fed by a start-up boiler or another unit, so it does not depend on the unit's own main steam valve. On the
unit's own main steam it depends on where the tap is. In the one sourced case (Westinghouse PWR) the reducing valve
takes steam from a header downstream of the main steam isolation valves, so that supply stops when they are closed.
That is why auxiliary steam feeds the ejectors at start-up. Plants without start-up steam use a mechanical vacuum
pump until steam is available.

## Tap points

- **Auxiliary steam header.** Westinghouse PWR: the auxiliary steam system feeds the gland steam, the main air
  ejectors and the hogging air ejectors during start-ups and shutdowns. A start-up boiler (64,000 lb/h at 150 psig)
  supplies it.
- **Main steam through a reducing valve.** Same plant, normal running: "the air ejectors are jet pumps supplied with
  main steam through a reducing valve". The tap is the 28 in bypass header upstream of the turbine throttle valves,
  which also feeds the steam dumps (the bypass). The MSIVs sit upstream of it, just outside containment.
- **Station header / APRDS (fossil).** On Indian 210–500 MW coal units the auxiliary pressure-reducing and
  desuperheating station (APRDS) feeds the main and starting ejectors. In normal running it is fed from main steam or
  cold reheat. For a start-up it is fed from another unit through the station header, or from a light-oil auxiliary
  boiler (blog source, weak).
- **Line-up on a 210 MW unit.** The deck charges "the steam supply header to turbine gland sealing and air ejector
  from PRDS", then starts the starting ejector at 7.0 kg/cm². The boiler-end main steam stop valve opens at
  10 kg/cm². The deck is not consistent on the order (see Start-up order).
- **No start-up steam.** Susquehanna (BWR) runs the mechanical vacuum pump until main steam or auxiliary boiler steam
  can drive the SJAEs. Point Beach uses a vacuum pump when main steam is unavailable. A commissioning patent uses a
  temporary boiler where the design has no auxiliary boiler. These three come from search snippets; their PDF text
  could not be extracted (UNVERIFIED).

Cold start versus normal running: start-up steam comes from the auxiliary header, another unit or a vacuum pump.
In normal running the unit feeds itself from main steam or cold reheat through a reducing station.

## Motive steam conditions

- Typical design point: 150 psig (about 11 bar abs) at 400 °F (204 °C), about 18 K superheat. Motive steam should be
  dry at all times. Below 50 psia (3.4 bar abs) is not recommended (Maarky).
- The ejector works at **−0 % / +10 %** of its design pressure. Below design pressure it loses capacity and can
  "break" (lose suction). A pressure-regulating valve holds the pressure constant.
- Schutte & Koerting quote a standard power-plant system at 115 psig dry saturated, rated 150 psig / 365 °F.
- The CANDU course quotes about 2000 kPa(g) (20 bar) at the nozzle; the 210 MW starting ejector runs at 7 kg/cm².
- APRDS headers: 16 kg/cm² at 320 °C (HT) and 210 °C (LT, after desuperheating).

## Steam consumption

Maarky Table 1 (motive steam at 150 psig / 400 °F; holding = first + second stage):

| Holding / hogging capacity (SCFM) | Holding steam | Hogger steam |
|---|---|---|
| 10 / 200 | 785 lb/h (0.10 kg/s) | 1750 lb/h (0.22 kg/s) |
| 12.5 / 350 | 920 lb/h (0.12 kg/s) | 3120 lb/h (0.39 kg/s) |
| 15 / 700 | 1165 lb/h (0.15 kg/s) | 6110 lb/h (0.77 kg/s) |
| 20 / 1400 | 1520 lb/h (0.19 kg/s) | 12,460 lb/h (1.57 kg/s) |

- HEI sets the holding capacity from the condensed steam flow and the number of shells. A POWER test example uses
  15 SCFM. The tables themselves are paywalled.
- *Inference:* a single-shell 150–200 MWe unit falls around 10–15 SCFM holding, so about **0.1–0.15 kg/s** holding
  steam, with **0.2–0.4 kg/s** while hogging. A 1150 MWe Westinghouse unit uses three 1200 SCFM hoggers.
- Hogging takes about **30 min** to 10 inHg abs (about 340 mbar abs) (Maarky) and about **45 min** to normal vacuum
  (CANDU course).

## Where the motive steam goes

- **Holding ejector (two stages).** First-stage steam condenses in the inter-condenser, second-stage steam in the
  after-condenser. Both are cooled by main condensate from the condensate pumps. Both drain to the main condenser
  hotwell (inter-condenser through a loop seal or trap). Only air and a little vapour are vented. The condensate goes
  back into the cycle, and so does the heat.
- **Minimum condensate flow.** The inter- and after-condensers need a minimum condensate flow through their tubes.
  The condensate pump has to run before the holding ejector does.
- **Hogger.** A single-stage, non-condensing ejector. Its exhaust goes to atmosphere through a silencer: "after
  passing through the ejector, the steam is released to atmosphere" (CANDU). This steam is a **water loss**.
- **Vacuum pump.** It needs no steam. The heat goes to the cooling water through the seal-water cooler.

## Start-up order

1. Condenser cooling water and the condensate pump run, hotwell at normal level.
2. Start-up steam lined up from the auxiliary header (PRDS). The starting (hogging) ejector or both vacuum pumps
   pull vacuum. A 210 MW checklist says to start vacuum pulling "just before boiler lightup" (search snippet,
   UNVERIFIED). The 210 MW deck's Gujarati slide starts it at a drum pressure of 5 kg/cm² and opens the main steam
   stop valve bypass at 8 kg/cm². Its English slides list the stop valve step before the vacuum step.
3. Gland steam at about 150 mm Hg vacuum (0.2 kg/cm²).
4. Main (holding) ejector in at about 0.7–0.8 kg/cm² vacuum; the hogger is shut off. With vacuum pumps, one pump
   stops and the other holds.
5. Main steam stop valve opened (10 kg/cm² in the deck), bypass to the condenser, then the turbine rolls.

Vacuum comes before steam goes to the condenser or the turbine. Vacuum pumps "do not need steam to start", which is
why plants without start-up steam use them.

## Quoted values

| Quantity | Value | Source |
|---|---|---|
| Motive steam design point | 150 psig / 400 °F (about 11 bar abs / 204 °C), dry | Maarky, ASME POWER 2016 |
| Lowest recommended motive pressure | 50 psia (3.4 bar abs) | Maarky |
| Pressure tolerance | −0 % / +10 % of design | Maarky |
| Standard power system | 115 psig dry saturated | Schutte & Koerting |
| Nozzle steam | about 2000 kPa(g) | CANDU course 334 |
| Starting ejector, 210 MW unit | 7.0 kg/cm² | 210 MW LMZ start-up deck |
| Main steam stop valve opened at | 10 kg/cm², about 200 °C | 210 MW LMZ start-up deck |
| APRDS header | 16 kg/cm², 210–320 °C | plant blog (weak) |
| Start-up boiler, PWR | 64,000 lb/h (8 kg/s) at 150 psig | NRC HRTD 7.1 |
| Holding steam, 10–15 SCFM | 785–1165 lb/h (0.10–0.15 kg/s) | Maarky Table 1 |
| Hogger steam, 200–350 SCFM | 1750–3120 lb/h (0.22–0.39 kg/s) | Maarky Table 1 |
| Hogger, 1150 MWe PWR | 3 × 1200 SCFM, exhaust to atmosphere | NRC HRTD 7.2 |
| Hogging time | 30–45 min | Maarky; CANDU course |
| HEI holding test example | 15 SCFM dry air at 1 inHg abs | POWER magazine |

## Sim

Our own reading of `src/utils/condenserCalculation.ts` and `src/context/const.ts`.

- **Code against doc.** `calcSJAEvacuum` turns the SJAE off when boiler pressure is ≤
  `CstTurbine.MainSteamValveMinimumPressure` (10 bar). The main steam valve position plays no part.
  `plant/condenser.md` says it turns off "when there is no steam flow in the master steam valve". The doc is out of
  date with the code. Neither one matches a sourced arrangement exactly. The code acts like a tap on the boiler
  upstream of the main steam valve, which no source shows. The doc acts like a tap downstream of the valve, like the
  PWR main-steam supply. Real cold-start practice ties the ejector to neither: it runs on auxiliary steam.
- **The 10 bar gate.** The sim has no auxiliary steam. Its order (CAR first, SJAE once there is boiler pressure)
  follows the "vacuum pump until steam is available" pattern (Susquehanna snippet, UNVERIFIED). The sourced motive
  pressures range from 7 kg/cm² (starting ejector) to about 20 bar(g) (CANDU), so 10 bar is within range. An
  ejector breaks below its design pressure, so a hard cut-off is realistic. The 210 MW deck opens its main steam stop
  valve at 10 kg/cm², the same value as `MainSteamValveMinimumPressure`. Reusing the turbine constant for the SJAE
  still links two unrelated settings; a separate motive-pressure constant would be clearer.
- **Capacity scaling.** `steamFlowEffect = min(1, boilerPressure / MaxSteamRemovalRate)` divides bar by kg/s (10 bar
  gives 0.05, 165 bar gives 0.83). A real ejector behind a reducing valve has its full design capacity at any supply
  pressure above design and none below. This term has no physical basis.
- **Roles.** The SJAE only works within `SJAE_MaxPressureDifference` (20 mbar) of `CAR_MaxVacuum`. That is a holding
  ejector, with the air extraction pump (CAR) as the hogging device, like a plant with vacuum pumps. It fits.
  `CAR_TimeNeeded` is 15 s, though; real hogging takes 30–45 min.
- **Missing steam consumption.** The SJAE takes no water from the boiler. Holding steam on a 150–200 MWe unit is
  about 0.1–0.15 kg/s (*inference*), under 1 % of the 20 kg/s bypass flow. It drains back to the hotwell, so the
  loop inventory does not change. Only the vapour vented with the air leaves, and it is small. Over a
  2 h start, 0.15 kg/s is about 1 t moved from boiler to hotwell around the main steam valve, small next to the
  ~15 t thermal-expansion surplus of [ADR 0018](../adr/0018-cold-fill-at-35-percent.md). A steam hogger would lose
  about 0.4–1 t to atmosphere per start. The sim hogs with the CAR, so it loses none. **Leaving the consumption out
  does not matter for the water balance.**
- **Not modeled:** auxiliary steam header, gland steam, the inter- and after-condenser and their minimum condensate
  flow (the SJAE runs without the condensation pump), motive steam heat in the hotwell.

## Sources

- [Nadig, Evacuation systems for steam surface condensers: vacuum pumps or steam jet air ejectors? (ASME POWER 2016)](https://maarky.com/wp-content/uploads/2016/06/ASME-2016-POWER-CONFERENCE-Charlotte-FINAL-02-22-2016.pdf)
- [Schutte & Koerting, Multi-stage vacuum system for power applications](https://www.s-k.com/steam-jet-vacuum/multi-stage-vacuum-system-for-power-applications/)
- [NRC HRTD, Westinghouse Technology 7.1, Main and auxiliary steam](https://www.nrc.gov/docs/ml1122/ML11223A244.pdf)
- [NRC HRTD, Westinghouse Technology 7.2, Condensate and feedwater](https://www.nrc.gov/docs/ml1122/ML11223A246.pdf)
- [CANTEACH, Course 334 Turbine, generator and auxiliaries: the condenser](https://canteach.candu.org/Content%20Library/20051006.pdf)
- [210 MW LMZ turbine rolling and its governing (slides)](https://www.slideshare.net/slideshow/210-mw-lmz-turbine-rolling-and-its-governing/64895611)
- [APRDS in thermal power plant (blog)](https://power-plant-gyan.blogspot.com/2020/04/aprds-in-thermal-power-plant.html)
- [Susquehanna SES FSAR chapter 10](https://www.nrc.gov/docs/ML1931/ML19317D899.pdf)
- [Point Beach FSAR update](https://www.nrc.gov/docs/ML2110/ML21102A358.pdf)
- [US10480780, Method and apparatus for commissioning power plants](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10480780)
- [POWER, Condenser backpressure high? Check vacuum system sizing](https://www.powermag.com/condenser-backpressure-high-check-vacuum-system-sizing)
