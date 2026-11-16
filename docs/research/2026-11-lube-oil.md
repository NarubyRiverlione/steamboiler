# Turbine lube oil: header pressure, permissive and trip limits, build and decay

Frozen research record. The plant as built is in [plant/design-basis.md](../plant/design-basis.md) and [plant/turbine.md](../plant/turbine.md); the decision this feeds is [ADR 0050](../adr/0050-lube-oil-pressure-permissive-and-trip.md). Ticket #145.

Web search, Nov 2026. Every source below was seen as a **search snippet only** (plant write-ups, forum threads and flashcards, no OEM document); none was read in full. So no figure is **sourced** in the strict sense: the values are plant-specific examples, and the chosen numbers are **UNVERIFIED** estimates, recorded as deliberate choices in the design basis. Pressures are gauge (bar g); 1 kg/cm² is about 0.98 bar.

## Short answer

| Figure | Chosen | Label | Basis |
|---|---|---|---|
| Normal header pressure | **1.0 bar g** | UNVERIFIED | Eng-Tips thread: normal 0.8-1.2 bar; another plant 2.5 kg/cm²; the range across plants is 0.8-2.5 bar |
| Permissive to roll (open the turbine valve) | **0.7 bar g** | UNVERIFIED | Eng-Tips: AC auxiliary pump auto-starts at 0.69 bar; turning-gear permissives in other plants sit just under normal (1.95 of 2.5 kg/cm²) |
| Low-pressure trip | **0.4 bar g** | UNVERIFIED | Eng-Tips: turbine trip at 0.4 bar; another plant trips at about 6 psig (0.4 bar); a GE gas turbine unit trips at 0.5 bar |
| Pressure build after pump start | first-order lag, **time constant 5 s** | UNVERIFIED estimate | no source; a header fed by a pump reaches pressure in seconds to tens of seconds |
| Pressure decay after pump stop | first-order lag toward 0, **time constant 20 s** | UNVERIFIED estimate | no source; the header drains through the bearings, slower than it builds; a real stop is bridged by the emergency pump, which is out of scope (#145) |
| Trip delay | **none** | choice | some plants delay 10 s; the first cut trips at once |

## What the snippets say

- A plant document: normal header 2.5 kg/cm², low setpoint 2.2, a low-low switch at 1.8 kg/cm² starts the emergency pump.
- Another plant: low-pressure trip about 6 psig (2 of 2 voting, about 0.4 bar).
- Eng-Tips (qid 432438): header 0.8-1.2 bar normal, AC auxiliary pump starts at 0.69 bar, DC pump at 0.59 bar, turbine trip at 0.4 bar.
- A Scribd turbine write-up: a staged scheme with a trip near 0.9 bar after a 10 s delay and a second trip near 0.6 bar at once.
- A Control.com GE gas turbine thread: auxiliary pump starts at 1.2 bar, trip switch at 0.5 bar.
- A DCS interlock document: turning gear motor auto-engage needs lube oil header above 1.95 kg/cm² (and jacking oil above 90 kg/cm²). The turning gear permissive itself is #146.

The ladder is the same everywhere: normal, then permissive just under it, then pump start, then trip. The numbers differ by machine.

## Flags for the ADR

1. Every number is UNVERIFIED. They are scaled to the Eng-Tips 1 bar class because it is the one source with a full ladder in bar.
2. Time constants are estimates with no source; tune them in the headless runner, never to speed a process up.
3. The emergency pump (coast-down protection) is real and is left out on purpose: with only one pump, stopping it while the turbine runs is the trip scenario.

## Sources

- [Eng-Tips thread: lube oil pressure ladder](https://www.eng-tips.com/viewthread.cfm?qid=432438) (snippet)
- [Control.com: low lube oil bearing header pressure](https://control.com/forums/threads/low-lube-oil-bearing-header-pressure.45390/post-45390) (snippet)
- [Scribd: Turbine STG-1](https://www.scribd.com/document/318928734/Turbine-STG-1) (snippet)
- [Scribd: System Writeup](https://www.scribd.com/document/808890803/System-Writeup) (snippet)
- [Scribd: DCS interlocks](https://www.scribd.com/document/720916085/DCS-interlocks-DH-jhd) (snippet)
