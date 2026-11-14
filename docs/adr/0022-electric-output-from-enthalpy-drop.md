# Electric output comes from the isentropic enthalpy drop

**Status: accepted; amended by #71.** Implemented in #14. Since #71 the electric output is no longer computed from steam flow: it is the load the generator carries ([ADR 0027](0027-generator-load-is-a-resisting-torque.md)), not a function of steam flow; the chain below now gives the shaft power and the rated output (152.4 MW since #113) that sizes the inertia and the load limit.

The electric output is `flow × isentropic enthalpy drop × turbine efficiency (0.85) × generator efficiency (0.98) / 1000` in MW, from the actual turbine steam flow, inlet steam at boiler pressure and its temperature and the live condenser pressure: saturated steam until #113, since then the superheated steam the attemperator holds at 540 °C ([ADR 0044](0044-superheater-with-spray-attemperator.md); with no superheat the saturated drop is used). The fixed 35% `steamToElectricityEfficiency` on valve position × 200 kg/s is removed.

## Why

The old value ignored the real steam flow and steam conditions and was dimensionally off: a fully open valve gave "70 MW". The new one makes poor vacuum and low boiler pressure cost output, and gave about 131 MWe at the rated 171 kg/s and about 153 MWe at the 200 kg/s valve capacity (165 bar, 100 mbar) with saturated steam; with the 540 °C steam of #113 the rated 134 kg/s gives 152.4 MW, see [design-basis.md](../plant/design-basis.md).

## Decisions

- **Second steam table, keyed by pressure** (`steamEntropyData.ts`, IAPWS-IF97, 0.01–220 bar, rows 12% apart, interpolated in ln(pressure)). The existing table starts at 80 °C (0.474 bar), above any condenser pressure, and has no entropy; extending it would have changed the steam density of #46 (the finer table, [ADR 0025](0025-finer-steam-table-for-density-slope.md)) and every snapshot.
- **`TurbineTick` no longer takes the valve position**: the output uses the flow in the turbine state.
- **Snapshots may chain**: `turbine-sync` becomes a snapshot source (from `turbine-runup`) so `turbine-load` starts from the turbine-sync end state, as #14 requires. `pnpm sim:snapshots` writes the sources in order.
- Superheat: added in #113 with a separate superheated table ([ADR 0044](0044-superheater-with-spray-attemperator.md)). Not modelled: net demand in MW (the operator's load setpoint of #71 replaces it).
