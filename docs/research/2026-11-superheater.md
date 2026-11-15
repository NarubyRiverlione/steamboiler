# Superheater and spray attemperator (#113)

Dated 2026-11-14. Frozen once written. Findings and sources for the superheater model of ADR 0044. Anything without a source is marked UNVERIFIED and is our own estimate.

## Steam properties (computed)

IAPWS-IF97 (python `iapws`), 165 bar:

| State | h (kJ/kg) | s (kJ/kg·K) |
|---|---|---|
| Saturated vapour, 165 bar (348 °C) | about 2580 | about 5.20 |
| 540 °C | 3406.5 | 6.430 |

- Heat per kg to superheat from saturation to 540 °C: about 826 kJ/kg, so about 158 MW at 192 kg/s. The ticket's hand estimate (150 MW) holds. The real rated flow is lower once this heat comes out of the fuel heat before the boiler stage (re-derived from the headless run).
- Isentropic exhaust at 31 mbar from 165 bar and 540 °C: quality about 0.74 (26% wet) before the 85% turbine efficiency; the real expansion ends at about 20 to 25% wet. Saturated inlet: 35% wet (ADR 0028). Reheat is the later fix.

## Steam temperature time constant

- POWER magazine, *Thermocouple Response Time Study for Steam Temperature Control*: the response of the final outlet temperature is typically about 60 s dead time followed by a 100 to 200 s time constant, due mainly to the large metal mass of the superheater. https://www.powermag.com/thermocouple-response-time-study-for-steam-temperature-control
- Part II of the same study: desuperheater outlet loops measured at 17 to 20 s time constant with 10 s dead time (new thermowell), about 70 s with the old one. https://www.powermag.com/thermocouple-response-time-study-for-steam-temperature-control-part-ii
- Siemens control patents (US 10012114, US 9500361) model the superheater as lags whose time constant grows as load falls (T100 / load). No seconds value in the excerpts.

Model: one lag of 100 s (low end of the sourced range, steam and metal together; no dead time, no load dependence). Stated as a departure: a lumped plant cannot show the dead time.

## Attemperator spray range

- Combined Cycle Journal rule of thumb: if more than about 8% of the superheater outlet steam is spray water, steam purity and the turbine are at risk. https://www.ccj-online.com/?p=19704
- Spray is a larger share of flow at part load for the same water flow (vendor blog, weak).
- No sourced typical capacity band was found. Model: spray valve capacity sized so the 8% purity rule is the ceiling at rated flow (UNVERIFIED sizing; recorded in design-basis.md).

## Exhaust wetness

- Moisture above about 12% shortens exhaust-end blading life (Combined Cycle Journal, *Steam Turbine User Alert*). https://www.ccj-online.com/3q-2013/steam-turbine-user-alert/
- Higher inlet pressure and lower exhaust pressure both raise exhaust wetness (same source and Hoznedl, *Wetness effects*). https://engmechx.it.cas.cz/improc/2013/006_Hoznedl_M-FT.pdf
- No source found for 540 °C and 165 bar with no reheat; the figure above is an expansion line calculation from IF97. A 20 to 25% wet exhaust is still far over the 10 to 15% limit: a recorded departure, reheat is a later ticket.

## Superheater duty, flue gas temperature and surface exponent

- No source found for flue gas temperatures at a 165 bar superheater. The model uses the combustion temperature of ADR 0029 (1775 °C, Ganapathy Table 4.2) at the superheater inlet and sizes the surface so the outlet is 540 °C at full gas with no spray (a design choice, UNVERIFIED).
- Surface scales with gas flow to the power 0.65 as for the other stages (Ganapathy, ADR 0029). UNVERIFIED for a radiant/convective superheater; a real one is partly radiant.
