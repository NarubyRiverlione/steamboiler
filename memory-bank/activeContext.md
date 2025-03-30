# Active Context

## Current Work Focus

The current focus of the Steam Boiler Simulation project is on improving the physical accuracy of the simulation while maintaining performance and stability. We have recently implemented several enhancements to make the simulation more realistic, including improved water property calculations, latent heat of vaporization, thermal expansion, and a main steam valve control.

## Recent Changes

The following improvements have been implemented:

1. **Water Properties**: Implemented temperature-dependent water density and specific heat using steam table data instead of constant values.

2. **Latent Heat of Vaporization**: Replaced linear approximation with accurate values from steam tables.

3. **Thermal Expansion of Water**: Implemented water volume adjustment based on temperature changes to model thermal expansion, using specific volume data from steam tables.

4. **Pressure Calculation Parameters**: Moved pressure damping factor and steam expansion factors to configurable constants, making it easier to adjust the pressure increase rate.

5. **Main Steam Valve**: Implemented a control for the Main Steam Valve that opens or closes in increments of 10%, allowing users to remove steam from the system. The implementation includes:

   - A constant in CstSimulation for the maximum steam removal rate when the valve is fully open
   - Steam removal logic that affects both steam mass and energy balance
   - UI controls with visual feedback on valve position and steam flow rate

6. **Condenser Implementation**: Implemented the basic structure for the condenser, including:
   - Created `condenserReducer.ts` to manage condenser state.
   - Refactored `BoilerProvider.tsx` to `PowerPlantProvider.tsx` to manage both boiler and condenser state.
   - Modified `BoilerTypes.ts` to include types for the condenser.
   - Created placeholder components for the condenser visual, readouts, and control panel.
   - Modified `BoilerVisual.tsx` to include the `CondenserVisual` component.

7. **Condenser Pressure Indicators**: Added visual indicators to the condenser readouts that show when pressure is outside the acceptable range:
   - Created a reusable `Indicator` component in `src/components/Indicator.tsx` that can be used throughout the application
   - Added indicators for high pressure (above 70 mBar) and low pressure (below 40 mBar)
   - Included labels for each indicator to clearly identify what they represent
   - Added hover tooltips for additional information

8. **Hotwell Implementation**: Implemented the hotwell functionality to connect the boiler and condenser:
   - Added hotwell-related state variables to `CondenserTypes.ts` (hotwellLevel, hotwellToCondenserFlowRate, etc.)
   - Implemented calculations for hotwell level changes based on steam flow from the boiler
   - Added a recirculation pump control with a valve slider to adjust the flow rate
   - Implemented condensation calculations based on the recirculation pump flow rate
   - Added readouts for hotwell level, flow rates, and condenser steam/liquid volumes

9. **Condenser Pressure Control**: Implemented vacuum control systems for the condenser:
   - Added vacuum readout for the condenser in mBar
   - Implemented Air Extraction Pump (CAR) with toggle control to create a gradual vacuum
   - Implemented Steam Jet Air Extraction (SJAE) with toggle and valve position controls
   - Added automatic disabling of SJAE when there's no steam flow or pressure is too high
   - Implemented vacuum decay when pumps are disabled

## Active Development Areas

The next major improvement is to implement a more physically accurate energy balance approach for steam generation. Further improvements under consideration include:

### 1. Energy Balance Approach for Steam Generation

The current implementation uses an empirical formula based on how far the temperature is above the boiling point. The proposed improvement is to implement a more physically accurate energy balance approach:

- Calculate total energy input from gas
- Calculate energy needed to heat water to boiling point
- Use remaining energy for vaporization
- Calculate steam generation based on latent heat of vaporization

This would ensure that steam is only generated when sufficient energy is provided after the water reaches boiling temperature.

### 2. Boiling Point Calculation

The current implementation uses a simplified power law. The proposed improvement is to implement a more accurate correlation like the Antoine equation or use interpolated data directly from standard steam tables.

### 3. Heat Loss to Environment

Currently, there is a simple cooling model. The proposed improvement is to add a more realistic heat loss term that is proportional to the temperature difference between the boiler and ambient air, multiplied by a heat transfer coefficient.

### 4. Steam Table Integration

The plan is to better integrate the steam table data throughout the simulation to ensure consistent and accurate thermodynamic properties.

## Next Steps

The next steps for the Steam Boiler Simulation project include:

1. **Implement Condensation Pump**: Add a pump to pull feed water from the condenser to the boiler, completing the water cycle in the system.

2. **Energy Balance Approach for Steam Generation**: Implement a more physically accurate energy balance approach:
   - Calculate total energy input from gas
   - Calculate energy needed to heat water to boiling point
   - Use remaining energy for vaporization
   - Calculate steam generation based on latent heat of vaporization

3. **Improve Boiling Point Calculation**: Replace the simplified power law with a more accurate correlation like the Antoine equation or use interpolated data directly from standard steam tables.

4. **Enhance Heat Loss Model**: Add a more realistic heat loss term that is proportional to the temperature difference between the boiler and ambient air, multiplied by a heat transfer coefficient.

5. **Add Aerator**: Implement an aerator between the condenser and the boiler to remove dissolved gases from the feed water.

6. **Implement Turbines**: Add turbines to convert steam energy to mechanical/electrical energy, completing the power generation cycle.

7. **Fix Known Issues**: Address the issue where steam volume in the condenser state should decrease according to the intake flow rate.
