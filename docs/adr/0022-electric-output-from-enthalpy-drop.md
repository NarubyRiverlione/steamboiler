# Electric output comes from the isentropic enthalpy drop

**Status: accepted.** Implemented in #14.

The electric output is `flow × isentropic enthalpy drop × turbine efficiency (0.85) × generator efficiency (0.98) / 1000` in MW, from the actual turbine steam flow, saturated inlet steam at boiler pressure and the live condenser pressure. The fixed 35% `steamToElectricityEfficiency` on valve position × 200 kg/s is removed.

## Why

The old value ignored the real steam flow and steam conditions and was dimensionally off: a fully open valve gave "70 MW". The new one makes poor vacuum and low boiler pressure cost output, and gives about 131 MWe at the rated 171 kg/s and about 153 MWe at the 200 kg/s valve capacity (165 bar, 100 mbar), see [design-basis.md](../plant/design-basis.md).

## Decisions

- **Second steam table, keyed by pressure** (`steamEntropyData.ts`, IAPWS-IF97, 0.01–220 bar, rows 12% apart, interpolated in ln(pressure)). The existing table starts at 80 °C (0.474 bar), above any condenser pressure, and has no entropy; extending it would have changed the density splines of #46 and every snapshot.
- **`TurbineTick` no longer takes the valve position**: the output uses the flow in the turbine state.
- **Snapshots may chain**: `turbine-sync` becomes a snapshot source (from `turbine-runup`) so `turbine-load` starts from the turbine-sync end state, as #14 requires. `pnpm sim:snapshots` writes the sources in order.
- Not modelled: superheat, shaft load torque, net demand in MW.
