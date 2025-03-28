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

**5. Modify `BoilerVisual.tsx` (and potentially `BoilerReadouts.tsx` or create `CondenserReadouts.tsx`):**

- [ ] In `src/components/Boiler/BoilerVisual.tsx`:
    - [ ] Add visual representation of the condenser component to the UI.
- [ ] Decide where to display condenser parameters (temperature, return rate, etc.):
    - [ ] Option 1: Add to `BoilerReadouts.tsx`.
    - [ ] Option 2: Create a new `CondenserReadouts.tsx` component.
    - [ ] Implement the chosen option to display condenser readouts, accessing condenser state from `PowerPlantContext`.

**6. Implement Condenser Calculations (if needed):**

- [ ] In `src/utils/boilerCalculations.ts` or a new file `src/utils/condenserCalculations.ts`:
    - [ ] Implement functions for condenser calculations (heat transfer, condensation rate, etc.) as needed by `condenserReducer`.

**7. Update UI Components to use `PowerPlantContext`:**

- [ ] Update all relevant UI components (e.g., `BoilerControlPanel.tsx`, `BoilerReadouts.tsx`, `BoilerSteamValveControl.tsx`, `BoilerVisual.tsx`) to consume `PowerPlantContext` instead of `BoilerContext`.
- [ ] Ensure components correctly access both boiler and condenser state and dispatch functions from the `PowerPlantContext`.

**8. Testing and Refinement:**

- [ ] After implementation, test the simulation thoroughly.
- [ ] Verify that the condenser functionality works as expected.
- [ ] Refine parameters (cooling rate, etc.) for realistic behavior.
- [ ] Check for any errors or unexpected behavior.

This implementation plan provides a checklist of steps to guide the development process in ACT MODE.
