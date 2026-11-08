# Economizer and flue gas: figures for the two-stage model

Frozen research record for #87. The boiler as built is in [plant/boiler.md](../plant/boiler.md) and
[plant/design-basis.md](../plant/design-basis.md); the air preheater question continues in #88.

**Later decision:** the grilling replaced the fixed approach with a boiler stage that has its own sized surface. The values
chosen are in [ADR 0029](../adr/0029-boiler-efficiency-from-flue-gas-heat-balance.md).

Web research, Nov 2026. Question: what do the sources say about the flue gas and the economizer of a gas-fired drum
boiler, so that the fixed `GasEfficiency` of 85% can follow from a heat balance? The decided model has two stages. Flue
gas leaves the boiler a fixed approach above the boiler water. The economizer is then a heat exchanger with a sized
surface, limited by Return flow and temperature. Efficiency is heat into the water over fuel LHV.

Sourced facts and our own inference are marked apart. Items not traced to a primary source are marked UNVERIFIED. PDF
text was extracted and read for every source called "read". Search snippets are not counted as read.

**The main limit of this note: almost every figure comes from industrial boilers.** The largest gas-fired unit read
makes 50 kg/s of steam (B&W example) and the plant makes 171 kg/s. No gas-fired utility boiler with published gas
temperatures was found. The utility figures here are for coal. None of the units with published gas temperatures has
saturation above about 254 °C.

## Sources

| Source | What it is | Strength | Read? |
|---|---|---|---|
| Ganapathy, *Industrial Boilers and Heat Recovery Steam Generators* (Marcel Dekker, 2003) ([PDF copy](https://www.xylenepower.com/Industrial_Boilers_and_Heat_Recovery_Ste.pdf)) | textbook by a boiler designer; packaged boilers about 100,000 lb/h (12.6 kg/s) | strong, industrial | yes |
| B&W, *Steam* 41st ed., Chapter 1 ([PDF copy](https://xylenepower.com/Steam_41_Steam_Generation_An_Overview_Th.pdf)) | OEM textbook; worked gas-fired example, 400,000 lb/h (50.4 kg/s) | strong, industrial | yes |
| DOE Steam Tip Sheets [#3](https://www.energy.gov/sites/prod/files/2014/05/f16/steam3_recovery.pdf), [#4](https://www.energy.gov/sites/prod/files/2014/05/f16/steam4_boiler_efficiency.pdf), [#26A](https://www1.eere.energy.gov/manufacturing/tech_assistance/pdfs/steam26a_condensing.pdf) | government guidance | medium, industrial | yes |
| [DOE Improving Steam System Performance Sourcebook](https://www1.eere.energy.gov/manufacturing/tech_assistance/pdfs/steamsourcebook.pdf) | government guidance | medium, industrial | relevant parts |
| [ORNL/TM-2001/263 Steam System Survey Guide](https://www.energy.gov/sites/prod/files/2014/04/f15/steam_survey_guide.pdf) | national lab guide | strong, industrial | relevant parts |
| [EPA ICI boiler GHG report (Oct 2010)](https://www.epa.gov/sites/default/files/2015-12/documents/iciboilers.pdf) | government | medium, industrial | relevant parts |
| [EPA-453/R-94-023, NOx from utility boilers (1994)](https://www3.epa.gov/airquality/ctg_act/199403_nox_epa453_r-94-023_utility_boilers.pdf) | government; the only utility boiler description read | strong for coal, no gas temperatures | relevant parts |
| [EPA AP-42 §1.4](https://www.epa.gov/sites/default/files/2020-09/documents/1.4_natural_gas_combustion.pdf), [EPA Method 19](https://www.epa.gov/sites/default/files/2017-08/documents/method_19.pdf) | government, regulatory | strong | relevant parts |
| [IS 14504:1998](https://law.resource.org/pub/in/bis/S11/is.14504.1998.pdf) | Indian adoption of ISO 6976:1995 | strong | Table 5 |
| [GREET heating value table](https://courses.grainger.illinois.edu/npre470/sp2018/web/Lower_and_Higher_Heating_Values_of_Gas_Liquid_and_Solid_Fuels.pdf) | Argonne model table, course copy | medium | yes |
| [Gasunie CO2 factor report for RVO, 2023](https://www.rvo.nl/sites/default/files/2023-10/CO2-emissiefactor-aardgas-Nederlandse-rapportage-en-ETS-%202023.pdf) | Dutch grid operator, measured | strong | yes |
| [IPCC 2006 Guidelines, Vol. 2 Ch. 1](https://www.ipcc-nggip.iges.or.jp/public/2006gl/pdf/2_Volume2/V2_1_Ch1_Introduction.pdf) | IPCC default values | strong | Table 1.2 |
| [Riley Power RPI-TP-0232, coal to gas conversion (2013)](https://www.babcockpower.com/wp-content/uploads/2018/02/challenges-when-converting-coal-fired-boilers-to-natural-gas.pdf) | OEM paper; five boilers, 150,000 to 325,000 lb/h | medium, industrial | yes |
| [Bosch boiler-planning.com](https://www.boiler-planning.com/en/efficiency/increasing-combustion-efficiency/) | OEM page, shell (fire tube) boilers; states no source | medium, industrial | yes |
| [Cleaver-Brooks CBLE Boiler Book](https://rfmacdonald.com/wp-content/themes/skt-naturo-pro/pdf/CBLE%20Boiler%20Book%202017.pdf) | OEM data, fire tube | medium, small units | Table 10 |
| [CARB stack loss worksheet (2011)](https://ww2.arb.ca.gov/sites/default/files/cap-and-trade/allowanceallocation/boiler_efficiency_calc.pdf) | regulator's method, named after ASME PTC 4 | medium | yes |
| [NRCan natural gas stack losses](https://natural-resources.canada.ca/energy-efficiency/industry-energy-efficiency/stack-losses-natural-gas) | government guidance | medium | relevant parts |
| [Åström and Bell, Drum-boiler dynamics, Automatica 36 (2000)](http://www.dei.unipd.it/~picci/Files/TEACHING/CONTROLLO_DEI_PROCESSI/DrumBoiler.pdf) | peer-reviewed; a 160 MW Swedish unit | strong, no economizer data | relevant parts |
| [Kim and Choi, KOSCO symposium 2015](https://koreascience.kr/article/CFKO201531751940301.pdf) | abstract, coal CFB 300 MWe, Korean text | medium, wrong fuel | Table 1 |
| [B&W V-Temp paper BR-1861](https://www.babcock.com/assets/PDF-Downloads/White-Papers/The-V-TempTM-Economizer-System-and-Method-for-SCR-Temperature-Control-BR-1861.pdf) | OEM paper, coal utility units | medium | abstract |

Not read: ASME PTC 4, EN 12952-15, ISO 6976:2016 (paywalled), B&W *Steam* Chapters 20 and 26, Singer's *Combustion
Fossil Power*, EPRI reports.

## 1. Natural gas: is 35 000 kJ/m³ a lower heating value?

**Sourced.**

- Pure methane, ideal gas (IS 14504 Table 5, MJ/m³, written combustion/metering temperature):

  | Reference | Gross (HHV) | Net (LHV) |
  |---|---|---|
  | 0/0 °C | 39.840 | 35.818 |
  | 25/0 °C | 39.735 | 35.808 |
  | 15/15 °C | 37.706 | 33.948 |

- GREET natural gas at 32 °F, 1 atm: LHV 983 Btu/ft³, HHV 1089 Btu/ft³, or 47.141 and 52.225 MJ/kg. Converted: 36.6 and
  40.6 MJ/m³.
- AP-42: gross value about 1,020 Btu/scf, "usually varying from 950 to 1,050". That is 38.0 MJ/m³ (35.4 to 39.1) at
  the US standard of about 15.6 °C.
- CARB's assumed gas (95% CH₄, 2% N₂): HHV 1022.71 Btu/ft³. ORNL's example gas: 987 Btu/ft³.
- Measured Dutch gas, Gasunie 2023 table, average gross value per grid area: G-gas about 35.2 to 36.1, H-gas about 40.5
  to 41.6. The note works in MJ/m³(n). The column header carries no unit.
- IPCC default net value for natural gas: 48.0 TJ/Gg (46.5 to 50.4).
- HHV/LHV ratio: 1.108 for both GREET's gas and Ganapathy's gas (23,789 and 21,462 Btu/lb).

**Own inference.**

- 35.0 MJ/m³ fits an LHV per normal cubic metre for methane with about 2% inerts: 35.8 × 0.98 = 35.1.
- The same 35 MJ/m³ is also the **gross** value of Dutch G-gas. So the number alone proves nothing.
- The code comment says only "approximate energy density". Nothing in the repo states a basis or a reference condition.
- This is an owner decision, not a finding. Reading it as LHV at 25/0 °C keeps 420 MW and is well inside the data.
  Reading it as HHV gives 35.0 / 1.108 = 31.6 MJ/m³ and 379 MW.

## 2. Combustion

**Sourced.**

- Stoichiometric air, methane: 9.528 ft³ per ft³, 17.265 lb per lb (Ganapathy Table 6.3). Natural gas: A = 730 lb of air
  per MMBtu fired, on HHV (Table 6.4).
- EPA Method 19 F factors for natural gas, at zero excess air, on gross heat input: Fd 8,710 dscf/MMBtu, Fw 10,610
  wscf/MMBtu (2.34 and 2.85 × 10⁻⁷ m³/J).
- Excess air:
  - DOE Tip Sheet #4: "On well-designed natural gas-fired systems, an excess air level of 10% is attainable."
  - NRCan: "about 10 % excess air at full load, perhaps 30 % excess air at 20 % of full load".
  - Riley: 10 to 11.7% on gas after conversion, all five boilers.
  - Ganapathy: 10 to 15%, with 15% common for NOx reasons. Tables 1.8 and 3.4 go to 30% at 25% load.
  - EPA-453/R-94-023 gives no figure for gas-fired utility units. Utility excess air on gas: **not found**.
- Flue gas analysis at 15% excess air (Ganapathy Table A6a, vol%): CO₂ 8.29, H₂O 18.17, N₂ 71.08, O₂ 2.46.
- Flue gas mass:
  - Table 3.4, 100% load: 125,246 lb/h, with duty 118.71 MMBtu/h at 92.73% LHV.
  - Table 6.7: 20.9 lb per lb of fuel at 15% excess air, LHV 21,462 Btu/lb.
- Specific heat of natural gas flue gas at 15% excess air (Table A6a, Btu/lb·°F, converted to kJ/kg·K):

  | Temperature | cp |
  |---|---|
  | 400 °F (204 °C) | 0.2757 (1.154) |
  | 800 °F (427 °C) | 0.2907 (1.217) |
  | 1200 °F (649 °C) | 0.3059 (1.281) |
  | 2000 °F (1093 °C) | 0.3326 (1.393) |

- Enthalpy of the same gas (Table A7b, Btu/lb): 37.1 at 200 °F, 147.9 at 600 °F, 264.9 at 1000 °F. Ganapathy also gives
  0.26 to 0.27 Btu/lb·°F (1.09 to 1.13 kJ/kg·K) as the mean for stack loss work (Q6.19a).
- Adiabatic temperature:
  - Ganapathy Table 4.2: "Combustion temp" 3227 °F (1775 °C) for natural gas, 15% excess air, no recirculation. He
    says the real value is 3 to 5% under the adiabatic one (Q6.15).
  - B&W Chapter 1: flue gas "at perhaps 3600F (1982C)", with air preheated to 299 °C.

**Own inference: flue gas per MW of LHV.**

| Route | Arithmetic | kg/s per MW | At 420 MW |
|---|---|---|---|
| Table 3.4 | 15.78 kg/s ÷ (118.71 / 0.9273 = 128.0 MMBtu/h = 37.51 MW) | 0.4207 | 176.7 kg/s |
| Table 6.7 | 20.9 ÷ 49.92 MJ/kg | 0.4187 | 175.8 kg/s |
| Table 6.3, pure methane | (1 + 1.15 × 17.265) ÷ 50.06 MJ/kg | 0.4165 | 174.9 kg/s |

The hand check uses **176.7 kg/s at 15% excess air**, because the enthalpy table is for that same gas. That is 14.7 kg of
flue gas per m³ of gas at 35 MJ/m³. At 10% excess air it is 176.7 × (1 + 1.10 × 17.265) / (1 + 1.15 × 17.265) = 169.4 kg/s.

Adiabatic check: 50,060 kJ/kg ÷ 20.86 kg/kg = 2,400 kJ/kg = about 1,030 Btu/lb. Extrapolating Table A7b past 3000 °F
gives about 3,290 °F (1,810 °C), without dissociation. That agrees with Ganapathy's 1775 °C.

## 3. Flue gas leaving the boiler, and furnace exit

**Sourced: gas temperature above the water in the last boiling section.**

| Unit | Steam | Saturation | Gas leaving boiling surface | Approach | Note |
|---|---|---|---|---|---|
| Ganapathy Table 3.2, boiler 1 | **saturated**, 300 psig, 12.6 kg/s, gas, 10% excess air | 217 °C | 683 °F (362 °C) | **145 K** | has economizer, exit 315 °F (157 °C) |
| Ganapathy Table 3.2, boiler 2 | same, about 10% more surface | 217 °C | 611 °F (322 °C) | **105 K** | same efficiency, exit 315 °F |
| Ganapathy Table 3.4, 100% load | 500 psig, 750 °F | 244 °C | 739 °F (393 °C) | 149 K | superheated |
| Ganapathy Table 3.4, 25% load | same | 244 °C | 525 °F (274 °C) | 30 K | see section 5 |
| B&W Ch. 1 example | 600 psi, 850 °F, 50.4 kg/s, gas | 254 °C | 760 °F (404 °C) | **150 K** | "the temperature difference between the saturated water and gas is only 270F (150C)"; air heater follows |
| Bosch shell boiler, 10 bar | saturated | 185 °C | about 245 °C | **60 K** | "normally roughly 60K above the temperature of the product inside the steam boiler" |
| DOE Tip Sheet #3 | any | – | stack | 56 to 83 K or more | "more than 100°F to 150°F higher than the temperature of the generated steam" |
| Unfired HRSG (Ganapathy Q8.34) | gas turbine exhaust | – | pinch | 8 to 17 K | 15 to 30 °F, not a fired boiler |

Ganapathy's Table 3.2 is the only water tube boiler with no superheater found with gas temperatures. It shows the approach
is a trade-off: two designs at the same efficiency sit 40 K apart. No approach figure was found above 254 °C saturation,
and no 165 bar unit without a superheater.

**Sourced: furnace exit gas temperature.**

- Ganapathy: 2235 °F (1224 °C) for the Table 3.4 unit (from his Fig. 3.12). 2364 and 2255 °F (1296 and 1235 °C) in
  Table 3.2. "A gas-fired flame has less luminosity than an oil flame, so the furnace exit temperature is higher."
- B&W Chapter 1: 2400 °F (1316 °C) at the furnace exit, with preheated air.
- Riley: furnace exit gas temperature usually rises on conversion to gas, as gas flame emissivity is lower.
- A furnace exit figure for a gas-fired utility unit: **not found**. The two-stage model does not need one.

**Utility context, coal (EPA-453/R-94-023 §3.3.3.5):** flue gas at "320 to 430 °C (600 to 800 °F) at the economizer exit".
That is after the economizer, with hot feedwater. Gas temperature entering a utility economizer: **not found**.

## 4. Economizer

### Stack temperature

**Sourced.** All industrial.

- Ganapathy Table 3.4: economizer exit gas 327 °F (164 °C) at 100% load, 254 °F (123 °C) at 25%, feedwater 230 °F.
  Table 1.8: 320 °F (160 °C) falling to 265 °F (129 °C). Table 3.2: 315 °F (157 °C).
- DOE Tip Sheet #26A Table 1: 350 to 550 °F (177 to 288 °C) for a boiler alone, 250 to 300 °F (121 to 149 °C) with a
  feedwater economizer.
- Bosch: "120 – 140°C, depending on the economiser design". With feedwater at 103 °C.
- B&W example: 310 °F (154 °C), through an air heater, not an economizer.

So about 160 °C is at the warm end of the range, not an extreme.

### Heat transfer coefficient

**Sourced.** All from Ganapathy.

- Bare tube economizer, worked: hi = 1500, ho = 12, fouling 0.001 each, U = 11.44 Btu/ft²·h·°F (**65 W/m²·K**). The gas side
  dominates: "the overall coefficient is close to the gas-side coefficient" (Q8.01).
- Finned, gas firing, on total finned area: 7.35 and 6.25 Btu/ft²·h·°F (**42 and 35 W/m²·K**) in Table 3.2. Q8.30 uses 8
  (45 W/m²·K). His bare tube example becomes 9.3 (53 W/m²·K) with fins.
- Water side about 1000 to 1500, gas side about 12 to 15 Btu/ft²·h·°F.
- Gas firing: "serrated fins at four to five fins per inch". Economizers are "generally of vertical gas flow and counterflow
  configuration", and "in economizers, usually a counterflow arrangement is adopted". F_T can be taken as 1.
- The effectiveness-NTU method for an economizer is worked in Q8.30. For counterflow:
  ε = (1 − exp[−NTU(1 − C)]) / (1 − C·exp[−NTU(1 − C)]), NTU = UA/Cmin, C = Cmin/Cmax, Q = ε·Cmin·(tg1 − tw1).
- Off-design: US_perf = US_design × (gas flow ratio)^0.65 (HRSG worked example, Q8.35a).

Design UA of a real unit (own arithmetic from Table 3.2, boiler 1): 7.35 × 8384 ft² = 61,600 Btu/h·°F = 32.5 kW/K. Gas side
capacity: 10.5 MMBtu/h ÷ (683 − 315) = 28,500 Btu/h·°F = 15.0 kW/K. So NTU on the gas side is about 2.2.

Economizer UA for a utility unit: **not found**.

### Approach to saturation: the 28 K

- UNVERIFIED wording: "feedwater temperature to the drum should normally be at least 50F (28C) below saturation
  temperature", to enhance circulation, with a note that some designs land slightly closer. Seen only as search extracts
  of a Scribd upload, "Chap 20 pdf". Scribd returned a browser challenge and the archive.org copies of *Steam* are
  lending-only, so **the text itself was not read**.
- Origin, likely: the [Steam 42 contents](https://www.babcock.com/assets/PDF-Downloads/Steam-42-Sample.pdf) (read) list
  Chapter 20 as "Economizers and Air Heaters". So the "unclear origin" is probably B&W *Steam*. That is inference. The
  page does not name its book.
- If the wording is right, the 28 K is a **design rule for natural circulation in the drum**, not a physical limit.

Verified around it:

- B&W Chapter 1: "By design, steam is usually not generated inside these tubes."
- Ganapathy Q8.41: steaming causes water hammer and vibration with downward flow. "With upward water flow design, a
  certain amount of steaming, 3–5%, can be tolerated", but "steaming should generally be avoided."
- Unfired HRSG approach point: 15 to 30 °F (8 to 17 K). Table 8.30 lists 23 to 51 °F.
- Packaged boiler: 500 psig saturation 470 °F, economizer exit 374 °F. So 96 °F (53 K) at full load, "and increases at
  lower loads" (Table 3.4).
- Why fired boilers don't steam (Ganapathy, Chapter 3 and Q8.41): gas flow "decreases in proportion to the water flow".

Own inference: the lumped vessel has no circulation for the rule to protect (ADR 0019). The rule still gives an honest cap.
At 165 bar it is 350 − 28 = 322 °C, labelled UNVERIFIED until Chapter 20 is read.

### Dew points and minimum inlet water temperature

**Sourced.**

- Water dew point of natural gas flue gas: "about 135°F" (57 °C), DOE #26A.
- Flue gas floor: 250 °F (121 °C) for natural gas, "to prevent condensation and possible stack or stack liner corrosion"
  (DOE #3, #26A, Sourcebook). This is a stack practice. It is well above the dew point.
- Sulfur in pipeline gas: "typically ... 2,000 grains per million cubic feet", plus odorants. SO₂ 0.6 lb per 10⁶ scf
  (AP-42 §1.4).
- SO₂ to SO₃ conversion 1 to 5%, acid dew point correlation within about 9 K (Ganapathy Q6.25, Table 6.9). His
  table of typical SO₃ has no gas rows. Sulfuric acid dew points "can vary from 200 to 270 °F" (93 to 132 °C) for
  sulfur-bearing fuels.
- The wall follows the water: "It is the feedwater temperature—not the gas temperature—that determines the tube wall
  temperature." With hi = 1000 and ho = 15, gas going from 350 to 750 °F moves the wall only from 252 to 258 °F (Q6.25c).
  "Even with finned tubes the difference would be marginal."
- Corrosion peaks 15 to 20 °C below the dew point (Ganapathy Chapter 3).
- Real feedwater at the economizer inlet:
  - Ganapathy: "230–320 °F are common" (110 to 160 °C), depending on acid dew point.
  - Bosch: deaerated water "not colder than 103°C". A plate exchanger can take it to 65 °C for a second bundle.
  - B&W example: 280 °F (138 °C).
  - Riley Table 1: 214 to 360 °F (101 to 182 °C).

**Own inference.**

- Water dew point check: 18.17 vol% H₂O is 0.184 bar, saturation 58 °C. That matches DOE's 57 °C.
- Acid dew point, from these sources: 0.6 lb/10⁶ scf gives about 0.3 ppm SO₂ in the flue gas (3.6 scf SO₂ in about
  1.2 × 10⁷ scf of flue gas). At 1 to 5% conversion and 18% H₂O, Table 6.9 gives **about 78 to 89 °C**. That is an
  extrapolation to trace levels. No source was found that states an acid dew point for natural gas.
- Minimum inlet water temperature for natural gas in a standard: **not found**. The lowest read is Bosch's 65 °C.

**What a 37 °C Return means (own inference).**

- No real non-condensing economizer takes water at 37 °C. The lowest inlet read is 65 °C, the usual one is 100 °C or more.
- By Ganapathy's formula the wall at the inlet is 37 + (160 − 37) × 15/1015 = about 39 °C. That is under the water dew
  point (58 °C) and under the acid dew point. About a quarter of the duty, (58 − 37) / (122.5 − 37) = 25%, sits on
  wet tubes.
- A real unit would need a condensing economizer in stainless steel, or would preheat the water. Flue gas in bulk stays
  dry at 160 °C. The model ignores condensate and the latent heat it frees.
- The sim's economizer does work a real one gets from extraction heaters and a deaerator. Its stack temperature looks
  real, but it gets there by a route no real utility plant uses.
- This is a candidate row for the departures register in `design-basis.md`. That file is not changed here.

## 5. Efficiency

### LHV efficiency

**Sourced.**

| Source | Unit | Stack | Efficiency |
|---|---|---|---|
| Ganapathy Ch. 1 | "typical packaged boiler" | – | "about 92% ... on LHV basis" |
| Ganapathy Table 3.4 | 12.6 kg/s, 15% excess air | 327 °F (164 °C) | 92.73% LHV, 83.66% HHV |
| Ganapathy Table 1.8 | 12.6 kg/s, 10% excess air | 320 °F (160 °C) | 93.60% LHV, 84.46% HHV |
| Ganapathy Table 3.5 | 300 psig saturated, 5 and 20% excess air | 300 °F (149 °C) | 94.11 and 93.46% LHV |
| Ganapathy Table 3.5 | same | 400 °F (204 °C) | 91.71 and 90.70% LHV |
| Bosch | shell boiler, 10,000 kg/h at 13 bar, basis not stated | not stated, no economizer | 88.9% |
| Bosch | same, with economizer | not stated; text gives 120 to 140 °C | 95.4% |
| Riley Table 3 | five boilers on gas, with air heaters | not stated | total losses 15.5 to 16.4%, HHV |
| DOE #26A | at 4% excess O₂, basis not stated | 250 to 300 °F | 84 to 86% with economizer |

Riley's HHV efficiency of 83.6 to 84.5% converts to 92.6 to 93.6% LHV (× 1.108, own arithmetic). Efficiency of a
gas-fired **utility** boiler on either basis: **not found**. The issue's 92% is sourced, but only for packaged boilers.

### Stack loss against stack temperature

**Sourced.** The rule is stated in DOE #3, DOE #4 ("An often-stated rule of thumb"), EPA ICI, and Cleaver-Brooks. None
gives a range of validity. Ganapathy applies it himself across 412 °F: removing the economizer of the Table 3.4 unit
costs "at least (739 − 327)/40 = 10.3%".

Bosch gives a different figure: 1 point per 20 °C, which is 1.1 per 40 °F.

**Own check of the rule, from their tables** (points per 40 °F):

| Table | Basis | Span | Excess air or O₂ | Points per 40 °F |
|---|---|---|---|---|
| DOE #4 | combustion efficiency | gas minus air 200 to 600 °F | 9.5% | 0.94 |
| DOE #4 | same | same | 15% | 0.98 |
| DOE #4 | same | same | 44.9% | 1.20 |
| DOE #4 | same | same | 81.6% | 1.46 |
| ORNL B.1 | stack loss | gas minus air 230 to 510 °F | 2% O₂ | 0.93 |
| ORNL B.1 | same | same | 5% O₂ | 1.09 |
| ORNL B.1 | same | same | 12% O₂ | 1.89 |
| Ganapathy 3.5 | LHV | 300 to 400 °F | 5% excess air | 0.96 |
| Ganapathy 3.5 | LHV | same | 20% excess air | 1.10 |

So the rule **holds for gas at 10 to 15% excess air, for gas-to-air differences up to 600 °F (333 K)**. It runs high at
excess air above about 30%. The heat balance here gives 1.05 at 160 °C and 1.12 at 400 °C on LHV, so a stretch across 290 K
gives 14.5 points where the plain rule gives 13.1. So stretching the rule across that span was fair, at about 10% low.

### Radiation and unaccounted loss

**Sourced.**

- ORNL (from ABMA): "most water tube boilers should have less than a 1.0% shell loss". "The magnitude (Btu/h) of the shell
  loss does not change appreciably with respect to boiler load."
- Ganapathy Q6.19b: "Radiation losses vary from 0.5% to 1.0% in large boilers and may go up to 2.0% in smaller units."
  Quick estimate L4 = 10^(0.62 − 0.42·log Q), Q in MMBtu/h. Q6.24: "nearly the same at all loads".
- Ganapathy Table 3.4: casing 0.3% at 100%, 1.2% at 25%. Plus "Margin" 0.5% at all loads. Q6.19a calls this "a margin or
  unaccounted loss".
- Riley Table 3: radiation 0.32 to 0.55% on 150,000 to 325,000 lb/h units.
- CARB: assumes 1% for radiation and surface convection.

**Own inference.**

- The formula at Q = 392 MW = 1338 MMBtu/h: 10^(0.62 − 0.42 × 3.126) = 10^(−0.693) = 0.20%, or 0.85 MW. This extrapolates
  it past the units it was written for.
- The sim's 0.5 MW is 0.12% of 420 MW. Same order, a little low. It is sized right in form: fixed in MW, near constant
  with load, proportional to temperature above ambient.
- **No double count, if the model's efficiency holds only stack loss.** Then efficiency = 1 − stack loss, and the 0.5 MW
  comes off the vessel as now. Do not also use a sourced efficiency that already has casing loss in it, such as 92.73%.
- The 0.5% margin is a test allowance, not a heat flow. It should not be modelled.

### Part load

**Sourced.**

Ganapathy Table 3.4 (gas, 500 psig, feedwater 230 °F):

| Load | Excess air | Boiler exit gas | Economizer exit gas | Economizer exit water | Efficiency LHV |
|---|---|---|---|---|---|
| 100% | 15% | 739 °F (393 °C) | 327 °F (164 °C) | 374 °F (190 °C) | 92.73% |
| 75% | 15% | 666 °F (352 °C) | 298 °F (148 °C) | 356 °F (180 °C) | 93.37% |
| 50% | 15% | 587 °F (308 °C) | 271 °F (133 °C) | 334 °F (168 °C) | 93.85% |
| 25% | 30% | 525 °F (274 °C) | 254 °F (123 °C) | 328 °F (164 °C) | 93.12% |

- Ganapathy: efficiency "peaks at about 50–70% of load, then drops off". The curve is "parabolic": stack loss falls, casing
  loss rises as a percentage. Table 1.8 shows the same, 92.58 to 94.05% LHV.
- Cleaver-Brooks Table 10 (fire tube, no economizer, 125 psig, 800 hp): 83.1, 83.6, 83.7, 83.5% at 25, 50, 75, 100%.
- Bosch: "Unregulated economisers achieve the optimum efficiency gain because in partial load optimum use is made of the
  available heating surface."
- The only utility evidence is indirect. B&W V-Temp: on coal units, economizer exit gas cannot hold the SCR minimum at
  "typically 70 to 80% load". So exit gas falls with load there too.

Utility part-load efficiency of a gas-fired unit: **not found**.

## 6. Thermal mass and time constant

**Sourced.**

- Kim and Choi, Table 1, economizer of a 300 MWe coal CFB: 400,000 kg, 274 kg/s, time constant **240 s** by formula,
  **160 s** in simulation. Whether the mass includes water is not stated. Same table: drum loop 700,000 kg, 604 s.
- Åström and Bell, 160 MW unit: total metal 300,000 kg, riser metal 160,000 kg, drum 40 m³. Stored energy over power at
  160 MW: metal 320 s, water 333 s, steam 37 s. No economizer figures. The paper treats feedwater as an input.
- Ganapathy Q8.44a gives the lumped form, Mc·dt/dz = heat in, with Mc = steel mass × cp + water mass × cp.
- Molloy's [DCU thesis](https://doras.dcu.ie/19082/1/Barbara_Molloy_20130618081644.pdf) models economizer gas, metal and
  fluid as three lumps. Only its structure was read, not values.

Mass of a gas-fired utility economizer, and a measured time constant: **not found**.

**Own estimate, for scale only.** It takes 7,000 m² of finned surface (hand check) and scales Table 3.2 boiler 1. That
boiler has 15 × 14 tubes × 11 ft = 704 m of tube for 779 m², so 1.1 m² per metre.

- 7,000 m² is 6,330 m of tube. Assuming 2 in × 0.120 in tube (size from Table 8.33, not stated for Table 3.2) and
  3 fins/in × 0.75 in × 0.05 in fins: tube 3.6 kg/m, fins 4.9 kg/m (ignoring serrations), about 54 t.
- Water inside: about 10 t. This tube is a low pressure size, so 165 bar steel would be heavier.
- Heat capacity: 54 × 0.5 + 10 × 4.2 = 69 MJ/K. Over the water capacity rate of 712 kW/K: **about 100 s**. Water transit: 10 t ÷
  171 kg/s = 58 s.

So a later lag of **1 to 4 minutes** covers this estimate and the Kim and Choi figures. Against the sim's 100 t of boiler
metal, 54 t is not small.

## 7. Air preheater

**Sourced.**

- EPA-453/R-94-023 §3.3.3.5, large pulverized coal boilers: air heaters take flue gas from 320 to 430 °C to "135 to 180 °C",
  and air from about 25 °C to "between 260 and 400 °C".
- B&W Chapter 1: "In many cases, especially in high pressure boilers, the temperature of the flue gas leaving the
  economizer is still quite high. The air heater recovers much of this energy."
- B&W example, gas fired: gas 760 → 310 °F (404 → 154 °C), air 80 → 570 °F (27 → 299 °C), with no economizer at all. The
  stated reason: "The lowest gas exit temperature possible is the inlet temperature of the feedwater", and with 280 °F water a
  310 °F stack leaves only 30 °F (17 K).
- EPA ICI: "Air preheaters are widely used in large boiler applications (as in the electric utility sector)." In the ICI
  sector, less so, because of NOx: "many gas and liquid fuel boilers do not have APH. Economizers are favored in these
  cases." Ganapathy agrees for packaged boilers.
- Sourcebook: about 1% per 40 °F of combustion air temperature rise.
- Bosch: combustion air heated to roughly 80 °C, with water at 65 °C in a second economizer bundle, flue gas to about
  80 °C. That is a small shell boiler option, not a utility design.

A gas-fired utility boiler's air heater figures: **not found**. Feedwater of 230 to 250 °C: the range is from the brief,
and no source for it was read.

**Own inference, for #88.**

- With hot feedwater an economizer alone cannot reach a low stack. At 240 °C inlet with B&W's 17 K, stack is about 257 °C at
  best. With this note's flue gas, 270 °C gives 88.1% and 300 °C gives 86.6%.
- So real utility units use the air heater for the last stretch. On coal it takes 140 to 295 K off (EPA range above).
- This plant reaches 160 °C with an economizer alone only because Return is at 37 °C.
- The two are linked. Raising the economizer inlet (#88, extraction heaters) raises the stack at the same UA, ε = 0.70:
  - 105 °C inlet (a deaerator): stack 450 − 0.702 × 345 = 208 °C, efficiency 91.1%.
  - 240 °C inlet: stack 303 °C, efficiency 86.4%.
- That loss in boiler efficiency is real and is why the air heater exists. Extraction heating still pays in cycle efficiency.
  Any decision on no air preheater should be revisited when feedwater heating arrives.

## What this means for the model

Everything in this section is our own inference.

### Inputs

- Fuel 420 MW (12 m³/s × 35 000 kJ/m³), taken as LHV. Decision below.
- Flue gas 176.7 kg/s at 15% excess air (0.4207 kg/s per MW).
- Enthalpy from Ganapathy Table A7b, quadratic through 200, 600 and 1000 °F, × 2.326. In kJ/kg:

  | T (°C) | 20 | 160 | 350 | 410 | 450 | 500 |
  |---|---|---|---|---|---|---|
  | h | 4.4 | 162.1 | 385.3 | 457.9 | 506.9 | 568.9 |

  Mean cp is 1.13 from 20 to 160 °C, and 1.19 from 160 to 450 °C.
- Ambient 20 °C (`AmbientTemperature`).
- Water at 165 bar from IF97: 169.7 kJ/kg at 37 °C. Saturated vapour 2564.6, saturation 349.9 °C.

**Validation of the method.** For the Table 3.4 unit at 327 °F, ambient 80 °F: (h(327 °F) − h(80 °F)) × flue gas ÷ LHV input =
6.51%. Adding his 0.3% casing and 0.5% margin gives 92.69% against his 92.73% LHV. So the method reproduces the book.

### Hand check at full gas, approach 100 K

Boiler exit 450 °C. Stack 160 °C. Return 171 kg/s at 37 °C.

1. Flue gas heat capacity rate over the economizer: Q_eco / ΔT = 176.7 × (506.9 − 162.1) / 290 = 60,930 / 290 = **210 kW/K**.
2. Economizer duty: **60.9 MW**.
3. Return outlet: h = 169.7 + 60,930 / 171 = 526.0 kJ/kg, which is **122.5 °C**. Rise 85.5 K.
4. Water capacity rate: 60,930 / 85.5 = 712 kW/K. So the gas is Cmin, C = 210 / 712 = 0.295.
5. Effectiveness: ε = (450 − 160) / (450 − 37) = 0.702.
6. NTU = ln[(1 − εC) / (1 − ε)] / (1 − C) = ln(0.793 / 0.298) / 0.705 = 1.389.
7. **UA = 1.389 × 210 = 292 kW/K.**
   Check by LMTD: (327.5 − 123) / ln(327.5 / 123) = 208.8 K, and 60,930 / 208.8 = 292 kW/K.
8. Surface: 292,000 / 42 W/m²·K = 7,000 m² finned, or 292,000 / 65 = 4,500 m² bare.
9. Stack loss: 176.7 × (162.1 − 4.4) = 27.9 MW = 6.6%.
10. **Efficiency: 93.4%. Heat into water: 392.1 MW.**
11. Boiler stage: 176.7 × (506.9 − 4.4) = 88.8 MW leaves the boiler, so 420 − 88.8 = 331.2 MW. Add 60.9 = 392.1 MW.

The ratio C = 0.295 agrees with Ganapathy's packaged boiler: his 1.23 × 0.286 = 0.35 (Chapter 3). NTU 1.4 is below his
2.2, as our water is much colder, so the same stack needs less surface.

### Efficiency with no Return

The economizer recovers nothing, so flue gas goes up at the boiler exit temperature.

| Approach | Boiler exit | Gas loss | Efficiency | Heat into water | Economizer duty | Return out | UA for 160 °C | Anchor |
|---|---|---|---|---|---|---|---|---|
| 0 K | 350 °C | 67.3 MW | **84.0%** | 352.7 MW | – | – | – | theoretical limit |
| 60 K | 410 °C | 80.1 MW | 80.9% | 339.9 MW | 52.3 MW | 110 °C | 264 kW/K | Bosch, shell boiler |
| **100 K** | **450 °C** | 88.8 MW | **78.9%** | 331.2 MW | 60.9 MW | 122.5 °C | 292 kW/K | Ganapathy 105 K |
| 150 K | 500 °C | 99.7 MW | 76.3% | 320.3 MW | 71.9 MW | 138 °C | 324 kW/K | B&W, Ganapathy 145 K |

With Return flowing, efficiency stays 93.4% in every row. It depends only on stack temperature. The approach only sets the
split, and how bad no Return is.

- 60 to 150 K is the sourced span. For a water tube boiler 100 to 150 K is better supported. 60 K is a shell boiler.
- The issue's 82% and 344 MW need a boiler exit of about 390 °C, an approach of about 40 K. That is under anything read.
- **The current fixed 85% is impossible with this flue gas.** It needs flue gas at 330 °C, 20 K below the boiler water, with
  no economizer. Even zero approach gives 84.0%.
- At 10% excess air (169.4 kg/s), efficiency is 93.6% with Return and 79.7% without at 100 K. Excess air moves this by
  under a point.
- A 130 °C stack gives 94.8%. The DOE floor of 121 °C gives 95.2%.

### Things the model must handle

- **Gas limits the economizer at design flow.** Cmin is the gas until Return falls under about 50 kg/s (Cw = 210 kW/K). So
  a change in Return flow barely moves the stack at normal flow. Rating at the fixed UA of 292 kW/K, full gas, boiler exit
  450 °C:

  | Return (kg/s) | Duty (MW) | Return out (°C) | Stack (°C) |
  |---|---|---|---|
  | 171 | 60.9 | 122.5 | 160 |
  | 120 | 59.1 | 155 | 169 |
  | 80 | 56.1 | 203 | 183 |
  | 60 | 53.2 | 244 | 197 |
  | 50 | 50.9 | 271 | 208 |
  | 40 | 47.9 | 305 | 222 |
  | 36 | 46.3 | 321 | 230 |

- **The 28 K cap binds near 35 kg/s**, about 20% of design Return, at full gas. Below that the outlet is held at 322 °C and duty
  falls with flow, down to zero at no Return. Further down the water would boil. A real fired boiler rarely gets here,
  because gas follows water. In the sim Return can fall while gas stays up, mainly in transients.
- **Rated flow shifts.** At 392.1 MW the steam flow from 37 °C water is 392,100 / (2564.6 − 169.7) = 163.7 kg/s, not 171. At
  163.7 kg/s Return out is 126 °C and UA 294 kW/K. That belongs to #74.
- **UA scales with gas flow**, by Ganapathy's exponent 0.65. Water flow can be left out, as the gas side dominates.
- **A fixed approach does not match the sources at part load.** Table 3.4 shows the approach falling from 149 K at
  full load to 30 K at 25%. Run with fixed 100 K, UA ∝ gas^0.65, Return scaled with gas, excess air held at 15%:

  | Gas | Stack, model | Stack, Table 3.4 | Return out, model | Economizer exit water, Table 3.4 | Efficiency, model (no casing or margin) | Table 3.4 LHV |
  |---|---|---|---|---|---|---|
  | 100% | 160 °C | 164 °C | 122.5 °C | 190 °C | 93.4% | 92.73% |
  | 75% | 147 °C | 148 °C | 126 °C | 180 °C | 94.0% | 93.37% |
  | 50% | 128 °C | 133 °C | 132 °C | 168 °C | 94.9% | 93.85% |
  | 25% | 100 °C | 123 °C | 140 °C | 164 °C | 96.2% | 93.12% |

  These model figures are a consequence of the decided model, not sourced behaviour. The rows compare different plants, as
  Table 3.4 has 110 °C feedwater. Three points for the ADR:
  - Stack temperature tracks well down to 50%. Adding back casing and margin, the 50% row is 94.9 − 1.1 = 93.8%.
  - Return outlet moves the **wrong way**: it rises as load falls, where the source falls. The approach point widens in
    reality, and the model narrows it.
  - Below 50%, the model is too good. Stack goes under the DOE floor, and it has no excess air rise (30% at 25% load).
  A boiler stage with its own UA would fix the first two. That would change a decided point, so it stays an owner call.

### Suggested values, for the grilling

| Item | Value | Label |
|---|---|---|
| Fuel basis | LHV, 35 000 kJ/m³, reference stated | owner decision |
| Excess air | 15% (10% is attainable) | sourced, industrial |
| Flue gas per m³ of gas | 14.7 kg/m³ | derived from Ganapathy Table 3.4 |
| Mean cp | 1.13 and 1.19 kJ/kg·K, or the enthalpy table | sourced |
| Boiler approach | 100 K | sourced span 60 to 150 K, no figure above 254 °C saturation |
| Economizer UA at full gas | about 290 kW/K | sized here for 160 °C, a design choice, not a real unit's figure |
| Approach to saturation | 28 K | UNVERIFIED wording, design rule |
| Efficiency with Return | about 93.4%, before the 0.5 MW | follows from the balance |
| Efficiency with no Return | about 79% (76 to 81%) | follows from the balance |

### Open decisions for the owner

- Is `GasEnergyDensity` LHV? State the reference condition with it.
- Boiler approach: 100 K, or another value in 60 to 150 K?
- Keep the approach fixed, despite the part-load mismatch above?
- Stack target: 160 °C, or 120 to 140 °C? UA is what actually carries the choice.
- Record the 37 °C Return into a dry economizer as a departure in `design-basis.md`.
- Revisit "no air preheater" when feedwater heating (#88) arrives.

## UNVERIFIED

- The 28 K wording and its attribution to B&W *Steam* Chapter 20: search extracts only.
- Dutch gas figures of 35.17 and 31.65 MJ/m³ (seen on consumer energy pages in search): not traced to a primary source,
  so not used. The Gasunie table supports the gross value only.
- Reference temperature behind the 35 000 kJ/m³ constant: nothing in the repo.
- Basis of the Bosch efficiencies: not stated on the page. Its "roughly 11%" flue gas loss at 245 °C matches 10.8% from this
  note's LHV balance, so LHV is likely.
- Basis of DOE #4 and #26A efficiencies, and Cleaver-Brooks Table 10: not stated in the parts read. HHV is likely.
- Acid dew point of natural gas flue gas, 78 to 89 °C: own extrapolation of a correlation to trace SO₃.
- Economizer steel mass, 54 t, and the 100 s: own estimate on an assumed tube.
- Kim and Choi: a coal CFB abstract, mass basis unclear.
- Feedwater 230 to 250 °C on utility units: from the brief, no source read.
- ASME PTC 4 and EN 12952-15 loss definitions: not read. CARB's worksheet carries the PTC 4 name only.
- Vendor and search-only figures left out: Cleaver-Brooks part-load blog, engineeringtoolbox, fabrico, PG&E, CEC laundry study.

Not found, after searching:

- Any gas-fired utility boiler with published gas temperatures, efficiency, UA or economizer mass.
- Excess air and furnace exit temperature for gas-fired utility units.
- An approach figure for a fired boiler above about 254 °C saturation.
- A standard minimum economizer inlet water temperature for natural gas.
- A measured economizer time constant.
