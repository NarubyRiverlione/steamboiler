# Generator load rate

Frozen research record. The plant as built is in [plant/design-basis.md](../plant/design-basis.md) and [plant/turbine.md](../plant/turbine.md); the decision this feeds is [ADR 0026](../adr/0026-generator-load-is-a-resisting-torque.md). Ticket #71.

**Provenance.** The figures below were found during triage of #71 and given in the ticket. They were **not re-read for this note**: treat them as **UNVERIFIED** until someone opens the sources.

## Short answer

| Figure | Value | Source | Label |
|---|---|---|---|
| Chosen load rate | **3% of rated output per minute**, up and down | CEA flexibility draft | sourced (not re-read), **coal units** |
| Range, unit commitment study | 1–6% per minute | a unit commitment study | sourced (not re-read), unit type not stated |
| Range, NEPRA filings | 0.25–1.2% per minute by load band, after a cold start | NEPRA filings | sourced (not re-read) |

## Caveats

- **Coal, not gas.** The 3%/min figure comes from coal-fired units. This plant is a gas-fired 130 MW drum unit with no superheater; a gas unit may ramp faster, but no gas drum unit figure was found. The rate is an **estimate for this plant**.
- **One rate.** The sim uses one rate for every load band and both directions. The NEPRA figures differ by band, so a real unit is slower at some loads and faster at others.
- The rate is applied to the rated output (130.6 MW), so 3% is about 3.9 MW/min and rated load takes about 33 min.
