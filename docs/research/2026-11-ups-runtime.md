# UPS runtime and recharge time

Frozen research record. The plant as built is in [plant/design-basis.md](../plant/design-basis.md); the decision is [ADR 0055](../adr/0055-the-vital-bus-and-the-safety-bus.md). Ticket #143.

**Provenance.** One web search for #143; the results gave snippets from vendor and utility papers, not the IEEE texts. Everything here is **UNVERIFIED** as a figure for a 130 MW gas-fired unit.

## Short answer

| Figure | Real plant | In the model | Basis |
|---|---|---|---|
| Runtime on the battery (autonomy) | 8 to 10 hours (IEEE 485 duty cycles for station batteries; a power plant source asks for at least 8 h; 10 h is common for switchgear control power) | **30 minutes** (`CstUps.NominalRuntime`, 1800 s) | the owner's figure: a deliberate reduction so the loss of the Auxiliary bus is a pressure on the operator within a play session |
| Recharge, empty to full | 8 to 12 h target, charger sized for 15 h at most | **8 hours** (`CstUps.RechargeTime`, 28800 s) | the low end of the sourced range, one fixed rate (no boost charge, no taper) |

## Notes

- A real station battery is DC and feeds inverters for the essential AC; the model has no DC distribution, one percentage stands for the lot.
- The model drains at one constant rate (100% over the runtime) whatever the load; a real battery's capacity depends on the load and its age (IEEE 485 duty cycle method).
- The recharge is 16 times slower than the drain, as in a real plant: the operator cannot cycle the Auxiliary bus for free.

## Sources

- IEEE 485 (sizing of lead-acid station batteries) and IEEE 946 (DC systems), as described in a Vertiv BATTCON paper on power plant battery maintenance and an eepower.com article on station batteries and DC supply; the autonomy and recharge figures come from vendor and utility guidance in the same search (Riello UPS autonomy definition, a Snowy Hydro DC and essential AC design philosophy). Not re-read.
