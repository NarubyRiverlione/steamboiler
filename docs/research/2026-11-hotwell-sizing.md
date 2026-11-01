# Hotwell sizing: how big real plants make it

Frozen research record for #53. The hotwell as built is in [plant/condenser.md](../plant/condenser.md) and
[plant/design-basis.md](../plant/design-basis.md#condenser-and-water-loop); level control is in
[2026-11-hotwell-level-control.md](2026-11-hotwell-level-control.md).

Web research, Nov 2026. Question: is the 15 m³ hotwell (`CstCondenser.TotalVolume`, start fill 10 m³) the right size
for this plant? The HEI "1 to 5 minutes" figure, which the earlier note had only from a search snippet, is **now
verified** from the PDF text. The other volume data points come from NRC FSAR and DCD sections; their PDF text was
extracted and searched for the hotwell, condensate and storage passages quoted below.
Sourced facts and our own inference are marked apart. Items not traced to a primary source are marked UNVERIFIED.

## Findings by source

- **HEI Tech Sheet 136, Condenser Hotwells (04/09/15), page 1** (trade association of condenser makers; verified, PDF
  text read): "Hotwell capacities typically range from 1 to 5 minutes of total condensate flow. The flow specified is
  converted into an equivalent volume that establishes the normal condensate level."
  ([PDF](https://assets.noviams.com/novi-file-uploads/hei/TDS/Condenser/Tech_Sheet_136_Condenser_Hotwells_04-09-15-3c5b34ac.pdf))
  - So HEI counts the minutes as the volume **up to the normal level**, not the total shell volume.
  - The same sheet says the hotwell "provides system capacitance and insures the condensate pump is adequately
    supplied", and that low levels are "supplemented with emergency make up using demineralized water".
  - The purchaser must specify extra height for service connections "between the high condensate level and bottom
    tube". So there is room above high level, but HEI gives no number for it.
- **Waterford 3 FSAR §10.4.1** (PWR, NRC docket; strong): "The storage capacity of the hotwells, 14,500 cu ft, is
  sufficient for approximately 4.50 minutes of operation at maximum throttle flow with some additional volume for
  surge protection. This supply of condensate is backed up by a demineralized water storage tank and a condensate
  storage tank". On high hotwell level a valve "can be remotely opened to reject condensate to either the Condensate
  Storage Tank" or waste processing. The polisher is sized for "the station's full condensate flow (24,200 gpm)" (condensate polisher text in the same chapter).
  ([NRC ML16256A488](https://www.nrc.gov/docs/ML1625/ML16256A488.pdf))
  - Check: 14,500 ft³ = 410.6 m³; 24,200 gpm = 1.527 m³/s; 410.6 / 1.527 = 269 s = **4.48 min**. That matches the
    FSAR's own 4.50 min. This confirms the method: volume ÷ condensate flow.
- **TMI-1 UFSAR Table 10.4-1** (PWR, 872 MWe after uprate; strong): hotwell "Nominal Storage capacity, gallons
  154,000 (Normal Operation)". Footnote: "The hotwell capacity based on physical configuration is approximately
  171,000 gallons. Based on the configuration of the condensate outlet pipe, the usable or 'nominal' capacity is
  approximately 154,000 gallons." Condensate pumps: 3 × 8,300 gpm, NPSH required 1.5 ft. Condensate storage tanks:
  2 × 265,000 gal. Condenser design data: exhaust steam 3 × 2,094,163 lb/hr, LP heater drains 2,129,000 lb/hr, small
  other flows, "Makeup water flow, gpm 50 to 100".
  ([NRC ML18117A407](https://www.nrc.gov/docs/ML1811/ML18117A407.pdf))
  - Inflow to the hotwell: 6,282,489 + 2,129,000 + 172,800 + 9,000 + 6,000 = 8,599,289 lb/hr = 1,083 kg/s. At 111 °F
    (44 °C, 1.009 L/kg) that is 1.094 m³/s. 583 m³ / 1.094 = 533 s = **8.9 min**. Using two pumps running
    (16,600 gpm = 1.047 m³/s, the polisher is sized for "the full flow of two condensate pumps") gives 9.3 min.
  - Dead volume below the outlet: (171,000 − 154,000) / 171,000 = **about 10%** of the physical hotwell.
- **ABWR DCD Tier 2 §10.4.1** (BWR, about 1,350 MWe as cited in `design-basis.md`; strong): "During normal full load operation with nominal hotwell
  levels, the main condenser provides a four minute active condensate storage volume and has a two minute surge
  capacity." Table 10.4-1: "Hotwell storage capacity-total 3 shells, L 355,780". Table 10.4-5: condensate at the feed
  pump inlet "Normal flowrate, kg/h ~7,629,000". The HP heater drains are "pumped backward to the reactor feedwater
  pumps suction". ([NRC ML103080368](https://www.nrc.gov/docs/ML1030/ML103080368.pdf))
  - 7,629,000 kg/h = 2,119 kg/s, about 2.14 m³/s at 44 °C. 355.8 m³ / 2.14 = 166 s = **2.8 min**. This is a lower
    bound: the flow is measured downstream of where the HP drains join, so the hotwell outflow is smaller. The DCD
    states 4 + 2 min. The gap is the flow basis (own inference; the hotwell flow itself is not in the tables read).
  - Surge = 2 min on top of 4 min active: surge is **half the active volume**.
- **Browns Ferry UFSAR §11.3** (BWR; strong, but no volume): hotwells "have sufficient condensate storage capacity to
  provide the quantity of condensate required of full-power turbine operation"; storage "evaluated to a 2-minute
  retention time and found to be acceptable for operation at 3952 MWt".
  ([NRC ML21286A468](https://www.nrc.gov/docs/ML2128/ML21286A468.pdf))
- **GE BWR/4 Technology Course R-304B** (NRC training; medium): hotwell "Designed to retain water for minimum of two
  minutes", for N-16 decay (half-life 7.11 s), "At minimum operating hotwell levels".
  ([NRC ML11258A309](https://www.nrc.gov/docs/ML1125/ML11258A309.pdf))
  - The 2 min floor in BWRs is a radiation rule, not a control rule. It pushes nuclear hotwells up.
- **Graham Manufacturing, "Specifying Steam Surface Condensers"** (OEM; medium, small units only): the sample
  "Minimum Simplified Specification for Steam Surface Condensers in Air Conditioning Practice" asks for a hotwell
  "suitable for one-minute storage capacity".
  ([PDF](https://graham-mfg.com/wp-content/uploads/2023/02/Specifying-Steam-Surface-Condensers.pdf))
- **500 MW fossil condenser deck** (S. Choudhury, slideshare; weak): "three (3) minute storage capacity (between normal
  and low-low level)", citing ASME PTC 12.2 and HEI.
  ([slideshare](https://www.slideshare.net/slideshow/condenser-in-thermal-power-plants/13133714))
- **CEA (India) BTG standard for 660/800 MW supercritical units** (government spec; UNVERIFIED, seen only as a search
  snippet of a Scribd copy, cea.nic.in returned 404): hotwell "sized for three (3) minute storage capacity (between
  normal & low-low level) of total design flow with the turbine operating at VWO condition, 0% make-up"; feed storage
  tank "minimum 6 (six) minutes of BMCR flow ... between normal operating level and lowlow level"; each condensate
  storage tank "500m3". The 500 MW deck uses the same wording, so it likely copies this spec.
- **Deaerator storage** (vendors; weak): industrial deaerators hold 10 to 20 minutes at full feed flow
  ([W.C. Rouse](https://www.wcrouse.com/blog/what-is-a-deaerator-a-practical-guide-for-facility-engineers/),
  [Red River](https://www.redriver.team/deaerator-tanks-asme-fabrication/)); one vendor datasheet says at least 8 min
  ([Ergil](https://aager.de/catalog/Deaerator_&_Feed_Water_Storage_03.pdf)). Not a standard.

## Data points

The minutes measure different volumes. The "basis" column says which.

| Unit | Type | Hotwell volume | Condensate flow | Minutes | Basis | Source strength |
|---|---|---|---|---|---|---|
| HEI typical | any | – | – | 1 to 5 | volume up to normal level | strong (standards body tech sheet) |
| Waterford 3 | PWR | 410.6 m³ (14,500 ft³) | 1.527 m³/s (24,200 gpm) | 4.48 (FSAR: 4.50) | total storage at max throttle flow, plus "some" surge | strong (FSAR) |
| TMI-1 | PWR, 872 MWe | 583 m³ usable (647 m³ physical) | 1.09 m³/s (1,083 kg/s) | 8.9 (9.3 on pump flow) | usable volume above the outlet pipe | strong (UFSAR) |
| ABWR | BWR, ~1,350 MWe | 355.8 m³ (3 shells) | ≤ 2.14 m³/s (feed pump inlet) | ≥ 2.8 computed; DCD: 4 active + 2 surge | "active" at nominal level, surge on top | strong (DCD) |
| Browns Ferry | BWR, 3,952 MWt | not read | not read | 2 (retention) | N-16 decay retention | strong, no volume |
| BWR/4 generic | BWR | – | – | ≥ 2 | at minimum operating level, N-16 | medium (NRC training) |
| Graham sample spec | small, air-conditioning practice | – | – | 1 | storage capacity | medium (OEM), small units |
| 500 MW fossil / CEA 660–800 MW | coal | – | – | 3 | normal to low-low, at VWO, 0% makeup | weak / UNVERIFIED |

All three volume data points (Waterford 3, TMI-1, ABWR) are nuclear, and in BWRs N-16 holdup pushes retention up.
No fossil unit with a published hotwell volume was found. The fossil evidence is thin: the 3 min comes from a deck
and an unread spec. The range rests mainly on HEI's 1 to 5 min. The fossil
3 min sits in the middle of it.

## Scaling to this plant

Scale by **condensate flow, not MW** (own reasoning). Condensate per MWe differs a lot between nuclear saturated-steam
cycles, fossil regenerative cycles and this sim. The sim has no extraction heating and no heater drains, so hotwell
inflow is the turbine plus bypass steam flow.

Flow bases (specific volume of condensate at 30 to 40 °C: 1.004 to 1.008 L/kg; 1.004 used):

- 171 kg/s, full gas: 171 × 1.004 = 171.7 L/s
- 200 kg/s, one valve wide open (the VWO-like design flow CEA uses): 200 × 1.004 = 200.8 L/s
- 167 kg/s, `bypass-loop` average: 167.7 L/s

| Minutes | at 171 kg/s | at 200 kg/s |
|---|---|---|
| 1 (HEI low end, Graham) | 10.3 m³ | 12.0 m³ |
| 2 (BWR floor) | 20.6 m³ | 24.1 m³ |
| 3 (fossil spec, mid HEI) | 30.9 m³ | 36.1 m³ |
| 4.5 (Waterford) | 46.4 m³ | 54.2 m³ |
| 5 (HEI high end) | 51.5 m³ | 60.2 m³ |

These are the volumes **at the normal level** (HEI) or **between normal and low-low** (CEA). The total hotwell is
larger. Two definitions, both with 3 min at 171 kg/s (30.9 m³):

- **A. 3 min below normal (HEI basis)**, normal at 65 to 70% of the volume: 30.9 / 0.70 = 44.1 m³; 30.9 / 0.65 = 47.5 m³.
- **B. 3 min from normal to low-low (CEA basis)**, low-low at 10%, normal at 65 to 70%: 30.9 / 0.60 = 51.5 m³;
  30.9 / 0.55 = 56.2 m³. At 200 kg/s: 36.1 / 0.60 = 60.2 m³.
- **C. Built from sourced ratios** (our construction): dead volume 10% (TMI-1), active 3 min = 30.9 m³, surge half of
  active = 15.5 m³ (ABWR). Active + surge = 46.4 m³ = 90%, so total = 51.5 m³, with normal at (5.2 + 30.9) / 51.5 = 70%.

All three land at **about 45 to 55 m³**. That agreement is the argument.

Full derived range: from 1 min below a 65% normal (10.3 / 0.65 = **16 m³**) to 5 min at 200 kg/s normal-to-low-low
(60.2 / 0.60 = **100 m³**).

The current 15 m³: at the 70% normal target it holds 10.5 m³ below normal = 61 s at 171 kg/s, so **1.0 min**. Brim
full it holds 87 s. It is at the HEI floor, the size Graham specifies for small air-conditioning condensers.

## Recommendation

**Change to 50 m³ total**, normal level at 70%.

- Below normal: 35 m³ = 3.4 min at 171 kg/s (2.9 min at 200 kg/s).
- Normal to low-low (70 → 10%): 30 m³ = 2.9 min at 171 kg/s. Matches the fossil 3 min rule.
- Surge above normal (70 → 100%): 15 m³ = 1.5 min. About half the active volume, as in the ABWR.
- Dead volume below low-low: 5 m³ (10%), as at TMI-1.

Reasoning:

- 15 m³ is at the very bottom of HEI's verified 1 to 5 min range. The 1 min figure found (Graham) is for small
  air-conditioning condensers, not a 150 MWe unit. The nuclear units read hold about 4.5 to 9 min, with a BWR
  retention floor of 2 min. The only fossil figure is 3 min, from weak or UNVERIFIED sources.
- 50 m³ is in the middle of HEI and matches the one fossil figure found. It is a real-plant size, so it is **not** an
  over-dimensioned utility under the realism rule. If 15 m³ is kept, it must be recorded in `design-basis.md` as a
  deliberate reduction to about 1 min.
- The pump and valve flows stay as they are. At 50 m³ the condensation pump (300 L/s) drains a full hotwell in 167 s;
  makeup or reject (50 L/s) move 6% of the volume per minute.

Not done here: the effect on the `bypass-loop` level swing. This note changes no code, so that headless comparison
(15 m³ vs 50 m³) is the next step for #53's acceptance criteria.

## Does the hotwell hold the boiler's water at a trip?

No, in the plants read (sourced). The inventory role belongs to storage tanks:

- Waterford 3: the hotwell is "backed up by a demineralized water storage tank and a condensate storage tank", and
  high level rejects to the condensate storage tank.
- TMI-1: two condensate storage tanks of 265,000 gal (1,003 m³) each, against a 154,000 gal hotwell.
- CEA (UNVERIFIED): 500 m³ per condensate storage tank on a 660 to 800 MW unit.

Own inference for the sim:

- The makeup and reject valves act as an unlimited condensate storage tank. So the hotwell does not need to hold
  the boiler inventory. A trip with the bypass open just keeps the loop circulating; excess goes out by reject.
- 50 m³ happens to equal the boiler's 50 m³ working water. That is a coincidence, not a sizing rule.
- The sim has no deaerator or feed storage tank. In real plants that tank holds a further 6 min (CEA, UNVERIFIED) to
  10 to 20 min (vendors, weak) of feed flow. Whether the sim hotwell should also cover that role is an owner decision.

## What this means for #52's level band

- At 15 m³, 1% of level = 0.15 m³ = **0.9 s** of a 167 kg/s imbalance. The 55 to 75% band = 3 m³ = 18 s.
- At 50 m³, 1% = 0.5 m³ = **3.0 s**. The same band = 10 m³ = 60 s, and makeup or reject at 50 L/s corrects it in 200 s.
- Suggested tiers on 50 m³ (our construction, not sourced): low-low 10% (5 m³, pump trip or start inhibit), low alarm
  about 25%, normal 70%, high alarm about 80 to 85%, high-high about 90%. Real low-low is a submergence height set by
  pump NPSH (TMI-1 pumps need 1.5 ft). The sim has no hotwell geometry, so state the band in m³ or minutes of flow,
  then convert to %.
- Decide the volume first. The band in #52 depends on it.
- Observation: TMI-1's normal makeup flow is 50 to 100 gpm (3 to 6 L/s) on an 872 MWe unit. The sim's 50 L/s is a
  valve capacity, not a normal flow, and real emergency makeup is larger than normal makeup, so the two are not the
  same quantity. Own inference: 50 L/s may still be large for this plant. A note for the owner, not a change proposal.

## Open decisions for the owner

- 50 m³, or another value in 45 to 55 m³? Or keep 15 m³ and record it as a deliberate reduction?
- Design flow: 171 kg/s (full gas) or 200 kg/s (one valve wide open, VWO-like)? 200 kg/s gives about 60 m³.
- Should the hotwell also stand in for the missing deaerator storage (+6 to 20 min, roughly +60 to 200 m³)?
- Normal level: 70% (fits the construction above and the current target) or 60 to 65% (the earlier note)?
- Scale the start fill with the volume (10 m³ of 15 = 67%; 35 m³ of 50 = 70%)?
- Makeup and reject valve size (50 L/s) against real makeup flows of a few L/s.

## UNVERIFIED

- CEA 3 min hotwell, 6 min feed storage tank and 500 m³ condensate storage tank: search snippet of a Scribd copy only;
  the cea.nic.in PDFs returned 404.
- 500 MW deck "3 minute ... between normal and low-low": slide deck, not a specification.
- Deaerator storage of 8 to 20 minutes: vendor pages, not a standard.
- ABWR hotwell flow: the DCD gives only the feed pump inlet flow, so the 2.8 min is a lower bound; the drain split is
  not sourced.
- Waterford 3 unit rating (MWe): not in the section read.
- HEI Standards for Steam Surface Condensers (12th ed.) hotwell chapter, B&W "Steam", El-Wakil, EPRI reports: not
  read (paywalled or not found).
- A fossil unit near 150 MW with a published hotwell volume: not found.
- All band percentages in this note are our own construction.
