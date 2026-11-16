# Gland seal steam: the open-gland air leak and the steam flow

Frozen record. The plant as built is in [plant/design-basis.md](../plant/design-basis.md) and [plant/condenser.md](../plant/condenser.md); the decision this feeds is [ADR 0047](../adr/0047-gland-seal-steam-sets-the-air-in-leakage.md). Ticket #147. It builds on the in-leakage figures of [the condenser air system note](2026-11-condenser-air-system.md) and the gland steam remarks of [the SJAE motive steam note](2026-11-sjae-motive-steam.md) and [the start-up procedure note](2026-10-startup-procedure.md).

Web search, Nov 2026: two searches for an open-gland air leak and for a gland steam flow per MW. Neither returned a figure; only search snippets were seen (patents, a vendor page, a forum thread). So the two figures below are **UNVERIFIED** choices, built on the sourced EPRI numbers already in the repo, and recorded as deliberate choices in the design basis.

## Short answer

| Figure | Chosen | Label | Basis |
|---|---|---|---|
| Sealed air in-leakage | **0.0022 kg/s** (3.75 SCFM) | sourced | ASME PTC 12.2 Table 10-1 via EPRI TR-112819 §10.1 ([condenser air system note](2026-11-condenser-air-system.md), (a)); unchanged |
| Open-gland air in-leakage | **0.0347 kg/s** (60 SCFM) | UNVERIFIED | the top of the "leaky unit" probe readings, 15 to 60 SCFM (EPRI example plant, same note). No source for a fully open gland was found; real open glands are probably worse. Not inflated to force a stall (ADR 0047) |
| Gland steam flow | **0.1 kg/s** (800 lb/h) | UNVERIFIED | the one figure found: an 800 lb/h condensing capacity of a vendor example gland steam condenser (snippet, no unit size). Taken as the order of magnitude for a 200 MW unit |

## What the sources say

- Turbine glands are the first source of in-leakage on the EPRI list (condenser air system note, (a)). Small residual in-leakage cannot be avoided.
- Pressure packing flow falls with load and the vacuum packing flow is about constant; at load the high-pressure end leaks steam into the sealing header (self-sealing). Seal steam is a start-up and low-load duty (patent snippets).
- Gland steam is admitted at about 0.2 kg/cm² of vacuum on a 210 MW unit, before the main ejector (start-up procedure note); too much gland steam overheats the shaft and causes vibration. On a stationary rotor the steam bows it, which is why the rotor must turn.
- A gland condenser takes the leak-off steam and a blower holds a slight vacuum on the glands; the condensate drains back to the cycle (vendor snippets).

## Inference

**Open-gland rate and the stall.** With the SJAE alone (0.96 m³/s, V = 450 m³) the air settles at m = L·V/S. At 0.0022 kg/s that is 1.0 kg, about 2 mbar of air. At 0.0347 kg/s it is 16 kg, about 31 mbar of air: the design vacuum (31 mbar) is spent on the air alone, with the shell vapour pressure on top (the headless scenario settles near 60 mbar). The 25 m³/s-class air pump still pulls either case below 1.5 mbar of air (m = L·V/26), so the pump hogs and the SJAE alone stalls.

**Steam flow and the water.** 0.1 kg/s is under 0.1% of the rated steam flow (about 158 kg/s). The heat it takes from the boiler is about 0.1 × 2000 kJ/kg = 200 kW, which the boiler makes up. The gland condenser returns it as condensate to the hotwell, so the loop water is conserved.

## Open questions

- A sourced open-gland leak or an OEM gland steam flow for a 100 to 200 MW unit.
- The seal pressure (0.2 kg/cm² vacuum on the 210 MW unit): not modelled (ADR 0047).
