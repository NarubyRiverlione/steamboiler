# Does a turbine trip lose the gland seal?

Frozen record. Ticket #161. The decision it feeds is [ADR 0047](../adr/0047-gland-seal-steam-sets-the-air-in-leakage.md); the earlier gland note is [2026-11-gland-seal-steam.md](2026-11-gland-seal-steam.md), and the one-sentence origin of the question is in [2026-11-condenser-air-system.md](2026-11-condenser-air-system.md).

Web search, Nov 2026, three searches (one extended). Search-result text only; the CR4 thread returned HTTP 403 and was not read. Every item below is a **snippet**, never a quotation, and no figure was found.

## Short answer

**No source supports a seal loss caused by a trip.** The default holds: no trip cause clears the gland seal. No code change.

| Trip cause | Seal lost? | Basis |
|---|---|---|
| Overspeed, vacuum limit, lube oil, boiler high-high level, deaerator high-high | No | A trip closes the steam valves to the turbine. The sealing header is fed from the auxiliary steam system or main steam taken ahead of the control valves, regulated by a seal feed valve; the trip does not touch it (NRC ML11221A169, snippet). UNVERIFIED for a specific OEM |
| Loss of the sealing steam supply (dead auxiliary bus, lost header) | Yes, but a different cause | A loss of sealing steam lets air in and can collapse vacuum within minutes (operator checklist, weak, snippet). Not a trip action: file as `needs-triage` |

## What the sources say

- Sealing steam comes from the auxiliary steam system or from main steam ahead of the control valves, its header held by a feed valve and a spillover regulator (NRC ML11221A169; flashcard set; snippets).
- Normal shutdown order: the vacuum is broken first, then the sealing steam is shut off, otherwise hot sealing steam leaks into the casing and bows the stationary rotor (CANDU module 234-12, snippet).
- A small steam-turbine chiller control patent de-energises the gland seal supply solenoid and opens a vacuum breaker as part of its stop sequence (US 7,421,854, snippet). This is an automatic stop sequence of a small machine, not a utility turbine trip; it is a deliberate action, not a loss of the seal.
- A forum answer says the operator should open the vacuum breaker to avoid steam seal in-leakage after a trip (CR4, snippet via search result, anecdotal).
- A slide deck lists changing the LP gland steam over to another source as an emergency action, so the supply can be switched when the normal one fails (snippet).

## Inference

The faster vacuum collapse after a real trip comes from the **vacuum breaker** (split off to its own ticket) and from an operator **deliberately** isolating gland steam and the vacuum system, not from the trip dropping the seal. In this model the seal is already lost when the operator switches the gland steam off, and the rotor-stopped rule of ADR 0047 shuts it off when the rotor stops turning.

## Open questions

- An OEM trip philosophy that isolates gland steam on a trip (UNVERIFIED, none found).
- A sourced vacuum decay on trip: still absent (see the condenser air system note, (e)).
