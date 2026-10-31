# Sizing check, October 2026

Frozen record. The conclusions are in [design-basis.md](../plant/design-basis.md).

Steam flow was measured with the headless runner: from the `at-pressure` snapshot (10 bar), full gas, main steam valve and bypass open, boiler level held by the loop operator.

| | Result |
|---|---|
| Steam generation at full gas | 171 kg/s (about 615 t/h), steady, at 10.4 bar and 182 °C |
| Heat per kg of steam | 2.09 MJ/kg (357 MW ÷ 171 kg/s), consistent with the energy balance |
| Plant class | about 180–200 MWe; a real unit of that size passes about 170–180 kg/s |
| Max gas flow | 12 m³/s is about 420 MW of fuel, in line with a 200 MWe unit; the old "typical 700–900 L/s" comment describes a small industrial boiler (#15) |
| Condensation pump | 300 L/s is about 1.5× the 171 kg/s steam flow, a normal feedwater margin |
| Boiler volume | 100 m³ total, 50 m³ of water, on purpose reduced for playability; not verified against a real data sheet |

Not measured: generation near the 165 bar working pressure (estimated to be about the same).

The measured bypass flow was 342 kg/s, twice the generation and above the 200 kg/s valve limit (#32).
