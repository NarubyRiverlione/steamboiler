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

Based on the condenser_implementation_plan.md file, the following steps are planned:

1. Create Condenser Components: Create a new directory `src/components/Condenser/`. Inside `src/components/Condenser/`, create the following components: `CondenserVisual.tsx`: Visual representation of the condenser, `CondenserReadouts.tsx`: Displays condenser parameters (temperature, return rate, etc.), `CondenserControlPanel.tsx` (Optional): If the condenser has any controllable parameters (e.g., cooling rate), create a control panel.

2. Modify BoilerVisual.tsx: In `src/components/Boiler/BoilerVisual.tsx`: Import and render the `<CondenserVisual />` component. The `BoilerVisual` component will now focus solely on the boiler's visual representation.

3. Implement Condenser Calculations: The pressure calculation logic in `src/context/Condenser/CondenserTick.ts` has been moved to a new function `calculatePressure` in `src/utils/condenserCalculation.ts`.

4. Update UI Components to use PowerPlantContext: Update all relevant UI components (e.g., `BoilerControlPanel.tsx`, `BoilerReadouts.tsx`, `BoilerSteamValveControl.tsx`, `BoilerVisual.tsx`, `CondenserVisual.tsx`, `CondenserReadouts.tsx`) to consume `PowerPlantContext` instead of `BoilerContext`. Ensure components correctly access both boiler and condenser state and dispatch functions from the `PowerPlantContext`.

5. Modify App.tsx: Import both `<BoilerVisual />` and `<CondenserVisual />`. Arrange the components in the main application layout as desired. This might involve using CSS or layout components to position the boiler and condenser visuals. Determine where to render `<CondenserReadouts />`. This could be in `App.tsx` or within a specific layout component.

6. Refine Component Communication: If the boiler and condenser components need to communicate directly (e.g., to indicate steam flow), ensure that the appropriate state variables and dispatch functions are passed through the `PowerPlantContext`.

7. Implement Condenser Calculations (if needed): In `src/utils/boilerCalculations.ts` or a new file `src/utils/condenserCalculations.ts`: Implement functions for condenser calculations (heat transfer, condensation rate, etc.) as needed by `condenserReducer`.

8. Testing and Refinement: After implementation, test the simulation thoroughly. Verify that the condenser functionality works as expected. Refine parameters (cooling rate, etc.) for realistic behavior. Check for any errors or unexpected behavior.
