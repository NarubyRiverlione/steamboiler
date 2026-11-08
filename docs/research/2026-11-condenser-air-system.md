# Condenser air system: figures for a physical condenser pressure

Frozen research record for #100 (ticket A of #91). The condenser as built is in [plant/condenser.md](../plant/condenser.md); the
exchanger it sits beside is in [ADR 0032](../adr/0032-limited-condenser-and-stream-enthalpy.md) and
[2026-11-condenser-heat-transfer.md](2026-11-condenser-heat-transfer.md) (§6 already covers air blanketing; not reopened). The
SJAE steam supply is in [2026-11-sjae-motive-steam.md](2026-11-sjae-motive-steam.md). The model these figures feed is in
[ADR 0035](../adr/0035-condenser-pressure-is-vapour-plus-air.md).

Web research, Nov 2026. Question: five figures for a one-shell condenser of a ~125 MWe unit with about 158 kg/s of exhaust
(1.25 million lb/h): (a) air in-leakage, (b) shell steam-space volume, (c) air pump and SJAE capacity and suction limits,
(d) exhaust hood relief pressure, (e) vacuum decay time.

Facts are marked **sourced** or **UNVERIFIED**; our own arithmetic is marked **inference**. The "Read?" column says how a source was
seen: **text** means PDF text was extracted and read; **summary** means the page was fetched through a summarising tool, so its
wording is not a quotation; **snippet** means search-result text only, which is never counted as read.

**The main limits of this note.**

- **The HEI tables are paywalled and unread.** HEI Standards for Steam Surface Condensers, Table 8 (hogging capacity), Table 9
  (air leakage design values) and ASME PTC 12.2. Only their worked examples and ASME Table 10-1, reprinted in EPRI, were seen.
- **No source gives a shell steam-space volume.** Four searches found none. The figure in (b) is derived and UNVERIFIED.
- **No source gives a vacuum decay rate for a steam surface condenser.** The HEI rate is said to exist (a forum thread), but its
  number was not found. (e) rests on our own arithmetic.
- **The hood relief pressure has two agreeing sources of weak kind** (a plant blog, an old patent) and one disagreeing snippet.
- The ScienceDirect failure analysis of the relief diaphragm returned HTTP 403; its figure is a search snippet only.

## Sources

| Source | What it is | Strength | Read? |
|---|---|---|---|
| [EPRI TR-112819, Condenser In-Leakage Guideline (2000)](https://restservice.epri.com/publicdownload/TR-112819/0/Product) | industry research body; states HEI and ASME air criteria with worked examples | strong | text (§2.2, sections 8.3.8 and 10.1, Table 10-1) |
| [Nadig, Evacuation systems for steam surface condensers (ASME POWER 2016)](https://maarky.com/wp-content/uploads/2016/06/ASME-2016-POWER-CONFERENCE-Charlotte-FINAL-02-22-2016.pdf) | vendor conference paper; Tables 1 and 2 of typical ejector and vacuum pump sizes | medium | text |
| [POWER, Condenser backpressure high? Check vacuum system sizing](https://www.powermag.com/condenser-backpressure-high-check-vacuum-system-sizing) | trade press; HEI Table 9 worked example, pump test | medium | summary |
| [HEI Tech Sheet 110, Vacuum systems](https://assets.noviams.com/novi-file-uploads/hei/TDS/Vacuum/FINAL_Tech_Sheet_110_-_Vac_Sys-Understanding_A_Key_Component_of_a_Modern_Power_Plant-f138f0fb.pdf) | trade body sheet, not the Standard | medium | text |
| [Graham, Surface condenser operation and maintenance](https://graham-mfg.com/wp-content/uploads/2023/06/OMI_SC_0401_surface_conderser.pdf) | vendor manual | medium | text |
| [Inside Power Station, exhaust hood pressure and temperature](https://idpowerstation.blogspot.com/2012/02/exhaust-hood-pressure-and-temperature.html) | plant blog | weak | summary |
| [US 5,222,862, Turbine generator pressure relief diaphragm](https://patents.google.com/patent/US5222862) | patent, background statement | weak | snippet |
| [ScienceDirect, Failure analysis of an atmospheric relief diaphragm in the low pressure steam turbine](https://www.sciencedirect.com/science/article/abs/pii/S1350630724009816) | journal abstract | medium | snippet only (403) |
| [BSB Systems, Overpressure protection for steam turbines and condensers, #77-3002](https://bsbsystems.com/en/Catalogues-Publications/Catalogs/77_3002_DV_F.pdf) | vendor catalogue | weak | snippet |
| [CR4 thread, Vacuum drop code requirements](https://cr4.globalspec.com/thread/38034/Vacuum-Drop-Code-Requirements) | forum thread | weak | snippet |

Not read: HEI Standards for Steam Surface Condensers (Tables 8 and 9), ASME PTC 12.2, VGB-S-131, the HEI rate-of-vacuum-drop
criterion, OEM condenser datasheets.

Units used below: 1 SCFM of air (60 °F, 14.7 psia) is 0.0283 m³/min at a density of 1.2255 kg/m³, so **1 SCFM = 5.78·10⁻⁴ kg/s**
(inference; EPRI's own pair "30 SCFM = 135 lb/h = 61 kg/h" gives 5.7·10⁻⁴).

## (a) Air in-leakage for a unit this size

**Sourced.**

- Design venting capacity is tabulated by exhaust steam flow per opening, number of shells and openings (HEI Table 9). The one worked
  example read: a 500 MW unit, two shells, one opening each, 2.3 million lb/h, design air leakage **30 SCFM** (135 lb/h, 61 kg/h
  of dry air), plus 297 lb/h of vapour at 1.0 inHgA and 71.5 °F (EPRI TR-112819, section 2.2.1).
- The acceptable upper limit before condenser performance suffers (ASME Table 10-1, reprinted in EPRI §10.1): one shell,
  1 to 2 million lb/h of exhaust, **3.75 SCFM**; one shell 500 000 to 1 million lb/h, 3.0 SCFM; two shells 2 to 4 million lb/h, 7.5 SCFM.
- Westinghouse proposed a residual in-leakage of **1 SCFM per 100 MW** as acceptable (EPRI §10.1). For 500 MW that is 5 SCFM, lower than ASME's 7.5.
- A tight system reads 1 to 5 SCFM on the leak-location probes; a leaky one 15 to 60 SCFM (EPRI, example plant probe readings).
- Sources of leakage: turbine glands, atmospheric relief valves and vacuum breakers, rupture disks, drains, instrument lines (EPRI).
- Small residual in-leakage "cannot be avoided" (EPRI §10.1). Venting equipment "normally has excess capacity", so a rise in in-leakage
  can be masked until the system is overloaded (EPRI §8.3.8).

**Inference for our unit.** About 158 kg/s is 1.25 million lb/h, one shell: the ASME limit is 3.75 SCFM = **0.0022 kg/s**; the Westinghouse figure
for 125 MW is 1.25 SCFM = 0.0007 kg/s. The design venting capacity is larger. HEI's 500 MW example (30 SCFM at 2.3 million lb/h) scales linearly to about 16 SCFM at our 1.25 million lb/h (we do not know HEI's scaling, so this is a guess): **15 SCFM = 0.0087 kg/s** as an upper "leaky unit" figure.

**The existing `LeakingRate`** is 0.01 kg/s, "typical 0.005 to 0.015 kg/s" (`const.ts`), unused and with no source in the repo.
It equals 17 SCFM, near the 15 SCFM estimated above for our own size; it is UNVERIFIED and not a tight-unit value.

## (b) Shell steam-space volume

**Sourced.** None. Hogger capacity "is determined by the volume of the system and the time allowed to reduce the pressure" (HEI Tech Sheet
110). The hogger tables are sized for about 30 minutes from atmosphere to 10 inHgA (HEI Table 8, via EPRI §2.2.1, Tech Sheet 110, Maarky).
"At very high vacuum only a few pounds of steam are contained in the steam space" (CED course; snippet).

**Inference (UNVERIFIED).** Maarky's Table 1 pairs a 10 SCFM holding ejector with a 200 SCFM hogger. Taking that pair for our size class,
the hogger moves 200 SCFM, at 338 mbar (10 inHgA) the actual flow is 0.288 m³/s. Volume V from t = (V/S)·ln(P₀/P₁) with t = 1800 s:
V = 0.288 × 1800 / ln(1013/338) = **about 470 m³**. The pairing of 10 SCFM holding to our unit is itself a guess (§c), and the model of
a constant volumetric flow is crude, so the volume is good to a factor of 2 at best. The ADR rounds to 450 m³ and marks it UNVERIFIED.
It includes the exhaust neck and the turbine casing, which the hogger also evacuates (Graham).

## (c) Air pump and SJAE capacity and suction limits

**Sourced.**

- Design suction pressure for electric generating service: "1.0 inch HgA or the condenser design pressure, whichever is lower" (EPRI §2.2.1, HEI),
  33.9 mbar.
- Typical holding/hogging capacity pairs, SCFM (Maarky Tables 1 and 2): 5/50, 7.5/100, 10/200, 12.5/350, 15/700, 17.5/1050, 20/1400. Hogger steam
  0.06 to 1.6 kg/s. Vacuum pump motor 40 to 125 HP.
- Hogging: evacuation "from atmospheric pressure to typically 10 inHgA, or a pressure specified by the turbine supplier, in about 30 minutes"
  (Maarky); "usually 30 to 60 minutes" (Graham); about 30 minutes (EPRI, HEI Tech Sheet 110).
- Test example (POWER): a pump to the HEI requirement of 15 SCFM dry air at 1 inHgA and 71.5 °F must move **57.5 m³/min** of the air and
  vapour mix; a liquid ring pump was tested at 29 m³/min at 33.9 mbar with 25 °C seal water and credited a condensation factor of 0.5.
- A steam jet air ejector designed for 1.0 inHgA "will rise to 4 to 5 inHgA with only a moderate increase in air in-leakage above design": the
  "break". A liquid ring pump at 60 °F water holds 1.0 inHgA at 30 SCFM and rises only to 1.25 inHgA at 43 SCFM (EPRI §8.3.8).
- A liquid ring pump cannot go below the vapour pressure of its seal water: at 90 °F water (1.42 inHgA) it cannot operate at 1.0 inHgA, so the
  design cooling water for the pump is derived from the condenser's initial temperature difference (EPRI §2.2.1).
- Practice: 2 × 100% or 3 × 50% liquid ring pumps; ejector packages 2 × 100% (EPRI). A hogger ejector is shut down after the evacuation (EPRI, Tech Sheet 110).
- Motive steam must be dry; 150 psig / 400 °F; ejector works at −0/+10% of design pressure ([sjae note](2026-11-sjae-motive-steam.md)).

**Inference.** Volumetric flow of air at the suction: S = ṁ / ρ with ρ = P / (R·T), T = 293 K. At 33.9 mbar, 1 SCFM needs 0.0143 m³/s.

| Machine | Size class | Air-only volumetric capacity | Basis |
|---|---|---|---|
| Holding (SJAE, 2 × 100%) | 10 SCFM = 0.0058 kg/s | **0.144 m³/s at 33.9 mbar** | class between ASME limit 3.75 and HEI 500 MW 30 SCFM; UNVERIFIED pick |
| Holding SJAE, mixture rate (adopted in the ADR) | 15 SCFM air plus vapour | **0.96 m³/s** (57.5 m³/min at 33.9 mbar) | POWER, HEI Table 9 worked example; unit size not stated |
| Hogger / air pump in real plants | 200 SCFM at 10 inHgA | 0.288 m³/s at 338 mbar | Maarky pair 10/200 |
| Air pump needed for a 1 min pull-down | — | **about 26 m³/s** at V = 450 m³ (S = V·ln(1013/31)/60) | our requirement, not a real size; 90× the real hogger |

The real hogger takes 30 minutes; one minute needs ~30 times the displacement. That is the over-dimensioned utility the issue asks to record.
The air-only convention drops the vapour share that real pumps carry, which makes the sized values lower than the real ones.

**Suction limits chosen from the sources.** A real pump floor is the condenser design pressure, 31 mbar, or the seal water vapour pressure (design suction rule); ADR 0035 does not adopt it, because the model's pumps move air only.
SJAE break: 4 to 5 inHgA = 135 to 169 mbar; the ejector holds only below that. The pump hogs, the SJAE holds.

## (d) Exhaust hood relief pressure

**Sourced.**

- Atmospheric relief diaphragms sit on the exhaust hood and burst at **0.34 barg** of casing steam pressure; "all steam is relieved at 1.03 barg or
  greater" (Inside Power Station, blog). A background statement in an old patent gives "approximately five pounds greater than external pressure"
  (US 5,222,862), which is 0.34 bar. Two weak sources that agree.
- A failure analysis of an LP-turbine relief diaphragm gives a design burst above **0.7 barg** (search snippet of the abstract only, 403; UNVERIFIED).
- The same blog says "all steam is relieved at 1.03 barg or greater" (full relief, not the burst pressure).
- Construction: flat copper, lead or aluminium discs over a support grid, a cutting edge to slice them (vendor catalogue; snippet).
- The blog gives a maximum vacuum of about 0.036 bara "due to exhaust hood casing strength" and an hood temperature trip of 107 °C.

**Inference.** Absolute ceiling: 1013 + 0.34 × 1000 = **about 1353 mbar** (1358 with the patent's 5 psi). The model's ceiling is the pressure where the
diaphragm bursts; above it the hood vents to the atmosphere and the plant is lost anyway. The vacuum limit trip at 327 mbar (ADR 0003) comes first by a factor 4.

## (e) Sourced vacuum decay time

**Sourced.** Nothing usable.

- The rate of vacuum drop is "defined in the HEI standard", but no number was found (CR4 thread; snippet). The same thread notes that from a normal
  29 inHg it may take **20 to 25 min** to reach a turbine protection setpoint. That is an operating remark, not a criterion, and the unit is unknown.
- For air cooled condensers the VGB code states the criterion as an air leakage rate that must stay below the holding unit's capacity, not as a pressure rise
  per minute (snippet). A 4 to 24 hour hold test is cited for air cooled condensers (trade blog; unverified).
- HEI vacuum decay test as a method: pull full vacuum, isolate, monitor for 30 minutes (trade blog; UNVERIFIED).

**Inference (what the sourced inflows give).** Air mass in the shell from the ideal gas law, V = 450 m³, a fixed 293 K (the ADR uses the shell saturation temperature, so the air mass at 327 mbar is about 15% lower there): 16.6 kg at 31 mbar, 175 kg at 327 mbar (the trip
limit). With the vacuum system stopped and the leak running at a constant rate:

| In-leakage | kg/s | 31 → 62 mbar | 31 → 327 mbar (trip) |
|---|---|---|---|
| Westinghouse, 125 MW | 0.0007 | about 6.5 h | about 60 h |
| ASME acceptable limit, 3.75 SCFM | 0.0022 | about 2.1 h | about 20 h |
| HEI-class design leakage, 15 SCFM | 0.0087 | about 32 min | about 5 h |
| Existing `LeakingRate` | 0.01 | about 28 min | about 4.4 h |

For V between 300 and 600 m³ the times scale in proportion. The leak runs at a nearly constant mass rate because the flow through a leak chokes
below about half atmospheric pressure (inference, ideal gas; not sourced).

**Finding: the design's claim that the vacuum "takes minutes" to be lost is not supported by these figures.** The 20 to 25 min of the forum thread needs about
0.13 kg/s, which is 220 SCFM, 15 to 190 times a sourced in-leakage. A real trip also opens the vacuum breaker and loses the gland steam seal, which add
leakage that this model does not have. With the sourced values, the pressure rises over hours. The ADR records that choice.

## What the numbers mean for the ticket

- (a) is sourced as a range: 0.0007 to 0.0087 kg/s. A tight unit sits at the ASME 3.75 SCFM, 0.0022 kg/s.
- (b) is a derived estimate, 450 m³, UNVERIFIED; it also sets the pull-down pump size and the decay time.
- (c) holding capacity 0.144 m³/s (air only, size-class pick) or 0.96 m³/s (the sourced HEI mixture rate, adopted); the suction limits (design pressure floor, 135 to 169 mbar break) are sourced.
- (d) 0.34 barg, 1353 mbar abs, two weak sources that agree.
- (e) has no source; the arithmetic says hours, not minutes.

## Open questions

- HEI Standards for Steam Surface Condensers Table 8 and Table 9 would fix (a), (b) and the holding size in one read.
- A shell steam-space volume from any OEM datasheet of a 100 to 200 MW unit.
- The HEI rate-of-vacuum-drop criterion.
