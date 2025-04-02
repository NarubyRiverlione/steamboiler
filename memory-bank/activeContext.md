# Active Context

**Updated:** 2025-04-02 10:23:00 CET

## Current Focus
- Implementation of energy balance approach for condenser calculations.
- Enhanced modeling of steam condensation based on cold water recirculation.
- Temperature tracking for condensed water returning to the boiler.
- Refinement of utility functions (condenserCalculation.ts) for more accurate thermodynamic modeling.

## Open Files (Active Session)
- Condenser: CondenserTypes.ts, CondenserTick.ts, condenserReducer.ts
- Utilities: condenserCalculation.ts, steamTable.ts
- Constants: src/context/const.ts

## Next Steps
- Test the energy balance implementation for the condenser.
- Consider implementing similar energy balance approach for the boiler's steam generation.
- Add visualization components to represent the temperature of condensed water.
- Implement the aerator between condenser and boiler as mentioned in progress.md.
