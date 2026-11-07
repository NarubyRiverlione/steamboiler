# Extraction heaters: figures for regenerative feedwater heating

Frozen research record for #88. The boiler as built is in [plant/boiler.md](../plant/boiler.md) and
[plant/design-basis.md](../plant/design-basis.md); the flue gas side is in
[2026-11-economizer-flue-gas.md](2026-11-economizer-flue-gas.md), [ADR 0029](../adr/0029-boiler-efficiency-from-flue-gas-heat-balance.md)
and [ADR 0030](../adr/0030-return-pays-real-enthalpy.md).

Web research, Nov 2026. Question: what do the sources say about turbine extraction and feedwater heaters, for a gas-fired
drum boiler of 420 MW fuel with saturated steam at 165 bar, no superheater, no reheat, a one-stage turbine, a condenser at
40 to 100 mbar and a Return at about 37 °C? There is one condensation pump, an economizer of ε about 0.70, no air
preheater and no deaerator yet.

Sourced facts and our own inference are marked apart. Items not traced to a primary source are marked UNVERIFIED. The
"Read?" column says how each source was seen: **text** means PDF text was extracted and read; **summary** means the page
was fetched, but read through a summarising tool, so its wording here is not a quotation; **abstract** means only that.
Search snippets are not counted as read and appear only under UNVERIFIED.

**The main limits of this note.**

- **No plant like this one exists in the sources.** Fossil units with 165 bar drums superheat. LWR turbines expand
  saturated steam, but at about 50 to 70 bar. Nothing read covers saturated steam at 165 bar.
- **Every source says which class it is.** Each figure below is tagged: coal, gas, LWR, SCWR, bagasse or generic.
- **The strong standards were out of reach.** HEI Standards for Closed Feedwater Heaters, ASME PTC 12.1 and TDP-1 are
  paywalled. NRC document links returned HTTP 403 to automated requests. One NRC manual was read through an Internet
  Archive copy. The archive then blocked further requests as bot traffic, and the search stopped there rather than work
  around it. So the LWR side is thinner than the brief wanted.
- **The only gas-fired utility unit read is in a weak paper.** See section 8.

**Later decision:** the grilling chose one extraction heater with its drain pumped forward, and gave the air preheater its own
ticket, #90. The values chosen are in [ADR 0031](../adr/0031-one-extraction-heater.md).

## Sources

| Source | What it is | Class | Strength | Read? |
|---|---|---|---|---|
| [TM 5-811-6, Electric Power Plant Design (US Army, 1984)](https://armypubs.army.mil/epubs/DR_pubs/DR_a/pdf/web/tm5_811_6.pdf) | government design manual | generic, small to medium plants | strong | text, §3-24, §3-29, feed pumps, air heaters |
| [MIL-HDBK-1003/7 in UFC 3-540-02N (2004, inactive)](https://www.wbdg.org/FFC/DOD/UFC/INACTIVE/ufc_3_540_02n_2004.pdf) | government design handbook | generic fossil | strong | text, §8 |
| [ORNL-5547, PRESTO user's manual (1979)](https://ntrs.nasa.gov/api/citations/19790017224/downloads/19790017224.pdf) | national lab cycle code; defaults for regenerative superheated cycles | generic utility, superheated | strong | text, defaults and input notes |
| [Kreith, *Mechanical Engineering Handbook*, Ch. 8 (CRC, 1999)](https://discmaster.textfiles.com/file/12458/Ebooks.tar/Text%20-%20Tech%20-%20Mechanical%20Engineering%20Handbook%20(PDF).zip/Ch08.pdf) | handbook; file on a software archive | generic utility | strong | text, §8.1 |
| [HEI Tech Sheet 127, Basics of Closed Feedwater Heaters](https://assets.noviams.com/novi-file-uploads/hei/TDS/Closed_Feedwater_/FINAL_Tech_Sheet_127_Basics_of_CFWH-49a5042c.pdf) | trade body sheet, not the Standard | generic | medium | text |
| [NRC Westinghouse Technology Systems Manual §7.4, GE turbine (Rev 0803)](https://www.nrc.gov/docs/ml1122/ml11223a249.pdf) | regulator training manual, read through an Internet Archive copy | LWR (PWR) | strong | text |
| [MHI nuclear turbine catalogue](https://power.mhi.com/catalogue/pdf/nuclear_turbine.pdf) | OEM brochure | LWR (PWR) | medium | text, cycle description |
| [Tomsk Polytechnic, Regeneration lecture](https://portal.tpu.ru/SHARED/k/KONSTANTINSV/Educational/Tab7/Tab/6%20Regeneration.pdf) and lectures [10](https://portal.tpu.ru/SHARED/b/BEL/eng/Education/turbines/Tab/Lecture10.pdf), [11](https://portal.tpu.ru/SHARED/b/BEL/eng/Education/turbines/Tab/Lecture11.pdf) | university slides, Russian NPP practice | LWR | medium; formulas badly extracted | text |
| [Gicquel and Candelier, PWR secondary circuit (Mines Paris, 2007)](https://direns.minesparis.psl.eu/Sites/Thopt/en/res/FicheGuideNucleaireN4-en.pdf) | university exercise | LWR | medium | text |
| [TPU 2022 student conference, pp. 248-250](https://earchive.tpu.ru/bitstream/11683/76019/1/conference_tpu-2022-C133_p248-250.pdf) | a VVER-1000 results table closing one paper, and Shahin and Gubin on an 870 MW VVER | LWR | weak | text |
| [Babcock Power, 30 years of MSR restoration](https://www.babcockpower.com/wp-content/uploads/2018/01/30-years-of-msr-restoration-and-upgrade-an-experience-base-for-future-designs.pdf) | OEM paper | LWR | medium | relevant parts |
| [Dipama et al., Gentilly-2 secondary loop (CNS 2009)](https://proceedings.cns-snc.ca/index.php/pcns/article/download/6168/6167/6203) | conference paper | LWR (CANDU) | medium | relevant parts |
| [Edwards and Cook, final feedwater temperature and heater number (CCSC 2010)](https://proceedings.cns-snc.ca/index.php/pcns/article/download/4210/4209/4245) | workshop paper | SCWR, 24 MPa | medium | relevant parts |
| [Mohammed et al., 200 MW steam plant (JARFMTS 56, 2019)](https://semarakilmu.com.my/journals/index.php/fluid_mechanics_thermal_sciences/article/download/3100/1771) | journal paper on Shahid Montazeri | gas, utility | weak; table errors | text |
| [Dosa, K-210-130-1 and 13 CK 240 heat balances (Petroșani, 2011)](https://www.upet.ro/annals/mechanical/pdf/2011/Anale%202011%20-%20Dosa%20I.pdf) | university annals, real turbine data | fossil, fuel not stated, 210 to 235 MW | medium | text |
| [Tatwawadi, 210 MW BHEL heat balance (slides)](https://www.slideshare.net/slideshow/210-mw-bhel-turbine-cycle-heat-balance/162950120) | training slides from a BHEL drawing | coal, 210 MW | medium to weak | summary |
| [Barszcz and Czop, heater grey-box model (AMCS 21, 2011)](https://www.zbc.uz.zgora.pl/Content/24046/AMCS_2011_21_4_11.pdf) | peer-reviewed; real HP heater | coal, about 215 MW | strong | text |
| [Zhao et al., HP heater extraction regulation (Applied Energy 212, 2018)](https://econpapers.repec.org/RePEc:eee:appene:v:212:y:2018:i:c:p:1295-1309) | peer-reviewed dynamic simulation | coal, 660 MW supercritical | strong | abstract |
| [le Grange, Flownex transient model (UCT thesis)](https://open.uct.ac.za/bitstreams/c7658b2d-86d6-401c-b771-d0550ce12a6d/download) | master's thesis | coal, 400 to 600 MW | medium | relevant parts |
| [El Hefni et al., ThermoSysPro heater (Modelica 2012)](https://2012.international.conference.modelica.org/proceedings/html/pdf/ecp12076745_HefniBouskelaGentilini.pdf) | EDF conference paper | generic | medium | relevant parts; no time constant |
| [EPRI technical brief on water induction (Oct 2020)](https://restservice.epri.com/publicdownload/000000003002019316/0/Product) | industry research body, summarises TDP-1 and TDP-2 | generic fossil and HRSG | strong | text |
| [B&W, *Steam* 41st ed., Chapter 1](https://xylenepower.com/Steam_41_Steam_Generation_An_Overview_Th.pdf) | OEM textbook | gas example, industrial | strong | text, air heater example |
| [B&W, Boiler cycling considerations](https://www.babcock.com/home/about/resources/learning-center/boiler-cycling-considerations) | OEM article | utility | medium | summary |
| POWER magazine: [heater level control](https://www.powermag.com/improve-plant-heat-rate-with-feedwater-heater-control/), [coordinated heater control](https://www.powermag.com/coordinated-feedwater-heater-energy-control/), [flue gas heat recovery](https://www.powermag.com/power-101-flue-gas-heat-recovery-in-power-plants-part-i), [SMR turbines](https://www.powermag.com/redesigning-steam-turbines-for-the-smr-era/) | trade press | coal; SMR | medium | summary |
| [Power Engineering, deaerator pressure transient](https://www.power-eng.com/coal/deaerator-pressure/) | trade press, worked example | coal | medium | summary |
| [Turbomachinery Magazine, steam conditions](https://www.turbomachinerymag.com/how-steam-conditions-determine-turbine-power-output/) | trade press, staff credit | generic | medium to weak | summary |
| [TAMU Middle East Turbomachinery Symposium 2013, Lecture 7](https://turbolab.tamu.edu/wp-content/uploads/2018/08/METS2Lecture7.pdf) | symposium paper | mechanical drive turbines | medium | relevant parts |
| [Bester, feedwater heating in sugar plants (ISSCT 2011)](https://issct.org/wp-content/uploads/2020/Past%20Workshops/2013-2016/Presentations%20Factory%20Workshop,%20Gold%20Coast,%20Queensland,%20Australia,%208-12%20May%202011/11%20M%20Bester%20The%20application%20of%20regenerative%20feed%20water%20heating%20to%20power%20cycles.pdf) | conference slides | bagasse | medium, wrong fuel | text |
| [US 9,091,183 B2, double pinch criterion](https://patentimages.storage.googleapis.com/ff/0e/cf/468791d75805e4/US9091183.pdf) | patent; background section only | generic | medium | relevant parts |
| Hitachi patents [US 4,651,533](https://patents.google.com/patent/US4651533A/en), [US 4,003,205](https://patents.google.com/patent/US4003205A/en) | patents; examples, not limits | generic utility | medium to weak | summary |

Not read: HEI Standards for Closed Feedwater Heaters (9th ed.), ASME PTC 12.1, ASME TDP-1 and TDP-2 (paywalled); El-Wakil;
Black & Veatch *Power Plant Engineering*; Weston *Energy Conversion* (author's site gone, archive blocked); B&W *Steam* Chapters
2 and 19; Leyzerovich *Wet-Steam Turbines*; Cooke (1985) on Stodola's ellipse; Thurston (1961) on deaerator storage; Spencer
and Booth (GE, 1968), whose download failed; the [IAEA ARIS VVER-1000 status report](https://aris.iaea.org/PDF/VVER-1000(V-466B).pdf)
(empty response); all NRC FSAR and design control documents (403).

## 1. Regenerative gain, feedwater temperature, extraction points

**Sourced.**

- Why it works: regeneration raises the average temperature of heat addition (Bester, bagasse). It also cuts the heat lost to
  the condenser (TPU, LWR; HEI 127).
- Gain with number of heaters: "greater improvement corresponding to larger numbers of such heaters", up to where "additional
  cycle efficiency no longer justifies the increased capital cost" (TM 5-811-6 and MIL-HDBK-1003/7, generic).
- LWR: "the 7-8 stages of RHFW" raise efficiency "by 15-17 %" (TPU lecture, Russian NPP practice). The slide does not say
  whether this is relative. Relative is the likely reading. **This is the only gain figure found for a saturated-steam cycle.**
- SCWR, 24 MPa, reheat, Test A in Edwards and Cook: maximum cycle efficiency 47.75% with 4 heaters, 47.99% with 5, 48.33% with
  6. Range over 4 to 10 heaters: 47.8 to 48.8%. So the steps shrink.
- No source read gives a clean gain for 1, 2 and 3 heaters on a real unit. Our own figures for this cycle are in section 10.
- Optimum final temperature, per the TPU lectures: `t_fw,opt = t_cond + (t_sat,boiler − t_cond) × z / (z + 1)` for z stages, with an
  equal temperature rise per stage. The extracted formula is garbled; this is our reading of it, and it agrees with the
  lecture's per-stage step.
- It "increases with z" (TPU, LWR). "The technic-economic optimal temperature of feed water is lower than thermodynamic
  optimal" (TPU). Stage counts: 7 to 9 in Russia, up to 11 abroad (TPU).
- The optimum is flat. SCWR, 8 heaters: 342 °C gives 0.33% more efficiency than 280 °C, but about 20% more overall flow and
  about 55% more extraction steam (Edwards and Cook).
- Rule for extraction points: equal enthalpy rise. "A well known approximate design criterion" (US 9,091,183). Under some
  idealizations, for a non-reheat, non-supercritical plant, the feedwater enthalpy rise up to saturation should be about the
  same in all heaters and the economizer (same patent, background section). TPU gives the same rule for constant heat per kg
  of bled steam, and lists even entropy and even temperature ratio as alternatives. **Our plant is non-reheat and
  non-supercritical, so this form applies, with the economizer counted as one step.**
- In practice the steps follow turbine nozzle positions: 50 to 100 °F (28 to 56 K) per heater, set by the manufacturer's
  stage location (MIL-HDBK-1003/7, generic). Shahin and Gubin use 27.5 K per LP heater (LWR, weak).
- Real extraction shares (own sum of published flows): K-210-130-1, seven bleeds, 54.4 of 176.1 kg/s, 31% (fossil, superheated).
  NRC §7.4 PWR: about one fifth of HP inlet flow and about one fourth of LP inlet flow, the shares including moisture removal
  and reheat steam.

**Own inference.**

- For 165 bar and 37 °C the TPU formula gives 193 °C for one stage, 246 °C for two, 272 °C for three and 298 °C for five.
- The equal enthalpy rule gives more: 213, 266, 290 and 313 °C. It is higher because water enthalpy rises faster than
  temperature near 350 °C. Both are thermodynamic optima for the cycle alone; section 10 shows why the plant's optimum is lower.
- 63% of the heat into the water here is sensible heat: 1515 of 2410 kJ/kg (IF97). At 165 bar the latent heat is only 895 kJ/kg.
  That is why regeneration is worth much more on this plant than on a superheated unit.

## 2. Closed heaters: TTD, DCA, line drop, drains

**Sourced.**

- TTD is extraction saturation temperature minus feedwater outlet temperature. DCA is drain outlet minus feedwater inlet
  temperature (CRC; POWER; le Grange).
- Typical TTD, per POWER (coal): −3 to −5 °F (−1.7 to −2.8 K) for an HP heater with a desuperheating zone, 0 °F without one,
  about 5 °F (2.8 K) for an LP heater.
- ORNL PRESTO defaults (generic, superheated): TTD 0 °F for heaters 1 and 2 (the highest pressure) and the deaerator, and 5 °F for
  the LP heaters. DCA 10 °F (5.6 K). POWER also gives about 10 °F. A rising DCA means a falling level.
- BHEL 210 MW slides (coal): TTD 2.5, 4.5 and 2 for HP7, HP6 and HP5, and 5 for each LP heater. Units are not stated, likely °C.
- "Desuperheating is not necessary in wet extraction zones" (CRC, generic). So a wet-steam heater has no negative TTD.
- Line drop: 3% from a turbine exhaust to a heater, 6% from a shell opening to a heater (PRESTO defaults). The TPU lecture uses 2 to
  3%, though its slide writes the factor the wrong way round for flow towards the heater.
- Heat loss factor of a heater: 0.98 to 0.99 (TPU).
- Shell pressure: "determined by the pressure of the steam supplied to it, not by the amount of heat transfer surface". The
  steam flow "is not limited by the amount of available steam" (HEI 127). This is what "uncontrolled extraction" means.
- Drains, normal route: cascade to the next lower heater. LP string to the condenser, HP string to the deaerator
  (MIL-HDBK-1003/7; TM 5-811-6).
- Drains, pumped forward: a low pressure drain pump recovers "heat which would other wise be lost to the condenser"; the choice
  is economic (MIL-HDBK-1003/7). Flashing the last drains to the condenser rather than pumping forward cost "only 2 Btu/kWhr" in
  the PRESTO example, and pumped drains bring more operating problems (ORNL, generic). The MHI PWR cycle recovers drains into
  the feedwater line.
- HP drains into the deaerator need HP drain pumps if elevation demands it (MIL-HDBK-1003/7).
- Each closed heater has a normal and an emergency drain. At low load the pressure difference may not push the drain to the
  next heater, and the emergency valve goes to a lower heater or the condenser (TM 5-811-6).
- Open heaters are the more efficient type, but each needs a pump (CRC). Mixing heaters have no underheating. Surface heaters
  allow "one pump" but are costlier (TPU, LWR).

**Own inference.** Thermodynamic penalty of each drain route, three heaters to 210 °C, own balance from section 10:

| Drain route | Cycle efficiency | Extraction, share of throttle flow |
|---|---|---|
| Pumped forward (same as mixing heaters) | 39.8% | 37% |
| Cascaded, drain cooler with DCA 5.6 K, last to condenser | 39.7% | 38% |
| Cascaded, no drain cooler, last to condenser | 38.4% | 42% |
| Each heater straight to the condenser | 37.1% | 50% |

No heaters is 33.8%. So a drain cooler recovers nearly all of the gap, which fits ORNL's 2 Btu/kWh. The route in #88, straight
back to the condenser, gives away almost half of the cycle gain. A deaerator route was not computed; it is a mixing point, so
it should sit near the pumped-forward row.

## 3. Open heaters, deaerators, pumps

**Sourced.**

- Purpose first, heat second: open heaters remove oxygen and other gases; "secondarily" they raise efficiency (TM 5-811-6).
  Limit 0.005 cc/litre of oxygen (TM 5-811-6; MIL-HDBK-1003/7).
- Pressure and temperature: K-210-130-1 and 13 CK 240, 6 bar, 158 and 160 °C (fossil). VVER table, 0.62 MPa (LWR, weak). The
  deaerator transient example, 73.2 psia, about 5 bar (coal). PRESTO's default feed pump inlet is 171.7 psia, 11.8 bar, set equal
  to deaerator shell pressure (generic). Mines PWR exercise, 11 bar (LWR, teaching).
- It floats: "arranged in the cycle to float in pressure with changes in extraction pressure" (MIL-HDBK-1003/7). Heat duty 28 to
  42 K. Minimum steam pressure 3 psig (TM 5-811-6). Design pressure 1.15 × maximum extraction pressure plus relief margin,
  because extraction pressures vary ±10% and heaters may be out of service (MIL-HDBK-1003/7).
- Storage: at least ten minutes of maximum design flow (TM 5-811-6; MIL-HDBK-1003/7, full turbine load). Its Table 6 lists 15 to
  20 minutes at ultimate plant capacity for a small plant.
- Elevation: usually about at the boiler upper drum (MIL-HDBK-1003/7). It must give NPSH above the requirement under all
  conditions, with margin for a sudden fall in deaerator pressure (TM 5-811-6).
- Why: on a load reduction extraction falls, condensate cools the tank, pressure decays and the stored water flashes. Hot water in the
  suction pipe keeps its vapour pressure for a residence time, about 0.5 min in the worked example, so NPSH collapses
  (Power Engineering, coal). The pump NPSH ratio is 1.8 to 2.5 in that article.
- Standby steam: boiler drum steam can supply the deaerator through a reducing station, also a "high pressure extraction bypass
  to deaerator" (MIL-HDBK-1003/7). CRC lists "deaerating heater pegging" among auxiliary steam users.
- Where the feed pump sits: suction on the deaerator tank, discharge through the HP heaters to the boiler (CRC; MIL-HDBK-1003/7;
  MHI, PWR). LP heaters sit between the condensate pump and the feed pump (MIL-HDBK-1003/7; HEI 127). Booster pumps are added for
  a low deaerator setting (CRC).
- HP heater: tube side typically designed for at least 1500 psig, about 103 bar (HEI 127).
- Why two pumps: the condensate pump takes suction at two inches Hg or less, at saturation, so it sits below the hotwell for NPSH
  (TM 5-811-6). Its head covers atmosphere, pipe and valve friction, closed heater friction and the deaerator elevation
  (TM 5-811-6). The deaerator between them is the reason for a split: it is a low-pressure vessel. A closed heater string can run
  with one pump (TPU).
- Head split: feed pump discharge is 1.30 × throttle pressure in PRESTO, and 1.25 changed heat rate by only 8 Btu/kWh (generic,
  superheated; the margin includes a superheater, which we lack). No source read gives a condensate pump head in metres for a
  unit this size. The Mines PWR exercise compresses condensate to 15 bar for an 11 bar tank (teaching).
- Feed pump capacity 1.25 × boiler steaming capacity (MIL-HDBK-1003/7, small plants). Recirculation to the deaerator for minimum
  flow (TM 5-811-6).

**Own inference.** A 6 bar deaerator at 159 °C, 10 min at 171 kg/s, is about 103 t of water, about 113 m³ at 0.91 t/m³. The
deaerator in the #87 note's 105 °C case is an industrial low-pressure type. A utility deaerator runs at 150 to 180 °C.

## 4. Extraction pressure against load; part load; start-up

**Sourced.**

- "Uncontrolled extraction opening pressures will vary in proportion to turbine steam flow" (TM 5-811-6 §3-24, generic). This is
  the plainest statement read. The source does not name Stodola.
- Extraction for the heaters is uncontrolled in the normal case (HEI 127; TM 5-811-6). Controlled extraction is a separate,
  costlier turbine type (TM 5-811-6).
- NRC §7.4, PWR: "the steam supply to the first-stage reheater tube bundles increases with extraction steam pressure as the
  turbine load is increased". There is no control system on that line.
- Start-up, NRC §7.4, PWR: first-stage reheater steam opened at 1800 rpm, second stage at 15% load.
- Start-up, Hitachi US 4,651,533 (fossil, an example): HP heaters put in service in turn from the lowest pressure, starting at
  about 5% turbine load. On shutdown they go out from about 20% load, highest pressure first.
- During shutdown and restart no extraction steam is available, so feedwater is cold (B&W). A high-pressure heater can be
  pressurised from an auxiliary source or the drum to lift it (B&W).
- Low load also ends the drain path to the next heater (TM 5-811-6, section 2).
- BHEL and K-210 heat balances list one load only. No part-load final feedwater curve was found for a unit this size.

**Own inference.**

- With a shell at 31 bar at full flow (236 °C), proportional pressure gives 15.5 bar (200 °C) at 50% flow, 7.8 bar (169 °C) at 25%
  and 3.1 bar (135 °C) at 10%. So final feedwater falls about 36 K at half load. It falls slowly at first, because saturation
  temperature follows log pressure.
- It needs no setpoint. Fix the fraction of the turbine at the tap, let pressure follow flow, and the heater follows.
- Proportional pressure is fine for a condensing turbine, where back pressure is small. Only a tap near the exhaust would feel
  condenser pressure.

## 5. Heater out of service, trip, protection

**Sourced.**

- Water induction: heaters and extraction systems are "the most frequent sources" (EPRI). Failed level controls let water "rise in
  extractions and enter the turbine". Most incidents are on extraction and main steam lines.
- Design rule: detect, isolate, dispose. No single failure may let water or cold steam into the turbine (EPRI, citing TDP-1 and
  TDP-2). Two independent automatic means on the extraction system, such as an automatic drain and power-operated block valves
  (EPRI).
- A heater tube failure can cause extraction backflow (EPRI). Damage: broken blades, thermal cracking, rubs (EPRI).
- High level: open the emergency drain. It is an immediate efficiency loss. Turbine water induction protection can trip the unit
  (POWER, coal). Hitachi US 4,003,205 runs the turbine back on abnormal drain level, then closes the extraction valve and bypasses
  the heater; at a second, higher level the valve closes at once. An isolated heater sends colder water to the next one.
- On a load reduction, extraction can no longer feed the deaerator and its pressure decays, as in section 3 (Power Engineering). The same
  source does not treat a trip separately.
- Effect of loss, coal: HP heaters isolated on a unit at 2400 psig, economizer inlet down 46 °F (26 K). Superheat rises about 1 °F
  per 1 °F of feedwater drop. Furnace exit gas fell 14 °F; four hours of settling allowed (POWER). Another test: HP outlet 479 to
  449 °F (248 to 232 °C).
- Larger case, coal 660 MW: throttling all three HP heaters drops steady feedwater by up to 94.6 °C and gives 48.40 MW more output,
  about 7%, at up to 6.19% of rated power per minute. Power changes in a fast stage, then a slow one (Zhao et al., abstract).
- Fuel: when feedwater heating is lost the boiler fires harder (POWER, coal). 5 °F of final feedwater costs 11.2 Btu/kWh on a
  500 MW coal unit (POWER).
- Allowed rates: no HEI figure was seen. Hitachi US 4,651,533 uses 300 °C/hour as a reference
  limit for a heater water chamber, an example of 5 K/min. It reports 166 to 277 °C/hour in its worked cases.
- The economizer inlet is worse: metal follows feedwater with "practically no time delay". Cutting in extractions can raise
  temperature several hundred degrees in a few minutes. Subcooling within 100 °F (56 K) means low risk of damage (B&W, summary).
- Zhao et al.: HP heater metal changed at up to 44.6 °C/min in simulation. That is what can happen, not what is allowed.

**Own inference.**

- The sources read name "power-operated block valves" and extraction stop valves. None read states the non-return valve rule in
  its own words; TDP-1 would. A model needs one state per heater: in service or isolated.
- On our plant losing a heater has no superheat effect, as there is no superheater. It lands on the drum instead. Colder water
  reaches the economizer, it takes more heat, stack falls and drum pressure sags until gas rises.
- More steam stays in the turbine, so output rises for a while: this is the Zhao effect, in the same sign.

## 6. Thermal mass and time constant

**Sourced.**

- One real HP heater, about 215 MW coal unit (Barszcz and Czop): 35 500 kg of metal, 600 m² of surface, 2.9 m³ steam and condensate
  volume, 4 m³ feedwater volume, 10 m high, metal specific heat 0.5 kJ/kg·K. Level PID: P 0.8, I 53 s.
- The same paper: the inertia between steam and housing metal "is of the order of several minutes", and for its monitoring use it
  is neglected against the inertia between steam and feedwater, "being of the order of the simulation time". The simulation time is
  not given as a figure in a usable way, and no time constant is reported.
- Level and thick parts drive a heater's transients: tube walls, tubesheet, water content (le Grange). The thesis shows a step test,
  180 to 160 °C at the inlet, in a figure only.
- EDF's model holds mass and energy per volume but publishes no time constant (El Hefni et al.).

**Not found: a published measured time constant.**

**Own inference.** On the Barszcz and Czop heater, metal stores about 17.8 MJ/K and tube water about 15 MJ/K (4 m³ near 200 °C). With
171 kg/s of feedwater, about 770 kW/K, that is about 43 s. Water transit alone is about 20 s. So a heater acts in the order of a
minute, much faster than the boiler. A heater with no thermal mass, or one first-order lag, looks defensible.

## 7. Air preheater with hot feedwater

**Sourced.**

- "Either an economizer or an air heater or a balanced selection of both as is usual in a power boiler will be provided, allowing
  also for turbine cycle feedwater stage heating" (TM 5-811-6). This is the plainest primary statement on the link. Regenerative type
  on larger boilers.
- Gas example, industrial, 50 kg/s: B&W takes gas 404 → 154 °C and air 27 → 299 °C in an air heater, because feedwater at 138 °C
  leaves no room for an economizer.
- 200 MW Shahid Montazeri (gas): 247 °C feedwater and a 160 °C stack in one table (Mohammed et al.). The paper does not mention an air
  heater.
- Coal sample plant, 642 MW: boiler outlet gas 680 °F (360 °C), air heater gas outlet 310 °F (154 °C). Common practice is to recover
  to about 300 °F (POWER). Further cooling with condensate behind the air heater gained 1.24 to 3.65% in heat rate.
- Coal: air heater exit is typically 50 °F or more above acid dew point (POWER). Gas firing has much less sulphur; see the #87 note.
- Bagasse: a feedwater heater sits **between two economizer banks**. The low bank sees cool water and pulls the gas down; the high
  bank takes water from the heater. The air heater sits ahead of the low bank (Bester, class wrong, design idea sound). Gain about
  0.77% in conversion efficiency. Other limits there: water 30 °C under drum saturation, air under 250 °C.
- Hot deaerator water can serve air preheating (MIL-HDBK-1003/7 §8.4.1e).
- LWR cycles have no stack; their feedwater temperature is set by the steam generator. Nothing there transfers.

**Own inference.**

- A 160 °C stack with 247 °C feedwater needs a sink colder than the feedwater. Air is the obvious one, so the Montazeri unit almost
  certainly has an air heater. The paper does not say so.
- Options for our plant, without new sources: (a) air preheater; (b) split economizer with heater between banks, as in Bester;
  (c) low final feedwater, accepting less regeneration. Option (c) needs no new equipment; see section 10.

## 8. Real units of 100 to 200 MWe

**Sourced.** All superheated with reheat. No saturated-steam fossil unit exists in the set.

| Unit | Fuel | Steam | Heaters | Final feedwater | Heat rate or efficiency | Source |
|---|---|---|---|---|---|---|
| Shahid Montazeri, 200 MW | gas | 130 bar, 540 °C, 670 t/h | not stated for the real unit; model tests up to 9 | **247 °C** | 10 448.6 kJ/kWh (34.5%, own conversion); stack 160 °C | Mohammed et al. |
| K-210-130-1, 210 MW | not stated | 130 bar, 545 °C, 176 kg/s | 7 bleeds; deaerator 6 bar, 158 °C | not stated | 39.63% "total effective" | Dosa |
| 13 CK 240, 235 MW | not stated | 127.5 bar, 545 °C, 178 kg/s | 7 bleeds; deaerator 6 bar, 160 °C | not stated | 43.07% "total effective" | Dosa |
| BHEL 210 MW | coal | 130 kg/cm², 555 °C as read (OCR doubtful), 652 t/h | 7 plus deaerator | enthalpy 253.94 kcal/kg | turbine 2043 kcal/kWh (42.1%, own conversion) | Tatwawadi |

Rule of thumb: above 200 MW, seven to eight stages (CRC); six to eight in large plants (CRC). LWR: 7 stages in a recent MHI PWR,
four LP, deaerator, two HP. VVER-1000 table (TPU 2022): 4 LP, deaerator at 0.62 MPa, 2 HP, 220 °C, at 6.27 MPa; the source is weak.

The 230 to 250 °C claim of #88:

- **247 °C: found, on a 130 bar gas unit, not 150 bar.** The source is weak, with errors in the same table: fuel flow "54 Nm³/h" is
  plainly wrong, and the stated 37.52% does not match its 10 448.6 kJ/kWh.
- 253.94 kcal/kg on the BHEL unit is 245 °C by IF97 at 150 to 190 bar (own conversion, pressure assumed).
- 250 °C from a patent: not found.
- LWR feedwater is lower: 220 °C on the VVER table, at 6.27 MPa.
- So 245 to 247 °C is supported for 130 bar class units of 200 MW. The rest of the range is plausible, not sourced.

## 9. Moisture

**Sourced.**

- PWR, NRC §7.4: HP exhaust enters the MSR at 370 °F with 12% moisture. It leaves superheated at 504 °F. Chevron separators, then
  two reheater stages. Purpose: better cycle efficiency and less erosion of LP blading.
- LWR: 88% quality at a moisture separator inlet; high-velocity separators raise quality from about 85% to as much as 97% (Babcock Power,
  OEM).
- Liquid in the HP expansion "is limited to 25%" (Mines exercise, teaching; the strongest statement read for the highest figure,
  and a weak one).
- "Moisture content in excess of 12 percent will result in reduced exhaust end blading life" (Turbomachinery Magazine).
- "Heavy drain erosion in high moisture zones of over 12%" (TAMU, mechanical drive turbines).
- Fossil LP exhaust around 10%; more than 15% at both HP and LP exhausts of some SMR designs is called high moisture (Couffignal in
  POWER, an OEM executive).
- Close-to-saturation entry raises humidity, harming blades and efficiency (Dipama et al., CANDU). Gentilly-2: 32.8% thermal efficiency, Hydro-Québec's
  figure, 33.2% in the paper's model.
- Saturated LWR extraction doubles as moisture removal: extraction is "for moisture removal, feedwater heating, and reheating" (NRC
  §7.4). Separated moisture drains to an MSR drain tank.
- CRC: higher boiler pressure without superheat means "excess moisture"; reheat exists to keep exhaust moisture "at safe values".

**Own inference.**

- **The plant's exhaust quality of 0.66 to 0.75 is 25 to 34% moisture. It is outside every sourced limit: 2 to 3 times the 10 to 15%
  range.** No real turbine would run this. It follows from no superheater, no reheat and 165 bar, and it was decided in #14.
- Extraction in this model does not change exhaust quality, as it removes steam along the same line. A real wet stage removes water
  at each tap, so real exhaust would be drier. No figure was found for how much.
- Each tap on this plant is wet, quality about 0.69 to 0.80. So each heater has a condensing zone only, or a drain cooler too. There
  is no desuperheating zone, and TTD is 0 or above.
- Extraction steam here carries less latent heat per kg than on a superheated unit. Wet steam also means the tap gives water at
  saturation with the steam. An energy balance on enthalpy handles this without any special rule.
- `design-basis.md` has no moisture departure row that says this. It should get one.

## What this means for the model

Everything in this section is **own inference**.

### Hand balance

The idealised case, for orientation. All of this is an upper bound.

- Throttle: saturated steam 165 bar, 2564.6 kJ/kg, IF97. Condenser 62.8 mbar, so Return 37 °C, 155 kJ/kg.
- A straight expansion line, `IsentropicEfficiency` 0.85, on each tap. Exhaust quality 0.661 agrees with the plant's 0.66.
- Equal enthalpy steps. TTD 0. DCA 5.6 K. Drains cascaded, last to condenser.
- No line drop, no pump work, no generator loss, no radiation loss. Cycle efficiency is shaft work over heat into the water.
- Boiler: the #87 note's ε = 0.702, gas in at 450 °C, stack = 450 − 0.702 × (450 − feedwater). Efficiency interpolated from that
  note's three figures as 93.4 − 0.0486 × (stack − 160), in %. ε is held fixed; a real economizer changes with water flow.
- The 28 K limit under saturation is not applied. It does not bind at these temperatures (322 °C).

| Heaters | Final feedwater | Cycle | Stack | Boiler | Cycle × boiler | Extraction | Work, kJ/kg throttle | Full gas flow, kg/s | Full gas shaft, MW |
|---|---|---|---|---|---|---|---|---|---|
| 0 | 37 °C | 33.8% | 160 °C | 93.4% | 31.5% | 0 | 814 | 163 | 133 |
| 1 | 105 °C | 36.5% | 208 °C | 91.1% | 33.3% | 16% | 776 | 180 | 140 |
| 1 | 150 °C | 37.3% | 239 °C | 89.5% | 33.4% | 24% | 720 | 195 | 140 |
| 2 | 180 °C | 38.7% | 260 °C | 88.5% | 34.2% | 31% | 697 | 206 | 144 |
| 3 | 180 °C | 39.2% | 260 °C | 88.5% | 34.7% | 32% | 705 | 206 | 146 |
| 3 | 210 °C | 39.7% | 282 °C | 87.5% | 34.7% | 38% | 661 | 220 | 146 |
| 3 | 230 °C | 39.9% | 296 °C | 86.8% | 34.6% | 41% | 628 | 232 | 146 |
| 3 | 250 °C | 40.1% | 310 °C | 86.1% | 34.5% | 45% | 593 | 245 | 145 |
| 5 | 230 °C | 40.6% | 296 °C | 86.8% | 35.2% | 42% | 639 | 232 | 148 |

For the thermodynamic limit, with mixing heaters at the equal enthalpy optimum and no fixed final temperature, cycle efficiency is
37.5% with 1 heater at 213 °C, 39.3% with 2 at 266 °C, 40.3% with 3 at 290 °C, 41.5% with 5 at 313 °C and 42.1% with 7 at 323 °C. Relative
gains: 11, 16, 19, 23 and 25%. That is above the 15 to 17% of the TPU lecture for 7 to 8 stages on LWR, as expected with 63% sensible
heat and no line or heater losses. These temperatures are not sensible here: see the stack column.

### What follows

- **The gain is real and large: 31.5 to about 34.7%, about 10% more output per unit of gas.** It should clear any doubt about doing #88.
- **Without an air preheater, the plant's optimum is well below 230 to 250 °C.** Cycle × boiler is flat from 180 to 230 °C for three heaters.
  Above that the stack loses what the cycle wins. A 250 °C target is a figure for a plant with an air heater.
- If an air preheater brought the stack back to 160 °C, cycle × boiler at 3 heaters and 230 °C would be up to 37.3%. This is a rough ceiling. It
  ignores what hot air does to combustion, and #87 should be revisited for it. That is 2.7 points, nearly as much as the heaters' own 3.1.
- **One heater gets 1.9 of the 3.2 points**, at 105 to 150 °C. The second and third get 1.3. One heater at about 150 °C, about 4.8 bar shell, is
  close to a deaerator's job. So #40 and #88 may share a first step: a single tap at 5 to 6 bar.
- **Throttle flow rises.** Work per kg falls from 814 to about 630 kJ/kg at 3 heaters and 230 °C. For 130 MW shaft that means about 30% more
  flow, about 207 kg/s against 160. It exceeds the 200 kg/s valve capacity. At full gas the flow is 232 kg/s (245 at 250 °C, matching #88's 242).
  So the valve and rated figures need new values, as #88 says.
- **Condenser load falls.** 30 to 40% of throttle flow never reaches the exhaust. At full gas, 3 heaters and 230 °C, exhaust is about 136 kg/s
  against 163, plus the last drain. The utilities are then larger than needed, which belongs in `design-basis.md`.
- **Do not send drains straight to the condenser** unless the owner wants simple over true: that costs 2.6 points at three heaters. Cascade with
  a drain cooler is one more line in the heat balance and gives all of it back. Otherwise #88's "drains back to the condenser" should be read as
  "last drain".

### Things the model must handle

- **Extraction enthalpy:** take it on the expansion line at the tap pressure. Wet steam needs no special case; heat balance on enthalpy.
- **Tap pressure:** proportional to turbine flow, from a design value. No controller. TM 5-811-6 supports this.
- **Heater shell:** pressure from the tap less about 6% (PRESTO). Saturation temperature minus TTD sets outlet temperature, with no surface
  sizing needed. HEI 127 backs this: pressure comes from the steam, not the surface.
- **Steam flow into the heater:** follows from the heat duty. A heater draws what it needs. It is not a set fraction.
- **Low load:** extraction pressure falls and feedwater falls on its own. Drains lose their driving pressure below some load. Taking heaters in at
  5 to 20% of load is defensible as a rule, though the two figures are one Hitachi example.
- **Start-up:** no extraction with the turbine off, so the Return arrives cold. The economizer and #74's enthalpy accounting already cover that.
- **Trip:** tap pressure goes to zero at once. Check that the extraction line cannot feed back: treat as flow only from turbine to heater.
- **Rate limit:** losing the top heater drops feedwater by one step, about 50 to 60 K, in about a minute on our plant. The one figure read is
  Hitachi's 5 K/min, an example. It could be a warning, not a trip.
- **Time:** none, or one lag of about a minute. A drain level is only worth modelling if a high-level trip is wanted as gameplay.
- **Turbine stays one stage.** A tap is a split of flow at a pressure on the same expansion line. With constant efficiency, work is the sum of the
  flows times their drops. Exhaust quality is unchanged, which is a known simplification (section 9).

### Pumps

- Real plants have a condensate pump, deaerator and feed pump, with HP heaters after the feed pump.
- A closed string on one pump is thermodynamically valid (TPU). It needs tubes at boiler pressure for every heater, and the pump then carries the NPSH
  and head of both. The sim's condensation pump already feeds the boiler, so #88 alone need not add a pump.
- A feed pump belongs with #40: the deaerator is the reason for the split. Decide them together.
- A real deaerator adds 10 minutes of storage, about 100 t, and a pressure collapse risk. That is new gameplay, not a detail.

### Open decisions for the owner

- How many taps: one (150 °C), or three (180 to 210 °C).
- Final feedwater target. This note argues for 180 to 210 °C without an air preheater, not the 230 to 250 °C of #88.
- Whether the air preheater gets its own ticket. It is worth about as much again.
- Drain route: drain cooler and cascade (recommended), or plain to condenser.
- Whether #40 goes first or together.
- Whether a heater has states (in service, isolated, tripped on level) or stays passive.

## UNVERIFIED

Seen in search extracts only, or not traced to a primary source. Not used for any figure above unless stated.

- Spencer and Booth (GE, 1968): "the gains due to additional heaters typically may be only about one half the theoretical value".
- Pourshaghaghy (2016): equal rise may not be accurate for reheat cycles. It does not apply to our plant anyway.
- HEI Tech Sheet 128 on cold start, pointing to HEI A2.9 for limits. A Scribd copy could not be read.
- NRC document: rate of final feedwater temperature change limited to 320°/hour during cut-in, one plant, unit unknown (about 3 K/min if °F).
- A vendor blog figure of 15 to 30 minutes as a heater time constant. It contradicts our order of a minute and has no source.
- Simulator procedure, 670 MW coal unit: warm heaters from about 80 MW. Scribd.
- A Scribd table for a 210 MW unit at 150 kg/cm², 535 °C, with HPH outlet about 244.8 °C. This may be #88's 150 bar source; its columns are unclear.
- AP1000: seven stages of feedwater heating; HP exhaust moisture 10 to 13%, to 0.5% after separators. NRC extracts.
- Baumann rule, 1% efficiency per 1% wetness, and a 2014 study finding it too high (3.65 against 5.14% of LP output).
- About 0.9% stage efficiency per 1% average moisture. Patent extract, patent not readable.
- Mines Paris web page: extractions give almost five points, about seven with reheat, on a PWR. Page not fetched.
- Riesgo and Folgueras (2019) on running with one heater out, abstract fragments.
- Stodola's law applies when nozzles are not choked, and is strongly non-linear for high back pressure. Wikipedia mirrors and Cooke's abstract.
- LWR exhaust moisture of 20 to 25% if expansion continued with no separation. A secondary source; not traced.
- Montazeri's fuel mix and air heater. The paper's text says natural gas; the unit's real equipment was not checked.
- The BHEL steam temperature, 555 °C in the summary, 535 °C elsewhere on similar units.
- Own estimates here: the whole hand balance, the 43 s lag, tank mass. The boiler efficiency fit comes from three figures of the #87 note, itself
  a model.

Not found, after searching:

- A unit with saturated steam above about 70 bar.
- A clean published gain for exactly 1, 2 and 3 heaters on an LWR or a real fossil unit.
- A gas-fired utility boiler with air heater temperatures and feedwater temperature published together.
- A patent with 250 °C final feedwater.
- A number for extraction pressure drop other than PRESTO's and TPU's.
- A measured heater time constant.
- HEI's allowed rate of feedwater temperature change.
- A condensate pump head in metres for a 100 to 200 MWe unit.
- A part-load curve of final feedwater temperature for such a unit.
- A figure for moisture removed at wet extraction stages.
- A statement in an open source on non-return valves in TDP-1's own words.
