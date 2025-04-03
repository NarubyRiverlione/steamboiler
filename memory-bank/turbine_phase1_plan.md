# Turbine Feature Implementation Plan: Phase 1 – Black-box Approach

## Overview

This phase adopts a simplified black-box approach where the turbine valve's steam flow is converted into electrical energy using a fixed efficiency ratio. The implementation leverages similarities with the existing condenser module to streamline development while laying the groundwork for future enhancements.

## Implementation Tasks

### 1. Define Efficiency Constant

- **Action:** In the `const.ts` file, add a turbine-specific constant (e.g., within a new section for turbine constants) called `CstTurbine` that includes a typical steam-to-electricity efficiency ratio.
- **Documentation:** Include inline comments detailing the derivation and potential calibration adjustments for this constant.

### 2. Create Turbine Context Module

- **Action:** Create a new directory at `/src/context/Turbine`.
- **Files to Implement (modeled after the condenser's structure):**
  - **TurbineTick.ts:** Manages update cycles for the turbine state.
  - **TurbineReducer.ts:** Handles state transitions and actions specific to the turbine.
  - **TurbineTypes.ts:** Defines types and interfaces for turbine-related state management.
  - **turbineCalculation.ts** add this in the `/utils` directory to be used in the TurbineTick
- **Goal:** Mirror the structure of the condenser module to ensure consistency.

### 3. Integrate Turbine into Power Plant Provider

- **Action:** Update the power plant provider and context files:
  - Modify `/src/context/PowerPlantProvider.tsx` to include and initialize the turbine reducer.
  - Update `/src/context/PowerPlantContext.tsx` to expose turbine state and actions.
- **Goal:** Seamlessly integrate turbine state handling into existing application flows.

### 4. Develop Turbine UI Components

- **UI Routing:**
  - Add a new routing tab labeled **"Turbine"** within the main navigation, similar to the Condenser tab.
  - Update the component view to include a dedicated route for the turbine component.
- **Action:** Create a new directory at `/src/components/Turbine` containing:

  - **Turbine.tsx:** The primary visual component for the turbine.
  - **TurbineControlPanel.tsx:** A panel for potential control elements (if applicable).
  - **TurbineReadouts.tsx:** Displays key metrics, with emphasis on showing produced electricity in megawatts (MW).

- **Goal:** Ensure the UI reflects turbine data accurately and maintains consistency with existing components.

### 5. Documentation and Comments

- **Action:** Document the implementation thoroughly:
  - Include detailed comments in the code for clarity.
  - Reference this implementation plan within the turbine documentation for future phases.
- **Goal:** Provide clear guidance for ongoing and future development work.

## Conclusion

This implementation plan sets a clear roadmap for Phase 1, establishing the turbine feature using a simplified, modular approach. It prioritizes rapid development via structural mirroring of the condenser module while paving the way for subsequent feature enhancements.
