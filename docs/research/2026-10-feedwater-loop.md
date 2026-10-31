# Feedwater loop: how real plants run it

Frozen research record. The loop as built is in [plant/feedwater-loop.md](../plant/feedwater-loop.md); the makeup decision is [ADR 0002](../adr/0002-makeup-into-hotwell.md).

Web research, Oct 2026, to settle the open decisions of issue #19 (bypass loop scenario). The loop is
boiler → main steam valve → bypass → condenser → hotwell → condensation pump → boiler. "Real plant"
statements below are sourced; the numbers under **Sim decision** are our own scaling to the
simulator (agreed on #19) and are not from a source.

## Startup through the bypass

Matches the manual procedure used in the sim: open the bypass as soon as there is pressure and keep
dumping steam to the condenser until conditions suit rolling the turbine.

- The HP/LP bypass lets the boiler run and load independently of the turbine, to raise steam
  conditions quickly to a level acceptable for rolling.
- Steam is dumped to the condenser continuously until temperature, pressure and flow match the
  turbine (rotor and casing metal temperatures).
- Bypass steam is desuperheated with injected water so the condenser doesn't overheat. The sim has
  no desuperheating.
- Rolling conditions are plant-specific; one cold-start procedure raises main steam to about
  40 kg/cm² / 350 °C before rolling. The sim's main steam valve gate is 10 bar.

## Boiler (drum) level

- Level is held automatically by feedwater flow, typically with **three-element control**: drum
  level, steam flow (feedforward) and feedwater flow.
- Alarm and trip setpoints are in mm around the normal water level (NWL) and set by the boiler
  manufacturer for that drum. Examples vary widely: alarms ±125 mm / ±250 mm; high 150, high-high
  180, low trip −225 mm; low trip −375 mm.
- The low trip is chosen so there is time to trip before the tubes are exposed (holdup volume
  between NWL and the low-low trip).

**Sim decision** (boiler capacity 100,000 L):

| Boiler | Level |
|---|---|
| Target | 50% (50,000 L) |
| Control band | ±5% |
| Alarm | ±12% |
| Trip | below 30%, above 70% |

## Makeup goes into the hotwell

In real plants, makeup water is added to the **condenser hotwell**, not the boiler. The hotwell has
its own level control:

- low level: makeup pump/valve feeds from a makeup storage tank
- high level: a reject (dump) valve returns condensate to the storage tank
- one plant's example: hotwell held at 66–71%, makeup opens at about 66%, reject at about 76%

**Decided (#19):** makeup goes into the hotwell, as in real plants, not into the boiler. The
condensing steam heats the makeup water before it reaches the boiler. The sim gets a hotwell
makeup valve and a reject valve. The boiler fill valve is removed: the boiler is fed only by the
condensation pump, like a real feedwater supply. The drain valve stays.

**Sim decision:** hotwell target about 70%, makeup below about 65%, reject above about 75%.

## Water losses

- Cycle losses in normal operation: about 0.5% of steam flow; makeup systems are sized for about
  1.5% of main steam flow (US Army Corps of Engineers-derived design guide).
- Boiler blowdown is a separate, deliberate loss: 1–10% of feedwater depending on water quality
  (sources disagree on the range).

**Sim decision:** the sim models no leaks, vents or blowdown, so any change in total water is a
model error. Assert conservation within 0.1% over a run, apart from explicit makeup, reject and drain.
Realistic losses (0.5–1.5% of steam flow) would be a separate, deliberate feature.

## Control: operator hook, not fixed valves

Real plants run drum level and hotwell level as automatic control loops. In the sim, a per-tick
operator hook in the scenario plays that role: it sets the condensation pump valve (the sim's
feedwater path) to hold boiler level, and cooling water to keep the condenser condensing what the
bypass delivers.

## Sources

- [Control Engineering: Optimizing drum level measurement](https://www.controleng.com/articles/optimizing-drum-level-measurement/)
- [Crossco: Three Element Drum Level Control](https://www.crossco.com/?p=124774)
- [control.com: 1-Element vs. 3-Element Level Control](https://control.com/forums/threads/1-element-vs-3-element-level-control.32690/post-32690)
- [US7053341B2: Drum level control for drum-type boilers](https://patents.google.com/patent/US7053341)
- [Scribd: Boiler Interlock and Protection](https://www.scribd.com/doc/204599123/Boiler-Interlock-and-Protection)
- [Scribd: Aux boiler onboard test procedure](https://www.scribd.com/document/447116483/Aux-boiler-onboard-test-procedure)
- [Scribd: ID/FD Logic System](https://www.scribd.com/doc/94643170/03-ID-FD-Logic-System)
- [Eng-Tips: Steam drum holding time](https://eng-tips.com/threads/steam-drum-holding-time.98735)
- [CED Engineering: Steam Power Plant Water Supply and Testing](https://www.cedengineering.com/userfiles/An%20Introduction%20to%20Steam%20Power%20Plant%20Water%20Supply%20and%20Testing%20R1.pdf)
- [NREL: boiler blowdown (fy01osti/27655)](https://nrel.gov/docs/fy01osti/27655.pdf)
- [The Value of Good Boiler Blowdown Control](https://www.marketscale.com/industries/healthcare/the-value-of-good-boiler-blowdown-control.md)
- [AMETEK: Condenser hotwells](https://www.ametek-measurement.com/industries-and-applications/power-generation/condenser-hotwells)
- [Brainscape: Condensate System flashcards](https://brainscape.com/flashcards/condensate-system-cd-2597336/packs/4550052)
- [US Patent 3955358: HRSG fluid level control](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/3955358)
- [Power Engineering: Proper Steam Bypass System Design](https://www.power-eng.com/gas/turbines/proper-steam-bypass-system-design-avoids-steam-turbine-overheating/)
- [Scribd: HP/LP Bypass System](https://www.scribd.com/document/518547851/HPLP-BYPASS-SYSTEM)
- [Power Engineering: New procedure speeds cold start, protects turbine](https://www.power-eng.com/coal/new-procedure-speeds-cold-start-protects-turbine/)
- [Scribd: Steag cold startup](https://www.scribd.com/document/516569625/Steag-sccl-Clod-Startup)
