# Turning gear: gear speed and the standstill threshold to engage

Frozen research record. The plant as built is in [plant/design-basis.md](../plant/design-basis.md) and [plant/turbine.md](../plant/turbine.md); the decision this feeds is [ADR 0051](../adr/0051-turning-gear-holds-the-stopped-rotor-and-blocks-the-valve.md). Ticket #146.

Web search, Nov 2026. Every source below was seen as a **search snippet only** (patents, a Voith product document, a forum thread, a plant control write-up); none was read in full. So no figure is **sourced** in the strict sense: the chosen numbers are **UNVERIFIED** estimates, recorded as deliberate choices in the design basis.

## Short answer

| Figure | Chosen | Label | Basis |
|---|---|---|---|
| Gear speed (stopped rotor, gear engaged) | **3 rpm** | UNVERIFIED | patents describe a turning gear keeping the rotor at slowly, e.g. 3-5 rpm; one source gives 20-40 rpm as normal on barring gear, with some designs as slow as 3 rpm; a plant write-up lists 151 rpm for a large unit |
| Standstill threshold to engage | **20 rpm** | UNVERIFIED | a plant control write-up: turbine speed at or below 20 rpm ("stand-still") is an interlock condition for the manual start |
| Engagement | by hand, at standstill | choice | a Voith document: the standard turning device is manually engaged with the shaft train at standstill |
| Drop-out on low oil | below the oil permissive | ticket | the ticket: losing oil pressure below the permissive limit disengages the gear |

The gear speed differs by machine (3 to 150 rpm in the snippets); 3 rpm is the low end the ticket's "a few rpm" asks for.

## Flags for the ADR

1. Both figures are UNVERIFIED; the 20 rpm threshold is one plant's interlock.
2. A patent describes a gear that disengages itself on steam torque (the overrunning clutch variant): noted in the ADR, not built.

## Sources

- [Turning gear drive system (patent 7309208)](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/7309208) (snippet)
- [Turning device for a turbomachine (patent 10873252)](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10873252) (snippet)
- [Voith: vt2501](https://d15nmabv5huvcn.cloudfront.net/asset/180128162393/document_u309c6rfdl53h6vlalg5nc9g26/vt2501-english.pdf) (snippet)
- [Scribd: System Writeup](https://www.scribd.com/document/808890803/System-Writeup) (snippet)
- [Turbine Maintenance: Understanding Ratcheting and Turning Gears](https://ca118.webteractive.co/technical-articles/turbine-maintenance-understanding-ratcheting-and-turning-gears/) (snippet)
