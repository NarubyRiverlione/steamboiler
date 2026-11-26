# Auxiliary power of the pumps and turbine auxiliaries

Frozen research record. The plant as built is in [plant/design-basis.md](../plant/design-basis.md) and [plant/turbine.md](../plant/turbine.md); the milestone this feeds is [ADR 0046](../adr/0046-from-island-to-town-grid-in-milestones.md) M2. Ticket #140.

**Provenance.** Found by web search for #140; the search results gave snippets, not the datasheets. Everything except the turning gear motor is an **UNVERIFIED estimate**.

## Short answer

| Consumer | Rated power | Basis | Label |
|---|---|---|---|
| Boiler feed pump | **4.5 MW** | hand estimate from the ticket; a feed pump takes about 2 to 4% of a unit's output (coal, ultra-supercritical study), and this 165 bar unit is at the low end of that | UNVERIFIED, no datasheet for a 130 MW unit |
| Recirculation pump (cooling water) | **1.75 MW** | hand estimate (1.5 to 2 MW) for 7400 l/s | UNVERIFIED |
| Condensation pump | **0.4 MW** | hand estimate | UNVERIFIED |
| Air extraction pump | **0.1 MW** | a liquid ring pump of 2500 m³/h has a 55 kW motor (Edwards catalogue); the model's shaft power is 55 kW (`CAR_ShaftPower`), so 0.1 MW is generous | catalogue, generic |
| Lube oil pump | **0.1 MW** | hand estimate; a 113 MW BBC unit lists an auxiliary oil pump with a 30 HP motor (about 22 kW), so 0.1 MW is over-dimensioned | UNVERIFIED, high |
| Turning gear motor | **0.03 MW** | a 110 MW turbine specification gives a 30 kW electric motor | sourced (spec sheet snippet) |

Total at full draw: about 6.9 MW, 5.2% of the 133.7 MW rated output. A combined cycle is 2 to 5% of the capacity and a coal unit 5 to 8% (general figures); a gas-fired steam unit with a 165 bar feed pump sits in between.

## Caveats

- **No datasheet** for a 130 MW gas-fired drum unit was found for the feed, condensation or circulating water pumps; the sizes follow the share of the output, not an equipment list.
- A real feed pump is often **steam-driven** (a turbine drive on a unit of this size), which takes no electric power; the model uses an electric motor, as the ticket says.
- The oil pump figure is a factor 4 above the one found; the oil pump is a minor load either way.
- A real pump draws its power on the head and the flow, not linearly in the flow; the model scales with the valve position (a recorded simplification).

## Sources

- Auxiliary power consumption shares and the feed pump share: general figures from the web search for #140 (NTPC VFD paper, a JICA report and an auxiliary power consumption presentation among the results), not re-read.
- Turning gear 30 kW and oil pump 30 HP: turbine specification snippets (a 110 MW turbine data sheet; the PHX listing of a 113 MW BBC unit), not re-read.
- Liquid ring pump motors: the Edwards liquid ring pump catalogue (55 kW at 2500 m³/h).
