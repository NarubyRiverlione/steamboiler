# Steamboiler Web Simulation

This project simulates the operation of a steam boiler system, integrating both boiler and condenser components to accurately model power plant simulations.

## Project Overview

Steamboiler Web is designed to:
- Simulate key aspects of steam boiler and condenser operations, including an energy balance approach for steam generation.
- Integrate simulation logic across multiple modules.
- Provide interactive control panels and readouts for real-time simulation feedback.
- Utilize robust context management to maintain and update system state.

## Current Focus

According to our latest memory bank update (active as of 2025-04-01 11:10:49 CET), the project is currently focused on:
- Refinement of the simulation components.
- Integration of Condenser and Boiler simulation logic, including the implementation of an energy balance approach for the boiler's steam generation.
- Reviewing and enhancing utility functions (e.g., *condenserCalculation.ts* and *boilerCalculations.ts*) for accurate modeling.
- Active improvements in context management, particularly within *PowerPlantProvider* and related context files.

## Next Steps

Upcoming development efforts include:
- Implementing the aerator between the condenser and the boiler.
- Implementing turbines for power generation.
- Reducing empirical approaches in calculations.

## Getting Started

1. Install dependencies using your preferred package manager.
2. Run the development server (e.g., using `npm run dev` or `pnpm dev`).
3. Explore the simulation panels and monitoring dashboards to understand the system operation.

For further details, refer to the documentation within the memory bank files and source code comments.
