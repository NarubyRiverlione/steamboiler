# Emergency diesel: start time and warm-up

Frozen research record. The plant as built is in [plant/design-basis.md](../plant/design-basis.md); the decision is [ADR 0056](../adr/0056-emergency-power-the-vital-bus-chain-and-the-emergency-diesel.md). Ticket #198.

**Provenance.** One web search for #198; the results gave snippets of NRC documents and an NFPA 110 white paper, not re-read in full.

## Short answer

| Figure | Real plant | In the model | Basis |
|---|---|---|---|
| Start time (start signal to ready to load) | 10 s or less from ambient (nuclear EDG surveillance wording, NFPA 110 "Type 10") | **10 s** (`CstEmergencyDiesel.StartTime`) | from NRC and NFPA search snippets, not re-read (**UNVERIFIED** for this plant); the same figure as the big diesel (`CstDiesel.StartTime`) |
| Warm-up before the hand-back to the Safety bus | not found: no NRC technical specification sets one; real sets load at once | **60 s** (`CstEmergencyDiesel.WarmUpTime`) | **UNVERIFIED**, an estimate for playability: a fixed timer, no temperature model; far under the UPS runtime of 30 minutes (1800 s) |

## Notes

- A real standby set is ready to load after its start and takes its loads in blocks; the warm-up here is a playability rule that makes the Vital→Safety hand-back a decision, not a model of the set's temperature.
- The warm-up starts when the set is running (after the start time) and restarts with every new start.

## Sources

- NRC technical specification surveillance wording: "starts from ambient condition ... and is ready to load in < 10 seconds" (e.g. https://www.nrc.gov/docs/ML0108/ML010890441.pdf); the 10 s basis is traced to 10 CFR 50.46 and Appendix K. Not re-read.
- NFPA 110 "Type 10" start (a slideshare copy of a white paper: https://www.slideshare.net/slideshow/napt5675en/46052321). Not re-read.
