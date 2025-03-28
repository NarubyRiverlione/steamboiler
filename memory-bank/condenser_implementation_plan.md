# Condenser Implementation Plan

This file outlines the steps to implement the condenser feature in the steam boiler simulation, based on the plan developed in PLAN MODE.

**1. Create `condenserReducer.ts`:**

- [ ] Create a new file `src/context/condenserReducer.ts`.
- [ ] Define `CondenserState` interface with:
    - `condenserTemperature: number`
    - `condensateWaterVolume: number`
    - `condensateReturnRate: number`
    - `coolingRate: number`
- [ ] Define condenser action types (e.g., `CONDENSE_STEAM`, `UPDATE_CONDENSER_TEMPERATURE`, `RETURN_CONDENSATE`, `SET_COOLING_RATE`).
- [ ] Implement the `condenserReducer` function to handle these actions, including initial state.

**2. Refactor `BoilerProvider.tsx` to `PowerPlantProvider.tsx`:**

- [ ] Rename `src/context/BoilerProvider.tsx` to `src/context/PowerPlantProvider.tsx`.
- [ ] Update imports and references to reflect the name change.
- [ ] In `PowerPlantProvider.tsx`:
    - [ ] Import `condenserReducer` and `boilerReducer`.
    - [ ] Use `useReducer` for both `condenserReducer` and `boilerReducer`.
    - [ ] Create `PowerPlantContext` using `createContext`.
    - [ ] In `PowerPlantProvider` component, provide values for:
        - Boiler state and dispatch from `boilerReducer`.
        - Condenser state and dispatch from `condenserReducer`.
    - [ ] Update component exports to use `PowerPlantContext` and `PowerPlantProvider`.

**3. Modify `BoilerReducer.ts`:**

- [ ] In `src/context/BoilerReducer.ts`:
    - [ ] Modify `SIMULATE_TICK` action:
        - [ ] When steam valve is open, dispatch `CONDENSE_STEAM` action to `condenserReducer`, passing the amount of steam released.
        - [ ] Receive `condensateWaterVolume` from condenser (via `PowerPlantProvider` context).
        - [ ] Add `condensateWaterVolume` back to `waterVolume` in boiler state.

**4. Modify `BoilerTypes.ts`:**

- [ ] In `src/context/BoilerTypes.ts`:
    - [ ] Define TypeScript interfaces and types for `CondenserState` and condenser actions.
    - [ ] Ensure all action types are correctly defined and used across reducers and provider.

**5. Create Condenser Components:**

- [ ] Create a new directory `src/components/Condenser/`.
- [ ] Inside `src/components/Condenser/`, create the following components:
    - [ ] `CondenserVisual.tsx`: Visual representation of the condenser.
    - [ ] `CondenserReadouts.tsx`: Displays condenser parameters (temperature, return rate, etc.).
    - [ ] `CondenserControlPanel.tsx` (Optional): If the condenser has any controllable parameters (e.g., cooling rate), create a control panel.

**6. Modify `BoilerVisual.tsx`:**

- [ ] In `src/components/Boiler/BoilerVisual.tsx`:
    - [ ] Import and render the `<CondenserVisual />` component. The `BoilerVisual` component will now focus solely on the boiler's visual representation.

**7. Implement Condenser Calculations (if needed):**

- [ ] In `src/utils/boilerCalculations.ts` or a new file `src/utils/condenserCalculations.ts`:
    - [ ] Implement functions for condenser calculations (heat transfer, condensation rate, etc.) as needed by `condenserReducer`.

**8. Update UI Components to use `PowerPlantContext`:**

- [ ] Update all relevant UI components (e.g., `BoilerControlPanel.tsx`, `BoilerReadouts.tsx`, `BoilerSteamValveControl.tsx`, `BoilerVisual.tsx`, `CondenserVisual.tsx`, `CondenserReadouts.tsx`) to consume `PowerPlantContext` instead of `BoilerContext`.
- [ ] Ensure components correctly access both boiler and condenser state and dispatch functions from the `PowerPlantContext`.

**9. Modify `App.tsx`:**

- [ ] Import both `<BoilerVisual />` and `<CondenserVisual />`.
- [ ] Arrange the components in the main application layout as desired. This might involve using CSS or layout components to position the boiler and condenser visuals.
- [ ] Determine where to render `<CondenserReadouts />`. This could be in `App.tsx` or within a specific layout component.

**10. Refine Component Communication:**

- [ ] If the boiler and condenser components need to communicate directly (e.g., to indicate steam flow), ensure that the appropriate state variables and dispatch functions are passed through the `PowerPlantContext`.

**11. Implement Condenser Calculations (if needed):

- [ ] In `src/utils/boilerCalculations.ts` or a new file `src/utils/condenserCalculations.ts`:
    - [ ] Implement functions for condenser calculations (heat transfer, condensation rate, etc.) as needed by `condenserReducer`.

**12. Refine Component Communication:**

- [ ] If the boiler and condenser components need to communicate directly (e.g., to indicate steam flow), ensure that the appropriate state variables and dispatch functions are passed through the `PowerPlantContext`.

**13. Testing and Refinement:**

- [ ] After implementation, test the simulation thoroughly.
- [ ] Verify that the condenser functionality works as expected.
- [ ] Refine parameters (cooling rate, etc.) for realistic behavior.
- [ ] Check for any errors or unexpected behavior.

This implementation plan provides a checklist of steps to guide the development process in ACT MODE.
