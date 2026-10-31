# Cold startup: how real plants do it

Frozen research record. The plant as built is in [plant/design-basis.md](../plant/design-basis.md); the related bypass loop research is [2026-10-feedwater-loop.md](2026-10-feedwater-loop.md).

Web research, Oct 2026, to understand the real cold-start sequence behind the simulator's manual startup.
The sources are patents, training slides, course notes and sample plant procedures, not an OEM manual.
Every number below varies by unit and is quoted to show an order of magnitude, not to copy. Lines marked
**Sim** compare the finding with the simulator and are our own reading, not from a source.

## The sequence

1. **Turbine on turning gear.** A cold start begins with the rotor on the barring (turning) gear so the
   shaft does not bow. Barring time runs from 5–30 min for a cold machine to over 1 h for a hot one.
   Main steam lines are warmed with drains open.
2. **Condenser vacuum.** Vacuum is pulled with ejectors or a vacuum pump. One procedure establishes the
   gland seal at about 0.2 kg/cm² vacuum and brings the main ejector in at about 0.7–0.8 kg/cm². Too
   much gland steam overheats the shaft locally and causes vibration.
3. **Fill the drum** to normal operating water level. Fill water should be within about 28 °C of the drum
   temperature.
4. **Light off at the lowest firing rate and raise pressure.** Firing sets the pressure rise, limited by
   the saturation-temperature rate and drum thermal stress (see the limits table). A slight steam flow is
   kept through the superheater (start-up vent open); one manual limits furnace exit gas to 540 °C until
   reheater steam flow is established.
5. **Bypass holds pressure.** The HP bypass lets the boiler run independently of the turbine and raises
   steam conditions to a level the turbine accepts for rolling. It is set to hold the upstream pressure
   plus a bias before steam enters the turbine.
6. **Warm and roll.** In one cold-start patent the turbine leaves turning gear once main steam pressure
   can create vacuum in the turbine, about 400–500 psig (28–35 bar), then prewarms. Steam is admitted only
   once its temperature is within limits of the metal temperature; cool steam on hot metal is thermal
   shock. The chest warms through controlled flow, as careless admission has cracked steam chests.
   Procedures hold a low speed to warm up (300–500 rpm, for example 500 rpm for 15 min on a cold start).
7. **Run up past critical speeds.** Critical speeds are crossed without delay; stopping in the critical
   range is forbidden.
8. **Synchronize and load.** As the turbine valves open, the bypass closes to hold pressure. Once it is
   fully closed, control moves from bypass pressure control to turbine control, and pressure may slide up
   toward rated. After sync the drains close (one procedure at 25 % load). A sample procedure holds an
   initial load for 20 min while checking differential expansion, rotor position, metal temperatures and
   vibration.

## Limits quoted

| Quantity | Value | Source |
|---|---|---|
| Saturation-temperature rise, drum | 100 °F/h (about 55 °C/h) | training guide |
| Same | 110 °C/h, from the start-up curve | boiler operations slides |
| Same | 1 K/min (EN 12952-3 governs) | plant paper |
| Roll pressure, large unit | about 28–35 bar | cold-start patent |
| Roll pressure, one cold-start procedure | about 40 kg/cm² at 350 °C | see the feedwater research |
| Warm-up speed | 300–500 rpm, 15 min | sample procedures |

No source gave a minimum superheater flow value. The sources disagree on the rise rate, so the boiler
manufacturer's start-up curve governs.

## Sim

- **Roll gate.** `MainSteamValveMinimumPressure` is 10 bar (`src/context/const.ts`), below the 28–40 bar
  the large-unit sources roll at. It has no steam-temperature or metal-temperature permissive.
- **Heating rate.** The sim relaxes the limit to 24 K/min (alarm only) to start in about 15 min; the
  register has the reasoning in [plant/design-basis.md](../plant/design-basis.md).
- **Not modeled:** turning gear, gland steam, desuperheating, warm-up hold, critical speeds, drains.

## Sources

- [US5361585A, Steam turbine split forward flow](https://patents.google.com/patent/US5361585)
- [US5018356A, Temperature control of steam to minimize thermal stresses](https://patents.google.com/patent/US5018356)
- [US5435138, Reduction in turbine/boiler thermal stress during bypass operation](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/5435138)
- [US4329592A, Steam turbine control](https://patents.google.com/patent/US4329592)
- [US4598551, Controlling steam turbine operating conditions during starting and loading](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/4598551)
- [Cold plant startup and operating procedures](https://open-exam-prep.com/study-guides/md-boiler-operator/operations-maintenance-troubleshooting/md-bo-plant-startup)
- [Boiler light up and loading (slides)](https://www.slideshare.net/slideshow/boiler-light-up-loading-250463824/250463824)
- [Steam turbine operation and maintenance (course notes)](https://ryleymcc.github.io/Power-Engineering/2%20B1/2%20B1%20Chapter%203%20-%20Steam%20Turbine%20Operation%20and%20Maintenance/index.html)
- [Turbine rolling (slides)](https://www.slideshare.net/BhimarajuKanireddy/final-turbine-rolling-ppt-akshaypptx)
