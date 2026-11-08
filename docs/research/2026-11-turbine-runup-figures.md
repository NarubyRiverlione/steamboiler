# Turbine run-up figures: inertia constant, no-load flow, run-up rate, loss exponent

Frozen research record. The plant as built is in [plant/design-basis.md](../plant/design-basis.md) and [plant/turbine.md](../plant/turbine.md); the decision this feeds is [ADR 0021](../adr/0021-turbine-runup-from-steam-power.md). Ticket #68, part of #66.

Web research, Nov 2026, for a ~130-150 MWe, 3000 rpm (50 Hz) steam turbine shaft line. Sources read in full: a 2025 Serbian measurement paper, a 2020 *Energy* paper, a 1995 *Power Engineering* article, two patents and a Wikipedia article. Several others could be seen only as search snippets, or as PDFs whose text could not be extracted (the NEA/ENTSO-E slide deck, the ERCOT primer, the Banaszkiewicz paper). Those are marked **UNVERIFIED**. Labels: **sourced** = a named document states it and I read it; **estimate** = my own reasoning or a low-trust source; lines marked *derived* are my arithmetic on a sourced number.

## Flags for the ADR (read first)

No figure contradicts ADR 0021's **decision** (physical torque, sourced losses, a sourced governor run-up rate). Three estimates in its Why section need correcting or caution:

1. **Run-up rate: the ADR's 100-300 rpm/min is too high at the top for a cold start.** The one sourced cold-start rate is **25-50 rpm/min** (Power Engineering, 1995). The 100 rpm/min that was seen in a plant procedure is UNVERIFIED. A cold start at 25-100 rpm/min takes 30-120 min to reach 3000 rpm, which still matches the ADR's "tens of minutes" but not its 300 rpm/min upper end.
2. **No-load flow: no primary source gives 5-10 %.** The only sourced numbers are lower (3 % for roll-up, 1.5 % mechanical losses). The ADR's calibration step ("losses calibrated so the no-load flow holds sync speed") could overstate the losses by several times if 5-10 % is used. See [No-load flow](#no-load-steam-flow-and-speed-tolerance).
3. **Inertia constant H 3-4 s is at the low edge** of the sourced range (2.5-6 s, most steam units 4-5 s). It is not wrong. The sourced measured J of a 3000 rpm unit points to about 4.8 s.

## Short answer

| Figure | Chosen / range | Label | ADR 0021 |
|---|---|---|---|
| Inertia constant H (turbine + generator) | **4 s** (range 2.5-6 s); J about 1.06e4 kg m2 at S = 131 MW | sourced range (Kundur via two reviews; Mehigan 2020; Dragosavac 2025 measurement); the single value is an estimate | confirmed, 3-4 s is inside the range but low; 4-5 s fits better |
| No-load steam flow | **3-10 % of rated flow** (no primary source; 3 % roll-up is the only verified number); keep 5-10 % only as an estimate | **estimate** | not confirmed; flagged |
| No-load speed tolerance | governor droop **5 %** (sourced); the no-load hold band is not sourced, use +/-2 rpm as today | droop sourced, band estimate | n/a |
| Run-up rate, cold | **25-50 rpm/min** (sourced), up to 100 (UNVERIFIED) | sourced (one unit) | corrected downward |
| Run-up rate, hot | not sourced; faster than cold; 100-300 rpm/min plausible | **estimate** | unverified |
| Loss exponent (power vs speed) | **3** for windage (rotor-gap correlation); 2.7 measured for electric machine windage; bearing not found | windage sourced as a generic form (UNVERIFIED for steam); bearing **estimate** | confirmed in form, not for steam |

## Inertia constant H

- **Definition.** H = kinetic energy at rated speed / rated apparent power (MWs/MVA), in seconds. J = 2·H·S / ω_s² (Dragosavac 2025; Mehigan 2020 eq. 1).
- **Typical range.** A table attributed to Kundur (*Power System Stability and Control*, 1994) gives **2.5-6 s for two-pole thermal units (3000/3600 rpm)** and 4-10 s for four-pole units. I saw it only in two review tables that cite Kundur, not in the book (UNVERIFIED as to the original page). Source: Power systems with high renewable energy sources: a review of inertia and frequency control strategies, arXiv 2004.02951 (2020).
- **Grid-code model values.** Mehigan et al., *Energy* 203 (2020) 117776, Table 4 (data taken from ENTSO-E-based studies and a TSO inertia reference), stored rotational energy per unit:

  | Unit | MW | MWs | H on MW base (*derived*) |
  |---|---|---|---|
  | Solids-fired (coal) | 300 | 1600 | 5.3 s |
  | Biomass/waste-fired | 300 | 1220 | 4.1 s |
  | Oil-fired | 400 | 900 | 2.3 s |
  | Nuclear | 1200 | 5800 | 4.8 s |
  | Gas CCGT | 450 | 3200 | 7.1 s |

  These are MW-based, so they run about 15 % higher than an MVA-based H. A search snippet of an OECD-NEA workshop deck (Tielens, "Operation and control of power systems with reduced synchronous inertia", 2020, citing ENTSO-E-area practice) lists hard coal 4.1 s, lignite 3.9 s, gas 4.3 s, nuclear about 6 s. The deck's text could not be extracted (UNVERIFIED).
- **A measured unit.** Dragosavac, Mijajlov and Damjanac (Nikola Tesla Institute, *Zbornik radova / Energija, ekonomija, ekologija* 35, 2025, doi:10.5937/zeint35-63014) derive J from five coast-down recordings of unit B1 at TENT B (3000 rpm): **J = 59,759 kg m2** for the whole turbogenerator (generator alone about 56 tm2). The paper gives no MW rating in the text I could read. If the unit is 620 MW (my memory, UNVERIFIED), H = 0.5·J·ω_s²/S = **4.8 s** (*derived*). The paper also states that steam turbine inertia data are usually missing from the documentation and that H shows no clear trend with rated power.
- **Turbine share.** One textbook chapter (a Scribd copy, source not identified) puts the prime mover at 30-60 % of a steam turbogenerator's inertia (UNVERIFIED). H must therefore cover both.
- **For the sim.** S = 131 MWe (design-basis), H = 4 s gives J = 2·4·131e6/314.16² = **10,600 kg m2** (*derived*). H = 3 s gives 7,960; H = 5 s gives 13,300. A linear scale of the measured TENT B1 value to 131 MW gives 12,600 kg m2 (*derived*, crude).
- **Verdict.** ADR's 3-4 s: **confirmed as within range**, but the low half. The ADR's "J of the order of 10^4 kg m2" is confirmed.

## No-load steam flow and speed tolerance

No primary source gave the no-load flow at 3000 rpm as a share of rated flow.

- **3 % of full-load flow rolls the turbine.** A start-up control patent states "approximately 3% of the full load flow goes to the turbine" for roll-up (US4656335, Babcock & Wilcox, filed 1983-05-16, granted 1987-04-07). Read in full. It is a nuclear plant design and the 3 % is the roll-up supply, not a measured no-load flow. **Sourced, weak fit.**
- **1.5 % of turbine power is lost mechanically.** Dragosavac 2025, citing B. Kraut, *Strojarski priručnik*, p. 231: near synchronous speed the turbine losses are 1.5 % of nominal turbine power. At full-load specific work (131 MW / 171 kg/s = 0.77 MJ/kg, *derived*) that is about 2.0 MW or **2.6 kg/s = 1.5 % of rated flow** (*derived*). Secondhand, so **sourced, weak**. The paper's loss table (turbine, bearing and ventilation losses separately) was not readable.
- **10-20 % of full flow, vendor blog.** A knowledge-base post (industrialmonitordirect.com) says the minimum flow to hold rated speed at no load is 10-20 % of full-load flow and that the OEM fixes it by factory test. It could not be re-fetched (HTTP 429). Low trust. **Estimate only.**
- **Willans line.** Steam use is linear in load, with a no-load constant C (Wikipedia, Steam turbine governing, retrieved 2026-11). It gives no value. A textbook exercise (FOSSEE Scilab Ex 8.14) assumes 10 %; that is an assumption in a problem, not data.
- **Speed tolerance.** A GE patent states a conventional **5 % speed regulation** (droop): a 1 % speed rise closes the inlet valves by 20 % (US6250877, granted 2001-06-26, read in full). Emergency trip is at 110 % of rated speed (Wikipedia, Steam turbine governing). No source gives the hold band at no load, so the +2 rpm breaker-open limit used today stays an estimate.
- **Verdict.** ADR's 5-10 %: **cannot be confirmed**. The verified numbers (1.5 %, 3 %) are lower; the one source that is higher (10-20 %) is low trust. 18 kg/s against 171 kg/s is 10.5 %, so it sits at the top of the ADR range. If #69 calibrates the loss curve to a no-load flow of 5-10 %, the loss at sync speed would be 5-10 % × 131 MW = 6.5-13 MW (*derived*), several times the sourced ~2 MW. The ticket owner should decide which one to honour.

## Run-up rate, cold and hot

- **Cold, valve-open start: 25-50 rpm/min.** At the JEA Northside Unit 3 (518 MW Westinghouse) the rotor accelerates "at an acceleration rate of 25-50 rpm per minute", slow so that the rotor bore temperature lags the surface by only 7 F. Soak: the turbine is held above 3000 rpm until the blade temperature rises enough. Oil temperature gates: 80 F to roll, 90 F above 1000 rpm, 100 F above 3000 rpm. The article names no critical speeds. It mentions that traditional starts reached bearing-vibration alarms passing critical speeds. Source: *Power Engineering*, "New procedure speeds cold start, protects turbine", 1995-09-01. Read in full. **Sourced**, one 500 MW-class unit.
- **Classic training text: about 100-150 rpm/min on the first stretch.** Accelerate to about 300 rpm in two or three minutes to establish an oil film, hold at 300-500 rpm for 15-30 min, then bring a regularly turned machine to two-thirds of full speed over 15-20 min (about 100-130 rpm/min, *derived*). Critical speeds are learned from experience and passed without delay. Source: Power Engineering series module B1.3, "Steam Turbine Operation and Maintenance" (undated; a Siemens 360 MW figure is used). **Estimate** (secondary, undated).
- **Plant procedure, combined cycle (UNVERIFIED).** Search snippet: cold-start speed ramp 100 rpm/min with holds at 600, 1200, 2400 and 3000 rpm for heat soak, 30-50 min at 1200 rpm (Scribd, "CCPP cold start procedure"). Text not read.
- **Research paper, 360 MW (UNVERIFIED).** Banaszkiewicz, "Steam turbines start-ups", *Trans. Inst. Fluid-Flow Machinery* 126 (2014) 169-198: a run-up rate of 75 "rev/min2" as an example to 3000 rpm, a high-power unit crossing critical speeds at 600-800 "rev/min2", run-up not to be stopped inside a critical speed range, HP/IP inner casing under 100 C before the turning gear stops. I saw these only in search summaries of garbled Scribd mirrors. The unit "rev/min2" is ambiguous. UNVERIFIED.
- **Start classes (UNVERIFIED).** HP metal temperature above 350 C is hot, 150-350 C warm, below 150 C cold (snippet of the same Scribd material). A hot start after two hours' shutdown needs only 30-60 min to load.
- **Hot start.** No sourced rate. Hot rotors tolerate a faster ramp and shorter holds; the 1995 article implies many hot starts still need throttling because of temperature mismatch. **Estimate:** 100-300 rpm/min.
- **Verdict.** ADR's 100-300 rpm/min: **corrected downward for the cold start** (25-50 sourced, about 100 unverified). The upper end stays plausible only for hot starts, as an estimate. Cold start of 3000 rpm at 50 rpm/min is 60 min, at 100 rpm/min 30 min, both "tens of minutes" as in the ADR. Soak holds (300-500 rpm, 600/1200/2400 rpm) are sourced only as examples, and the sim has none.

## Loss exponent

- **Disc and rotor-gap windage: power proportional to omega^3.** The windage loss of a rotating cylinder in a gap is W = pi·rho·Cf·R^4·omega^3·L (sCO2 Power Cycles Symposium paper, 2024-01, supercritical CO2, not steam; the equation was seen in a search snippet and the PDF text could not be extracted). UNVERIFIED for steam. It matches the textbook form: disc-friction torque proportional to omega^2, power to omega^3.
- **Electric-machine windage: omega^2.7.** "this windage power loss increases exponentially as a function of speed of the rotor (P ∝ ω^2.7)" (US5828148, Sundstrand, filed 1997-03-20, granted 1998-10-27, read in full). High-speed flooded-cooled motors and generators, not a steam turbine rotor.
- **Bearings.** No source found. *Estimate:* hydrodynamic journal bearings give friction torque roughly proportional to speed, so power proportional to omega^2. Not checked against a source.
- **Combined.** A turbogenerator coast-down is fitted with a single speed-dependent loss in the Dragosavac 2025 paper, but its exponent is in an equation I could not read.
- **Verdict.** ADR's loss ∝ omega^3: **confirmed in form** for windage (2.7-3), and a mix with bearing losses lowers the effective exponent slightly, so 2.5-3 is the honest range. Keeping 3 is within that range and is the conservative (steeper) choice. **Estimate** for a steam turbine.

## Sim

My own reading of the ADR, not a sourced statement.

- **H and S.** With S = 131 MWe and H = 4 s, J = 10,600 kg m2 (about double today's 5000). Using MVA (about 15 % more) would be within the uncertainty of H.
- **Run-up rate in hold mode.** Using 50 rpm/min (the upper end of the sourced range) makes the cold ramp to 3000 rpm 60 min of sim time; 100 rpm/min makes it 30 min. The ADR's "scenario gets much shorter" still holds against the old ~5 h.
- **Loss calibration.** If the loss at sync speed is set to the sourced 1.5-3 % of rated power instead of the 5-10 % no-load flow, the no-load flow is 2.6-5 kg/s rather than 18 kg/s. The current 18 kg/s in the hold-mode run is then 3-7 times the flow needed to hold sync speed. Open question for #69.

## Sources

- [Dragosavac, Mijajlov, Damjanac, Estimation of the moment of inertia of a unit in a thermal power plant (Zbornik radova 35, 2025)](https://asistent.ceon.rs/index.php/zeint/article/download/63014/29780)
- [Mehigan et al., Renewables in the European power system and the impact on system rotational inertia (Energy 203, 2020)](https://www.ucc.ie/en/epmg/publications/2020-05-06-renewables-in-the-european-power-system-and-the-impact-on-system-rotational-inertia.html)
- [Power systems with high renewable energy sources: a review of inertia and frequency control strategies over time (arXiv 2004.02951, 2020)](https://arxiv.org/pdf/2004.02951)
- [OECD-NEA workshop, Operation and control of power systems with reduced synchronous inertia (2020), UNVERIFIED](https://oecd-nea.org/upload/docs/application/pdf/2020-07/workshop_esr_4._operation_and_control_of_power_systems_with_reduced_synchronous_inertia.pdf)
- [ERCOT, Inertia: basic concepts and impacts on ERCOT (2018), snippet only, UNVERIFIED](https://www.ercot.com/files/docs/2018/04/04/Inertia_Basic_Concepts_Impacts_On_ERCOT_v0.pdf)
- [Power Engineering, New procedure speeds cold start, protects turbine (1995-09-01)](https://www.power-eng.com/coal/new-procedure-speeds-cold-start-protects-turbine/)
- [Power Engineering series B1.3, Steam turbine operation and maintenance (undated)](https://ryleymcc.github.io/Power-Engineering/2%20B1/2%20B1%20Chapter%203%20-%20Steam%20Turbine%20Operation%20and%20Maintenance/index.html)
- [Banaszkiewicz, Steam turbines start-ups (Trans. IFFM 126, 2014), UNVERIFIED](https://imp.gda.pl/wydawnictwo-imp-pan/transactions-of-iffm/volumes/126/article/steam-turbines-start-ups)
- [US4656335, Start-up control system and vessel for LMFBR (Babcock & Wilcox, 1987)](https://patents.google.com/patent/US4656335)
- [US6250877, Steam turbine controller with variable frequency regulation (General Electric, 2001)](https://patents.google.com/patent/US6250877)
- [US5828148, Reducing windage losses in rotating equipment (Sundstrand, 1998)](https://patents.google.com/patent/US5828148)
- [sCO2 Power Cycles Symposium 2024, paper 084 (windage equation), UNVERIFIED](https://sco2symposium.com/proceedings2024/084-paper.pdf)
- [Wikipedia, Steam turbine governing](https://en.wikipedia.org/wiki/Steam_turbine_governing)
- [industrialmonitordirect.com, Steam turbine overspeed protection and free-wheeling load estimation (low trust)](https://industrialmonitordirect.com/blogs/knowledgebase/steam-turbine-overspeed-protection-and-free-wheeling-load-estimation)
