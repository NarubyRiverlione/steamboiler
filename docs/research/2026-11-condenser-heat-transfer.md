# Condenser heat transfer: figures for a limited heat exchanger

Frozen research record for #82. The condenser as built is in [plant/condenser.md](../plant/condenser.md) and
[plant/design-basis.md](../plant/design-basis.md#condenser-and-water-loop); the exhaust split is in
[ADR 0028](../adr/0028-exhaust-splits-by-quality-at-condenser-intake.md); the heater that lowers the heat load is in
[ADR 0031](../adr/0031-one-extraction-heater.md).

Web research, Nov 2026. Question: what do the sources say about a surface condenser for a 125 to 140 MWe unit, with once-through
cooling water at 10 °C, exhaust at 30 to 100 mbar, a heat load of about 273 MW at 171 kg/s and wet exhaust of quality about 0.66?
The code today treats it as a perfect exchanger, Q = m·cp·(Tsat − Tin). The wanted model is Q = ε·m·cp·(Tsat − Tin) with
ε = 1 − exp(−UA/(m·cp)).

Sourced facts and our own inference are marked apart. Items not traced to a read source are marked UNVERIFIED. The "Read?" column
says how each source was seen: **text** means PDF text was extracted and read; **figure** means a page was rendered and looked at;
**summary** means the page was fetched, but read through a summarising tool, so its wording here is not a quotation. Search
snippets are not counted as read and appear only under UNVERIFIED.

**The main limits of this note.**

- **The strong standards were out of reach.** HEI Standards for Steam Surface Condensers (12th ed., sold by HEI) and ASME PTC 12.2
  are paywalled. A third-party copy of the HEI Standard turned up in search and was not used. HEI's method is seen here through EPRI,
  MIL-HDBK-1003/7 and a journal paper that writes it as a formula. Black & Veatch, El-Wakil and Putman were not read.
- **NRC document links returned HTTP 403.** So no FSAR figure is used. ScienceDirect also returned 403. The search did not work
  around either.
- **Almost no source has cold water.** The one measured unit near 10 °C is the Polish 200 MW unit in Laskowski et al. The California
  units take 15 to 19 °C seawater, the Texas units in the design tables 32 to 36 °C.
- **No source has wet exhaust like ours.** The Laskowski unit has quality 0.92 to 0.94. So every figure per kg of steam or per MWe must
  be converted to a figure per MW of heat before it is used here.
- **Many California rows are partly estimates.** See section 4.

**Later decision:** the grilling sized for about 262 MW, the rated load after #74, not the 273 or 230 MW used here, and chose the
single pass design. A rule at the intake makes the bypass exact without tracked pool energy. See
[ADR 0032](../adr/0032-limited-condenser-and-stream-enthalpy.md).

## Sources

| Source | What it is | Class | Strength | Read? |
|---|---|---|---|---|
| [MIL-HDBK-1003/7 in UFC 3-540-02N (2004, inactive)](https://www.wbdg.org/FFC/DOD/UFC/INACTIVE/ufc_3_540_02n_2004.pdf) | government design handbook, §7 and Figure 30 | generic fossil, small plants, HEI 1970 basis | strong | text, figure |
| [TM 5-811-6, Electric Power Plant Design (US Army, 1984)](https://www.wbdg.org/FFC/ARMYCOE/COETM/ARCHIVES/tm_5_811_6.pdf) | government design manual, Section VI | generic, small to medium plants | strong | text |
| [EPRI TR-112819, Condenser In-Leakage Guideline (2000)](https://restservice.epri.com/publicdownload/TR-112819/0/Product) | industry research body; states HEI and ASME methods | generic fossil and nuclear | strong | text, Figure 2-3 |
| [EPRI TR-109725, Condenser CFD evaluation (1998)](https://restservice.epri.com/publicdownload/TR-109725/0/Product) | industry research body; three real condensers | lignite 565 and 750 MW, gas 520 MW | strong | text |
| [EPRI TR-052907, Retrofitting California Coastal Plants (2007)](https://waterboards.ca.gov/water_issues/programs/ocean/cwa316/docs/epri_retrofit_otc.pdf) | industry research body; per-unit cooling tables | gas steam units, seawater once-through, nuclear | strong; some rows estimated | text, §3 and Appendix B tables |
| [EPRI 1025068, Advanced Cooling Options for Nuclear Power Plants](https://restservice.epri.com/publicdownload/000000000001025068/0/Product) | industry research body | LWR | strong | relevant parts |
| [EPA §316(b) Phase I TDD (2001)](https://www.epa.gov/sites/default/files/2015-04/documents/cooling-water_phase-1_tdd_2001.pdf) | regulator technical document | generic steam electric | strong | relevant parts |
| EPA Merrimack Station, [2011 fact sheet](https://www.epa.gov/system/files/documents/2025-08/2011-merrimackstationfactsheet.pdf), [Attachment D](https://www.epa.gov/system/files/documents/2025-08/2011-merrimackstationattachd.pdf), [2020 permit](https://www.epa.gov/system/files/documents/2025-06/merrimack-final-permit-2020.pdf) | regulator permit record | coal, 120 and 350 MW, river once-through | strong | relevant parts |
| [Laskowski et al., condensation pressure off design (Arch. Thermodyn. 42, 2021)](https://journals.pan.pl/Content/121377/PDF/art03_final.pdf) | peer-reviewed; measured data of a 200 MW unit | steam unit, fuel not stated, 8 to 11 °C water | strong | text |
| [Vodeniktov et al., overall coefficient at high water temperature (KU Leuven repository)](https://lirias.kuleuven.be/retrieve/c4c96bca-fa59-4aad-bfd3-460e61c01e88) | journal manuscript; PT-25-90 turbine | 25 MW, degraded vacuum | medium | text |
| HEI Tech Sheets [113 Condenser Basics](https://www.heatexchange.org/wp-content/uploads/2025/04/FINAL_Tech_Sheet_113_Condenser_Basics-2c4a0c84.pdf), [136 Hotwells](https://www.heatexchange.org/wp-content/uploads/2025/04/FINAL_Tech_Sheet_136_Condenser_Hotwells_04-09-15-3c5b34ac.pdf), [140 FAQ](https://www.heatexchange.org/wp-content/uploads/2025/04/FINAL_Tech_Sheet_140_Condenser_FAQs_04-20-16-58c7932b.pdf), [122 Retube](https://www.heatexchange.org/wp-content/uploads/2025/04/FINAL_Tech_Sheet_122_Condenser_Modular_Replacement_vs__Retube_9-07-9d87dd92.pdf) | trade body sheets, not the Standard | generic | medium | text |
| [Combined Cycle Journal, steam-turbine bypass systems (4Q 2003)](https://competitivepower.us/pub/pdfs/Steam-Turbine-Bypass-Systems-CCJ-4Q-2003.pdf) | trade press; quotes HEI §5.4.2 and EPRI | combined cycle, some fossil | medium | text |
| [Turbine Bypass Valve Technology (PowerGen 2019, McIlvaine)](http://www.mcilvainecompany.com/PowerGen_2019/Turbine_Bypass_Technology_and_Applications_10-31-19.pdf) | conference slides | combined cycle, fossil | medium to weak | text |
| [Power Engineering, steam bypass design](https://www.power-eng.com/gas/turbines/proper-steam-bypass-system-design-avoids-steam-turbine-overheating/) | trade press | combined cycle | medium | summary |
| [US 9,593,598 B2, steam conditioning system](https://patents.google.com/patent/US9593598B2/en), [US 6,481,208 B1, external steam dump](https://patents.google.com/patent/US6481208B1/en) (the second fetched as a page, the PDF has no text) | patents, background statements | combined cycle | medium to weak | summary |
| [ABB Review, large steam condensers (1997)](https://library.e.abb.com/public/d8d8dcaa4b9ece7ec1256ecc0038dc62/40-48%20ENG%209703.pdf) | OEM paper | 150 MW to 2 GW | medium | relevant parts |
| [Guyer, Condensers and Auxiliary Equipment (CED)](https://www.cedengineering.com/userfiles/D03-003%20%20%20An%20Introduction%20to%20Condensers%20and%20Auxiliary%20Equipment%20for%20Steam%20Power%20Plants%20-%20US.pdf) | course adapted from the handbook above | same | not separate evidence | text |

Not read: HEI Standards for Steam Surface Condensers, ASME PTC 12.2 (paywalled); Putman, *Steam Surface Condensers*; Black & Veatch
*Power Plant Engineering*; El-Wakil; all NRC FSAR chapters (403); [EPRI 1007456, Cooling System Retrofit Cost Analysis](https://www3.epa.gov/region1/npdes/schillerstation/pdfs/AR-333.pdf) (the link gave an HTML docket page, not the PDF);
ScienceDirect papers (403); a Thermopedia article (blocked by bot protection); [an EPRI cooling overview on McIlvaine](https://www.mcilvainecompany.com/Decision_Tree/subscriber/Tree/DescriptionTextLinks/EPRIoverview.pdf) (scanned, no text; one rendered page was blank).

## 1. Cooling water temperature rise

**Sourced.**

- Generic: rise "typically between 10 degrees F (5.6 degrees C) and 25 degrees F (13.9 degrees C)" (MIL-HDBK-1003/7 §7.2.3.3).
- Once-through, typical fossil design point: 500 gpm/MW, range 20 °F, 11.1 K, TTD 7 °F (EPRI TR-052907 §3.2.2; own conversion). It rests on a 10 000 Btu/kWh
  heat rate and about 5000 Btu/kWh rejected.
- Tower: ranges of 18 to 22 °F, 10 to 12 K, with approaches of 8 to 15 °F (TM 5-811-6). A typical closed-cycle point is a 25 °F range, 13.9 K, at
  400 gpm/MW (EPRI TR-052907). EPA costed wet towers with a 20 °F rise (Phase I TDD). Closed-cycle systems "optimize at a lower circulating
  water flow rate and a higher range than a once-through system" (EPRI TR-052907).
- Rise is set by flow: "the range is inversely proportional to the circulating water flow rate" (EPRI TR-052907, Eq. 3-1).
- Real once-through units, gas steam, seawater: 14.4 to 30.1 °F, 8 to 16.7 K (EPRI TR-052907 tables, section 4).
- Merrimack, coal, river: designed ΔT 23.04 °F, 12.8 K. Measured mean discharge over intake in summer, 15.9 to 16.9 °F, 8.8 to 9.4 K (EPA Attachment D).
- Polish 200 MW unit, 8 to 11 °C water: measured 5.6 to 8.5 K at 140 to 225 MW (Laskowski, own subtraction).
- A permit may cap the rise: a design above the permissible rise needs supplemental cooling (TM 5-811-6).

**Own inference.**

- The issue's 8 to 12 K sits inside every sourced range, for both circuit types. It can be called sourced now.
- **The issue's two figures contradict each other at this heat load.** At 273 MW a rise of 8 to 12 K needs 5400 to 8200 L/s. 9000 to 12 000 L/s means a rise
  of 5.4 to 7.3 K. See section 4 for where each comes from.
- Today's 18 K at 3600 L/s is above the handbook band of 13.9 K. One real figure comes near: Stryker Creek in summer at 17.3 K with reduced flow (section 4).
  Scattergood 1 at 16.2 K is the highest full-load table value in the class.

## 2. Terminal temperature difference

**Sourced.**

- Definition: steam saturation temperature minus outlet water temperature (MIL-HDBK-1003/7; EPRI TR-112819).
- Design: outlet "5 degrees F (2.8 degrees C) to 10 degrees F (5.6 degrees C) lower than ts". "The HEI Conditions limits the minimum terminal temperature
  difference that can be used for condenser design to 5 degrees F (2.8 degrees C)" (MIL-HDBK-1003/7, citing HEI 1970).
- EPRI: 7 °F, 3.9 K, is "a typical design point for power plant surface steam condensers" (TR-052907). About 5 to 10 °F (EPRI 1025068, LWR context).
- The relation: Tsat − Tin = rise + TTD. "Economical design" puts Tsat − Tin at 20 to 30 °F, 11 to 17 K (MIL-HDBK-1003/7).
- The trade: "a higher circulating water flow gives a lower range, a higher TTD and a lower cost condenser" with more pumping cost. "Smaller TTD's" need larger, costlier condensers
  (EPRI TR-052907).
- As a diagnostic: back pressure rise with fouling or air raises TTD, and a high TTD with normal rise points at fouling (EPRI TR-112819).
- ε form: ε = (t2o − t2i)/(ts − t2i) = 1 − exp(−NTU), NTU = UA/(ṁ·cw) (Laskowski, Eqs. 5 and 6). **This is exactly the form proposed for #82.**

**Own inference.** ε = rise/(rise + TTD). The sourced rise and TTD bands then give ε from about 0.50 (5.6 + 5.6 K) to 0.83 (13.9 + 2.8 K).

## 3. Overall coefficient U

**Sourced.**

- HEI: U = U1 × FW × FM × FC. U1 is the uncorrected coefficient set by tube velocity and diameter; FW is water inlet temperature; FM tube material and gauge; FC cleanliness
  (EPRI TR-112819). The handbook writes U = C·√V·C1·C2·Cf (MIL-HDBK-1003/7 §7.2.9).
- HEI as a formula, W/m²K, with do in mm and w in m/s: U = 6.47878·(441.325 − do)·√w·cT·cM·cF (Laskowski, Eq. 7). cT is about 1 at 21 °C; the printed fit is hard to read, and on our reading gives 0.82 at 10 °C.
- Figure 30 of the handbook: C1 about 0.85 at 50 °F (read by eye). C2 at 18 BWG: Admiralty 1.0, aluminium brass 0.96, 90-10 Cu-Ni 0.90, 70-30 Cu-Ni 0.83, 304 stainless 0.58. The √V
  chart runs from 3 to 8 ft/s, 0.9 to 2.4 m/s. Its label for 7/8 and 1 inch tubes prints as C = 253, but the curve reads about 740 at 8 ft/s, which is C = 263. Laskowski's formula gives 262.
- Velocity: normal 6 to 8 ft/s, 1.8 to 2.4 m/s; over 8 is seldom used (MIL-HDBK-1003/7). 6 to 9 ft/s, with 7 for Admiralty, 8 for most alloys, 9 to 9.5 for stainless in fresh water (TM 5-811-6, Table 3-12).
  "Lower velocities are inefficient from a heat transfer point of view" (TM 5-811-6). So about 2 m/s is right.
- Cleanliness: design usually around 85%, sometimes 95% (EPRI TR-112819). 70 to 95%; 0.85 for copper alloy tubes, 0.90 for stainless (MIL-HDBK-1003/7). EPRI's real units: 85 to 95%.
- ASME method: a single-tube coefficient from three resistances, water film, wall and shell film. The water film uses the Rabas-Cane correlation, which has V to the −0.835 (EPRI TR-112819, Eq. 2-5, badly extracted).
  So the two standards disagree in form: HEI has V^0.5 on the whole of U, ASME V^0.835 on the water film only.
- Steam load: HEI's formula has no load term. "There is much evidence that the design cleanliness factor varies with load" (EPRI TR-112819, citing Putman and Hornick). The same holds for the ASME
  performance factor. The Russian Berman formula does have a steam load factor Фδ (Vodeniktov). Its expression was not found.
- Limits of the methods: the HEI correction stops at 48.9 °C (Vodeniktov). A Metropolitan-Vickers formula, also with √w, worked poorly at 0.7 to 0.9 m/s (Vodeniktov, 25 MW, degraded vacuum).
- HEI "assume[s] constant thermal conditions along the tube length and uniform steam distribution"; CFD on three real condensers predicted up to about 18 mbar above measurement on one, and could not reach Stryker Creek's design pressure (EPRI TR-109725).
  A tube change from Admiralty to stainless raised predicted pressure by up to 8 mbar on the same unit.

**Own inference.**

- U at 10 °C, 2 m/s, 1 inch tube, FC 0.85. Base: 6.47878 × 415.9 × √2 = 3811 W/m²K. Then × 0.82 to 0.855 × 0.85 gives **2660 to 2770 W/m²K** for Admiralty, and × 0.90 gives 2390 to 2490 for 90-10 Cu-Ni.
  304 stainless at the handbook's 18 BWG would be far lower, but stainless is normally thinner and that gauge was not given.
- Real U worked back from EPRI's data, own arithmetic. Design: 3360 to 3850 W/m²K, for water at 32 to 36 °C (FW about 1.1). Measured summer: 2310 to 3790. That spread is the gap between a design sheet and a field reading.
- Velocity exponent from a resistance split. Dittus-Boelter at 2 m/s, 15 °C, 22.9 mm bore gives about 6560 W/m²K, or a water share of 45 to 53% of the total resistance. This correlation is textbook knowledge, not read here. It
  implies U ∝ V^0.36 to 0.42 for the V^0.8 film. That sits a little below HEI's 0.5.
- Laskowski's five points do **not** test the exponent: flow was 8049 to 8244 kg/s throughout. They test ε against load only.
- UA scaling with the valve: **UA = UA_design × (ṁ/ṁ_design)^0.5.** It is the HEI law, and the only sourced one. It holds on the HEI chart down to 0.9 m/s, about 46% of a 2 m/s design flow. Below that it is extrapolation.
- Load: ε on the Polish unit runs 0.54 to 0.59 from 62 to 100% load, at nearly constant flow. Own NTU 0.78 to 0.89. The trend with load is small, and part of it is colder water at the low end. So no load term is needed down to about 60% load.

## 4. Flow and surface for real units

**Sourced, and own conversion to SI.** Flow, MWe, heat duty and temperatures are the sources'. Heat per MWe, L/s per MWth, ε and UA are own arithmetic. UA = −ln(1 − ε)·ṁ·cp, with cp 4.18.

| Unit | Class | MWe | Flow L/s | L/s per MWe | Heat MW | Heat per MWe | L/s per MWth | Water in °C | Rise K | TTD K | Pressure mbar | ε | UA MW/K | UA per MW heat | Water per steam kg/kg |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Polish 200 MW, measured | fuel and water source not stated, quality 0.92 to 0.94 | 225 | 8104 kg/s | 36 | 287 | 1.28 | 28 | 10.6 | 8.5 | 6.1 | 32 | 0.58 | 29.5 | 0.103 | 64 |
| same | same | 140 | 8049 kg/s | 58 | 189 | 1.35 | 43 | 7.9 | 5.6 | 4.7 | 21 | 0.54 | 26.4 | 0.140 | 98 |
| Alamitos 1 | gas steam, seawater | 163 | 4322 | 27 | 247 | 1.52 | 17.5 | 17.2 | 13.7 | 4.4 | 57 | 0.76 | 25.4 | 0.103 | 39 |
| Haynes 1 | gas steam, seawater | 222 | 5609 | 25 | 252 | 1.14 | 22.3 | 16.7 | 10.8 | 5.7 | 51 | 0.65 | 24.8 | 0.099 | 49 |
| Scattergood 1 | oil and gas steam, seawater | 189 | 4921 | 26 | 334 | 1.77 | 14.7 | 15.6 | 16.2 | 7.2 | 71 | 0.69 | 24.2 | 0.072 | 33 |
| South Bay 3 | gas steam, seawater; plant data | 210 | 6836 | 33 | 275 | 1.31 | 24.8 | 17.2 | 9.4 | 6.3 | 51 | 0.60 | 26.1 | 0.095 | 55 |
| Encina 1 † | gas steam, seawater | 107 | 3028 | 28 | 157 | 1.47 | 19.3 | 19.3 | 12.4 | 3.9 | 58 | 0.76 | 18.1 | 0.116 | 43 |
| Redondo 5 † | gas steam, seawater | 175 | 4542 | 26 | 256 | 1.47 | 17.7 | 17.2 | 13.5 | 3.9 | 54 | 0.78 | 28.4 | 0.111 | 39 |
| Huntington 1 † | gas steam, seawater | 215 | 5300 | 25 | 278 | 1.29 | 19.1 | 17.2 | 12.6 | 3.9 | 53 | 0.76 | 31.9 | 0.115 | 42 |
| Potrero 3 † | gas steam, seawater | 207 | 9905 | 48 | 407 | 1.97 | 24.3 | 15.6 | 9.8 | 3.9 | 41 | 0.72 | 52.2 | 0.128 | 54 |

† TTD is exactly 7.0 °F. EPRI states it assumed this at Contra Costa; the † rows look the same, and Encina and Redondo also have exactly 5000 Btu/kWh of heat. **Treat their ε and UA as resting on an assumption, not on a measurement.** South Bay's values
come from Unit 3 at full load, "provided by the plant", and were then assumed for its other units; the capacity and flow differ from the source's Table 2-1. EPRI's summary table also gives slightly different flows for some units (72 000 against 68 500 gpm at Alamitos 1).

Larger units, for U and area (EPRI TR-109725; rise, TTD, ε, U are own arithmetic from its tables):

| Unit | Class | Surface m² | Heat MW | Flow m³/s | Water in °C | Pressure mbar | Rise K | TTD K | ε | U W/m²K | m² per MW heat |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Monticello 1, design | lignite, 565 MW, single pass | 19 510 | 762 | 21.3 | 35.6 | 130 | 8.6 | 7.0 | 0.55 | 3660 | 25.6 |
| Martin Lake 2, design | lignite, 750 MW, single pass | 29 265 | 996 | 30.8 | 32.2 | 105 | 7.7 | 6.7 | 0.54 | 3360 | 29.4 |
| Stryker Creek 2, design | gas, 520 MW, single pass | 17 652 | 690 | 14.5 | 35.0 | 135 | 11.4 | 5.5 | 0.67 | 3850 | 25.6 |
| Stryker Creek 2, summer measured | same | 17 652 | 694 | 9.6 | 22.7 | 107 | 17.3 | 7.2 | 0.71 | 2790 | 25.4 |

Other facts.

- Merrimack 1, coal, 120 MW: maximum design intake 85 MGD, 3724 L/s; 3.79 m³/s reported; 69.1 MGD, 3030 L/s, as maximum full power discharge. Unit 2, 350 MW: 202 MGD, 8850 L/s (EPA; own conversion). Merrimack 1 is 25 to 32 L/s per MWe.
- Handbook Table 15, 100 MW: 48 180 ft², 4476 m², with 79 418 gpm, 5010 L/s, single pass; 65 096 ft², 6047 m², with 53 650 gpm, 3385 L/s, two pass. Basis: Admiralty, 85 °F water, 2.5 in Hg, cleanliness 85%, 6.5 ft/s.
- Ratio: "A condenser uses 75 to 100 pounds of circulating water per pound of steam condensed" (TM 5-811-6).
- Single pass for a large source and low head, two pass for a limited one (TM 5-811-6). Once-through is often one pass, closed loops multi pass (HEI 113). Tube length 32 to 44 ft, 10 to 13 m, for 100 000 to 500 000 ft² (MIL-HDBK-1003/7).
- California gas steam units of 100 to 200 MW list 411 to 526 gpm/MW, 26 to 33 L/s per MWe; the fleet's outlier is Potrero, 720. Nuclear 720 to 761 (EPRI TR-052907, Table 2-1).
- Heat load rule: 950 Btu/lb for non-reheat, 980 for reheat (MIL-HDBK-1003/7).

**Own inference.**

- **Per MWe figures mislead here.** This plant rejects 273/131 = 2.1 MW of heat per MWe. The real units reject 1.1 to 2.0. At 26 to 33 L/s per MWe, 131 MWe would need 3400 to 4300 L/s. That is why 3600 L/s looks normal, and why it leaves an 18 K rise.
- **Per MW of heat there are two sourced clusters.**
  - Warm seawater units: 15 to 25 L/s per MWth, 33 to 55 kg/kg, rises of 9 to 16 K. For 273 MW that is 4000 to 6800 L/s.
  - Cold-water Polish unit, and TM's rule: 28 to 43 L/s per MWth, 64 to 98 kg/kg, rises of 5.6 to 8.5 K. For 273 MW at the 28 of full load, 7700 L/s.
- **The only sourced route to the issue's 9000 to 12 000 L/s is TM's ratio.** Only the vapour share needs cooling, about 113 kg/s of the 171. 113 × 75 to 100 = 8500 to 11 300 L/s, with a rise of 5.8 to 7.7 K. So the figure is not wrong. It is the rule for a dry exhaust and a small rise, at the top of the range.
  It is also the flow of real units of about 300 MWe (Encina 4 at 287 MW, 12 600 L/s; Alamitos 3, 8170 L/s; Merrimack 2, 8850 L/s) or one outlier, Potrero. `design-basis.md` says a 200 MWe circuit is larger than 3600 L/s; the sources back that in L/s.
- Handbook check: U = 263 × √6.5 × 1.075 (C1 at 85 °F, read by eye) × 0.85 = 3480 W/m²K for the 100 MW single pass unit. Then NTU 0.74, ε 0.525, rise 6.9 K, TTD 6.2 K and 144 MW of heat. That heat is 1.44 per MWe, in line with Encina, so the table and the U method agree.
- Surface: 25 to 29 m² per MW of heat on hot-water units. 4476 m² for 144 MW is 31 m² per MW. No real unit of 100 to 200 MWe with cold water and a published surface was read.

## 5. Design vacuum for 10 °C water

**Sourced.**

- Handbook Table 13: at 50 °F, 10 °C, 1.0 in Hg, 33.9 mbar, with ts − t1 of 29 °F, 16 K. At 55 °F: 1.0 to 1.25 in Hg, 34 to 42 mbar (MIL-HDBK-1003/7).
- EPA: 55 °F gives 1.5 in Hg, 51 mbar, and 95 °F gives 3.5 in Hg, in "a typical surface condenser" (Phase I TDD, citing Woodruff 1998). Calvert Cliffs: 2.0 in Hg at 70 °F.
- Measured: 21 to 32 mbar with 8 to 11 °C water (Laskowski). Morro Bay, 13.3 °C: 1.14 in Hg, 39 mbar; Moss Landing 1, 13.4 °C: 1.31 in Hg (EPRI TR-052907).
- Design is for the maximum expected water temperature, not the mean (MIL-HDBK-1003/7; EPRI TR-052907). A plant that has 10 °C in winter would design for more.
- Upper limits: not over 4 in Hg at the design wet bulb, alarm at 5 in Hg, 169 mbar (MIL-HDBK-1003/7).

**Own inference.** **Design vacuum at 10 °C is about 30 to 34 mbar.** The EPA curve's 51 mbar at 13 °C is above the rest and fits worse. The sim's constant 10 °C has no seasons, so the design and operating water temperature are the same.

## 6. Air in-leakage and blanketing

**Sourced.**

- Total pressure is steam plus air: Pc = Ps + Pa (TM 5-811-6; HEI 113). The gases also "blanket the outer surface of the tubes" and "severely decrease the heat transfer" (HEI 113).
- **The one simple figure:** Henderson and Marchello, H = 1/(1 + 0.51·Y), Y being mole percent gas in vapour, H the ratio of shell-side film coefficient to its Nusselt value (EPRI TR-112819, Figure 2-3, read from the page). So 0.66 at 1%, 0.50 at 2%, 0.28 at 5%. It is shell film only, not U.
- "As little as 1% of air could have a very substantial effect" (Silver, in EPRI TR-112819).
- EPRI's caveat: blanketing concentrates on local tube groups, so "it is difficult to apply with confidence the Henderson factors". Fouling and air cannot be separated by calculation.
- Normal air removal keeps gas at a level that does not affect performance. Limits: ASME table, one shell, 1 to 2 million lb/h of exhaust, 3.75 SCFM. Westinghouse, 1 SCFM per 100 MW (EPRI TR-112819).
- Two regimes: above the exhauster's capacity, back pressure rises. An SJAE "break": a jet designed for 1.0 in Hg rises to 4 to 5 in Hg with a moderate excess. A liquid ring pump takes 43% more air for 25% more suction pressure (EPRI TR-112819).
- "The condenser operating pressure will rise to the level of the venting system" (EPRI TR-112819).
- At low load and cold water "condenser absolute pressure is determined more by air leakage and air removal capacity than by steam condensing", and blanketing can subcool the condensate (HEI 136).
- Design allows for air: the U design value has to take residual leakage into account (EPRI TR-112819).
- Tube plugging: consider action at 10 to 12% of tubes plugged (HEI 122).

**Own inference.** A crude split of our U: clean 3125 W/m²K is 3.20e-4 m²K/W, water 1.69e-4, wall 0.12e-4, leaving 1.39e-4 for the shell. That is a residual, so it is rough. At Y = 1, 2 and 5%, U falls to about 82, 69 and 48%.

## 7. Turbine bypass into the condenser

**Sourced.**

- Capacity: 30 to 100% of MCR, and below 40% is "not recommended" (PowerGen slides). North American fossil usually 30%; Benson once-through boilers in Europe, South Africa and Japan 100% (CCJ).
- Route: valve, desuperheating, then a "dump tube (sparger)" at the condenser inlet (CCJ; Power Engineering). A multi-orifice header is one form (US 6,481,208). Spray water from the condensate pump discharge for the leg to the condenser (Power Engineering).
- Spray adds mass. On a combined cycle, about 20% at each of two stations, so the system must handle up to 140% of full-load turbine flow, and the condensate pumps too (CCJ).
- Spray droplets must evaporate before the steam reaches the condenser (US 9,593,598).
- HEI Tech Sheet 140, 2016: a guideline maximum of 1225 Btu/lb, 2849 kJ/kg, with superheat in a 25 to 75 °F range. Minimum 25 °F is "the primary concern, to ensure damaging wet steam never enters the condenser". Above 1225 only if needed for that superheat; "absolute maximum" 1250 Btu/lb, 2908 kJ/kg. Conditions agreed with the manufacturer.
- Older wording, HEI §5.4.2 **as quoted in CCJ**, not seen in the Standard: 1200 to 1225 Btu/lb, except 1190 Btu/lb, 2768 kJ/kg, for high-flow dumps. EPRI defines high flow as over 20 000 lb/h, 2.5 kg/s (CCJ).
- US 9,593,598: under 250 psia, 17 bar, and under 1225 Btu/lb before the condenser.
- Example: about 1200 Btu/lb at the condenser inlet (Power Engineering).
- The other school: the world outside North America dumps saturated steam of about 90% quality, to imitate turbine exhaust. CCJ calls the HEI worry "overblown". It says superheated dump steam has a lower coefficient and higher velocity, cost vacuum on condensers sized for 100% turbine load, and hammered the tubes near the dump inlet. It is a trade press opinion against a standard.
- Nuclear plants dump saturated steam, which "avoids many of the design challenges" (CCJ).

**Own inference.** IF97, throttling at constant enthalpy, no spray.

| Boiler | h kJ/kg | Btu/lb | At 40 mbar | At 100 mbar | Heat to remove at 40 mbar, kJ/kg | Latent used today | Error |
|---|---|---|---|---|---|---|---|
| 165 bar | 2565 | 1103 | 34.7 °C, 5.7 K superheat | x = 0.992 | 2443 | 2432 | 0.4% |
| 100 bar | 2725 | 1172 | 120 °C | 120 °C | 2604 | 2432 | 6.6% |
| 30 bar | 2803 | 1205 | 160 °C | 160 °C | 2682 | 2432 | 9.3% |
| 10 bar | 2777 | 1194 | 147 °C | 147 °C | 2656 | 2432 | 8.4% |

- This agrees with ADR 0028 and the issue: under 1% at 165 bar, about 8% at 10 bar.
- **Saturated steam never passes 1205 Btu/lb, so it never breaks HEI's 1225.** It breaks the older 1190 between about 8 and 73 bar, at any bypass flow above 2.5 kg/s.
- **At 165 bar this plant has the reverse of the usual problem.** No spray is needed, but the steam arrives near saturation: 5.7 K of superheat at 40 mbar against HEI's 14 K, and slightly wet at 100 mbar. It matches the overseas practice and the nuclear one, not HEI.
- The energy of the stream is its boiler enthalpy. Spray from the condensate only recirculates water. It adds mass, not net heat, so the condenser load is m·(h_boiler − hf). A model with no spray is correct for heat and short on neck flow.

## 8. Part load at constant cooling water flow

**Sourced.** Measured, Polish 200 MW, nearly constant flow (Laskowski, Table 1; heat, rise and TTD are own arithmetic).

| MW | Steam kg/s | Heat MW | Water in °C | Rise K | TTD K | Tsat °C | mbar | ε |
|---|---|---|---|---|---|---|---|---|
| 140 | 82.0 | 189 | 7.91 | 5.6 | 4.7 | 18.3 | 21 | 0.54 |
| 160 | 90.5 | 208 | 10.14 | 6.0 | 4.2 | 20.4 | 24 | 0.59 |
| 180 | 101.2 | 231 | 8.67 | 6.8 | 5.6 | 21.1 | 25 | 0.55 |
| 200 | 112.6 | 256 | 8.82 | 7.6 | 5.9 | 22.3 | 27 | 0.56 |
| 225 | 127.4 | 287 | 10.56 | 8.5 | 6.1 | 25.2 | 32 | 0.58 |

- Pressure falls with load, because the outlet temperature falls with less steam. Their model, with ε taken from a reference point and an ideal-gas saturation line, matched measurement to within 3% in pressure and about ±1 °C over a year of data.
- There is "an equilibrium back pressure" for given duty, water flow and inlet temperature (EPRI TR-112819). For a given water flow, the inlet temperature determines the operating pressure (HEI 113).
- At constant flow the rise stays constant when inlet temperature changes (EPA Phase I TDD). Once-through units can throttle flow by variable-speed pumps, which raises the range and the condensing temperature (same).
- Low load: CFD for Stryker Creek at 25% load, 35 °C water. Predicted 77 mbar at design flow and 81 mbar at reduced flow, against 51 mbar on the load heat balance. The model's air offtake was about 75 mbar, so **the floor came from the air system** (EPRI TR-109725). HEI 136 says the same.
- A half condenser limits load to 50 to 65% (MIL-HDBK-1003/7). Cold water can be too cold: too low a back pressure adds moisture and may stop paying (EPA Phase I TDD).
- Output: about 0.2 MW per mbar on a 300 MW unit at its design point (ABB).

**Own inference.** At constant flow and constant UA, rise and TTD both scale with heat, so Tsat − Tin ∝ Q. It is the plainest fit to the table above, and the ε trend is flat to within the scatter. The only figure below 60% load is the Stryker Creek one, and it is a model.

## What this means for the model

Everything in this section is **own inference**. cp = 4.18 as in `const.ts`. Saturation from IF97. 1 L/s is taken as 1 kg/s, as the code does.

### Plant class of the numbers

- Rise and TTD bands: generic fossil, plus California gas steam units (seawater, 15 to 19 °C).
- ε on a real cold unit: only the Polish 200 MW unit.
- Vacuum at 10 °C: handbook table and the Polish unit.
- U: HEI method, read through secondary statements.
- Bypass: combined cycle mostly, some fossil and nuclear remarks.
- Heat per kg: none. It comes from our own 0.66 exhaust, which no real unit has.

### Where 273 MW comes from

Check on the rated figure: quality 0.666 × hfg 2392 × 171 kg/s = 272 MW at 100 mbar. At 32 mbar the heat per kg barely changes, 1597 against 1593 kJ/kg, so Q is about 273 MW at any vacuum in the range. The vacuum changes output, not the heat.

### Two design points

Both use 10 °C water and land at about the same vacuum. **The vacuum at 10 °C is about 31 mbar either way. The choice mostly trades flow against surface.**

- **Design D:** EPRI's typical range and TTD, 20 °F and 7 °F, so rise 11.1 K and TTD 3.9 K.
- **Design L:** shaped on the measured Polish unit, rise 8.5 K and TTD 6.0 K.

Arithmetic for D at 273 MW:

- ṁ = Q/(cp·rise) = 273 000/(4.18 × 11.1) = 5884 L/s
- ε = rise/(rise + TTD) = 11.1/15.0 = 0.740
- NTU = −ln(1 − 0.740) = 1.347
- UA = 1.347 × 5884 × 4.18 = 33.1 MW/K
- Tsat = 10 + 15.0 = 25.0 °C, so 31.7 mbar. Handbook Table 13 gives 33.9 mbar at 50 °F.
- Check: Q = 0.740 × 5884 × 4.18 × 15.0 = 273 MW.

Same for the rest:

| Design | Heat MW | Flow L/s | Rise K | TTD K | ε | NTU | UA MW/K | UA per MW heat | Tsat °C | mbar | Area m² at 2700 W/m²K |
|---|---|---|---|---|---|---|---|---|---|---|---|
| D | 273 | 5884 | 11.1 | 3.9 | 0.740 | 1.347 | 33.1 | 0.121 | 25.0 | 31.7 | 12 300 |
| L | 273 | 7684 | 8.5 | 6.0 | 0.586 | 0.882 | 28.3 | 0.104 | 24.5 | 30.8 | 10 500 |
| D sized for | 230 | 4957 | 11.1 | 3.9 | 0.740 | 1.347 | 27.9 | 0.121 | 25.0 | 31.7 | 10 300 |
| L sized for | 230 | 6473 | 8.5 | 6.0 | 0.586 | 0.882 | 23.9 | 0.104 | 24.5 | 30.8 | 8800 |

Against real units at full load: rows with their own TTD give UA per MW heat of 0.072 to 0.103, and EPRI's design tables 0.094 to 0.099; † rows give 0.111 to 0.128. L sits at the top of the first group. D sits with the assumed rows.

**Tube check.** At 2 m/s and 22.9 mm bore, D needs 7140 tubes in parallel and L needs 9330. With 25.4 mm outside diameter, that is 21.5 m of tube for D and 14.1 m for L. Handbook length tops out at about 13 m. So **D is a two-pass condenser and L is close to a single pass.** One 12 m pass gives NTU about 0.75 and two give about 1.5. This fits the real figures: single pass units at ε 0.54 to 0.67, and the Polish unit at 0.54 to 0.59.
TM 5-811-6 and HEI 113 tie single pass to once-through. So L is the more natural once-through unit at 10 °C. D is the cheaper-water option.

### Off design: UA ∝ flow^0.5, constant ε with load

Fixed D or L condenser, sized for 273 MW, then other cases. Example for D at 3600 L/s, 273 MW:

- UA = 33.1 × √(3600/5884) = 25.9 MW/K
- NTU = 25 900/(3600 × 4.18) = 1.72, so ε = 0.821
- rise = 273 000/(3600 × 4.18) = 18.1 K
- Tsat = 10 + 18.1/0.821 = 32.1 °C, so 47.8 mbar. TTD 3.9 K.

| Case | Condenser | Heat MW | Flow L/s | Velocity m/s | UA MW/K | ε | Rise K | TTD K | Tsat °C | mbar |
|---|---|---|---|---|---|---|---|---|---|---|
| Today, perfect | none | 273 | 3600 | n/a | ∞ | 1 | 18.1 | 0 | 28.1 | 38.1 |
| Today, perfect | none | 230 | 3600 | n/a | ∞ | 1 | 15.3 | 0 | 25.3 | 32.2 |
| Heater lowers the load | D | 230 | 5884 | 2.0 | 33.1 | 0.740 | 9.4 | 3.3 | 22.6 | 27.5 |
| Heater lowers the load | L | 230 | 7684 | 2.0 | 28.3 | 0.586 | 7.2 | 5.1 | 22.2 | 26.8 |
| Full gas, valve limit, 200 kg/s | D | 319 | 5884 | 2.0 | 33.1 | 0.740 | 13.0 | 4.6 | 27.5 | 36.8 |
| Today's pump | D | 273 | 3600 | 1.22 | 25.9 | 0.821 | 18.1 | 3.9 | 32.1 | 47.8 |
| Today's pump | D | 230 | 3600 | 1.22 | 25.9 | 0.821 | 15.3 | 3.3 | 28.6 | 39.2 |
| Today's pump | L | 273 | 3600 | 0.94 | 19.4 | 0.724 | 18.1 | 6.9 | 35.0 | 56.4 |
| Today's pump | L | 230 | 3600 | 0.94 | 19.4 | 0.724 | 15.3 | 5.8 | 31.1 | 45.2 |
| Condenser built for 3600 at 2 m/s, ε of D | UA 20.3 | 273 | 3600 | 2.0 | 20.3 | 0.740 | 18.1 | 6.4 | 34.5 | 54.8 |
| same | UA 20.3 | 230 | 3600 | 2.0 | 20.3 | 0.740 | 15.3 | 5.4 | 30.7 | 44.1 |
| Today's pump, full gas | D | 319 | 3600 | 1.22 | 25.9 | 0.821 | 21.2 | 4.6 | 35.8 | 58.9 |
| Today's pump, full gas | L | 319 | 3600 | 0.94 | 19.4 | 0.724 | 21.2 | 8.1 | 39.3 | 71.0 |

Part load at design flow, D: 75% 25.3 mbar, 50% 20.0, 25% 15.7, 10% 13.6. L is within about 0.3 mbar of those at 50 and 25%.

Sensitivity to the exponent at 3600 L/s and 273 MW:

| Exponent | D, mbar | L, mbar |
|---|---|---|
| 0 | 43.4 | 46.0 |
| 0.4 | 46.8 | 53.7 |
| 0.5 | 47.8 | 56.4 |
| 0.8 | 51.6 | 67.3 |

### What follows

- **Today's 3600 L/s does not break.** A real UA adds 10 to 18 mbar over today's 38 at 273 MW. It stays far under the 327 mbar trip. At 230 MW it lands at 39 to 45 mbar, about today's rated vacuum. So the extraction heater and a limited exchanger roughly cancel at the same pump.
- **Keeping 3600 L/s means an 18 K rise at rated load, 15 K at 230 MW.** That is above the 13.9 K handbook band at 273 MW and just above it at 230 MW. Scattergood's 16.2 K and Stryker Creek's 17.3 K show it is a real but poor place to be. Discharge limits apply to a real plant; the sim has none.
- **The realism case for a bigger pump is the rise, not the vacuum.** To land inside 8 to 12 K, the pump needs 5400 to 8200 L/s at 273 MW, or 4600 to 6900 L/s at 230 MW.
- **The cost of each.** From IF97, the drop from 165 bar is 1015 kJ/kg at 31.7 mbar, 996 at 40, 981 at 47.8 and 970 at 54.8. So near 40 mbar output moves about 0.28 MW per mbar at 171 kg/s. 3600 L/s on D costs about 3 MW against today, on L about 5 MW. A 5900 L/s pump gains about 2 MW. ABB's 0.2 MW per mbar on a 300 MW unit is the same order.
- **9000 to 12 000 L/s is not needed.** It gives about 25 to 28 mbar and a rise of 5.4 to 7.3 K at 273 MW. Keep it only for fidelity to TM's ratio. The comment in `const.ts` and the row in `design-basis.md` should stop calling it the typical full circuit for this unit, or say which class it is.
- **A separate gap:** rated output in `design-basis.md` is derived at 100 mbar, and the plant runs far below it. It is outside this note.

### Things the model must handle

- **Formula:** Q = ε·ṁ·cp·(Tsat − Tin) is sourced as the condenser form (Laskowski). ε has one capacity rate, because the shell side is isothermal.
- **UA:** UA_d·(ṁ/ṁ_d)^0.5. With Tin fixed at 10 °C, FW can be folded into UA_d. No load term.
- **Low flow:** as ṁ → 0, UA → 0 but NTU → ∞, so ε → 1 and Q → ṁ·cp·ΔT. That is today's formula, which stays well-behaved, and zero flow gives zero Q. Below about 46% of a 2 m/s design flow the law is extrapolated, and it is not clear that real tubes hold it. Laminar flow is far below this.
- **What it changes:** at low heat `bypass-loop` holds about 15 mbar today. 20 kg/s of bypass, 49 MW, gives 14.6 to 16.5 mbar here. So little changes, and it stays over the 13 mbar `MaxVacuum`.
- **Air floor:** real plants at low load stop at the air system's limit (HEI 136; EPRI). The sim's `MaxVacuum` already acts as a floor. A hand figure for that floor at 10 °C water was not found.
- **Air:** the sim has no air inventory, so no Henderson factor. If gameplay wants it, one UA multiplier for a failed air system is honest about what it is; a figure of 0.7 for 2% gas comes from section 6, a crude estimate.
- **Fouling:** a cleanliness factor on UA is the natural operator-facing failure: design 0.85, range 0.70 to 0.95.
- **Outlet temperature:** cooling water outlet is no longer Tsat. `newOutletTemperature` is the condensate, which stays at Tsat. Cooling water outlet Tin + ε·(Tsat − Tin) is a new value, and the true rise and TTD can be shown on the board.
- **Condensate stays at saturation.** Sourced as a design spec (MIL-HDBK-1003/7, hotwell reheating). Subcooling grows at low load (EPRI TR-112819, HEI 136); leaving it out stays defensible.
- **Bypass heat:** m·(h_boiler − hf(Tsat)), no spray. Under 1% at 165 bar, 8 to 9% at 10 bar. It needs the pool to carry energy, which is the "tracked pool energy" option in #82 and ADR 0028. A cheaper way is to count bypass kg at h/hfg, which is not sourced.
- **Bypass limit:** real plants limit superheat and enthalpy, but a sim warning for HEI's limit has no bite at 165 bar. The plant's dump steam is wetter than HEI wants.
- **Bypass capacity:** a 200 kg/s bypass valve is above 100% of rated flow. That is the Benson class, not the 30% of North American fossil.
- **Snapshots:** every vacuum, Tsat, hotwell and output figure moves. ADR 0028's "39–40 mbar" goes too.
- **Design basis:** whichever flow is chosen needs a row. A flow above what a real unit needs would be an over-dimensioned utility; on these figures 3600 L/s is under-dimensioned on rise, not over.

### Open decisions for the owner

- Pump: keep 3600 L/s and accept a rise of 15 to 18 K; or resize. 4600 to 6900 L/s for 230 MW is inside the sourced rise.
- Heat load to size for: 273 MW today, or 230 MW after #88.
- Design: L (single pass, 7700 or 6500 L/s) or D (two pass, 5900 or 5000 L/s).
- Exponent: 0.5 (HEI) is the sourced one. 0.4 from the resistance split is defensible.
- Whether a fouling or air failure comes with this ticket, or later.
- Whether bypass enthalpy comes with this ticket. It is the piece that forces tracked pool energy, and the limited exchanger does not depend on it.

## UNVERIFIED

Seen in search extracts only, or not traced to a primary source. Not used for any figure above unless stated.

- EPRI 1007456 via EPA docket AR-333: 500 to 800 gpm/MW, once-through optimum at a 10 to 15 °F rise, constant 12 °F rise assumed. The link gave an HTML page.
- EPRI cooling overview on McIlvaine: once-through water warmed 15 to 30 °F; 250 000 gpm at 20 °F for a 500 MW plant. Scanned PDF.
- URS rule of thumb: about 600 000 gpm for 1000 MW.
- NRC extracts, all 403: Fermi 3, 16.2 °C rise at 155 000 m³/h; Seabrook, design 2.0 in HgA and about 390 000 gpm; U.S. EPR 790 000 gpm; Monticello nuclear, 399 000 ft², 7 ft/s, 249 585 gpm; Catawba back pressures. Note that the Monticello in EPRI TR-109725 is the Texas lignite unit, not this one.
- Pattanayak et al. (2019, ScienceDirect, 403): 14 600 m², 15 620 tubes, 27 000 m³/h, 127.5 kg/s, 10.13 kPa, plant rating not stated. It would be the only area figure near this size.
- A 2013 model comparison (Applied Thermal Engineering, 403): HEI "significantly overestimating the impact of coolant flow rate change". It would support an exponent below 0.5, as the resistance split does.
- A constant-effectiveness study (Applied Thermal Engineering 2019, 403): valid at all heat loads near design inlet temperature. It agrees with the Polish data.
- Merrimack Unit 1 at "about 8 MGD" in one search extract: not supported by the documents read, which give 69.1 and 85 MGD.
- A patent extract: air in-leakage below 25.1 SCFM does not affect back pressure, on one unit.
- A Scribd page on dump tubes: a 200 °F limit for spray curtains.
- HEI 9th edition addendum on turbine bypass, not read. Whether the 12th edition keeps 1225 and 1250 Btu/lb is not confirmed beyond the 2016 Tech Sheet.
- HEI §5.4.2 wording: known only through CCJ.
- The 263 for C: the handbook's label prints as 253. We read the curve and Laskowski's formula, not the Standard.
- Dittus-Boelter in the resistance split: textbook form, not read here.
- The † rows: their TTD and heat look assumed by EPRI. EPRI states this only for some plants.
- Own estimates: the shell-side resistance, the U at 10 °C, the two design points, every off-design row. U at 10 °C mixes a formula fit and a chart read by eye.

Not found, after searching:

- A 100 to 200 MWe condenser with cold water and published surface, flow, rise and TTD together.
- Any condenser with exhaust quality near 0.66.
- An HEI or ASME statement of how UA varies with flow in their own words.
- A measured test of U against tube velocity on a utility condenser. Laskowski's flow barely moved, and the EPRI cases mix design and field data.
- The expression of the Berman steam load factor Фδ.
- A measured part-load curve below 60% load.
- A simple figure for air against overall U rather than shell film.
- NRC FSAR condenser data for a unit near this size, in any form the search could read.
