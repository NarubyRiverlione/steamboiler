# Active Context

**Updated:** 2025-04-02 14:00:00 CET

## Current Focus
- Implementation of routing with tabs for Boiler and Condenser components.
- Implementation of energy balance approach for condenser calculations.
- Implementation of energy balance approach for the boiler's steam generation.
- Enhanced modeling of steam condensation based on cold water recirculation.
- Temperature tracking for condensed water returning to the boiler.
- Refinement of utility functions (condenserCalculation.ts) for more accurate thermodynamic modeling.

## Open Files (Active Session)
- Routing: App.tsx, Layout.tsx, TabNavigation.tsx, AppRoutes.tsx
- Boiler: src/utils/boilerCalculations.ts
- Condenser: CondenserTypes.ts, CondenserTick.ts, condenserReducer.ts
- Utilities: condenserCalculation.ts, steamTable.ts
- Constants: src/context/const.ts

## Next Steps
- Test the energy balance implementation for the condenser.
- Test the energy balance implementation for the boiler's steam generation.
- Add visualization components to represent the temperature of condensed water.
- Implement the aerator between condenser and boiler as mentioned in progress.md.
- Consider adding more tabs for future components (e.g., Turbine, Aerator).
- Reduce empirical approaches in calculations as mentioned in progress.md.
