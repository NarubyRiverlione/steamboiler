# Project Brief

This project simulates the performance and operational dynamics of a combined power plant system, with a focus on accurately modeling both boiler and condenser subsystems. The application delivers real-time monitoring and control for the steam generation process and energy conversion, ensuring improved efficiency and reliable performance.

## Key Components

- **Boiler System:**  
  Manages water heating, fuel consumption, and steam generation. It uses a series of thermal models and sensor data to simulate the dynamic behavior of heat transfer and combustion efficiency.

- **Condenser System:**  
  Monitors cooling and condensation processes. It implements detailed cooling curve calculations and efficiency estimations to ensure effective condensation and energy recovery.

## Calculations Overview

Accurate calculations are central to the simulation and control processes. The current calculation modules have been updated to reflect the latest industry standards and real-world operational parameters:

- **Boiler Calculations:**  
  Located in `src/utils/boilerCalculations.ts`, these routines incorporate:
  - Thermal efficiency computations.
  - Heat transfer and energy balance equations.
  - Dynamic modeling of fuel combustion and steam generation using an energy balance approach.
  
- **Condenser Calculations:**  
  Found in `src/utils/condenserCalculation.ts`, these functions include:
  - Cooling performance metrics.
  - Condensation efficiency evaluations.
  - Adjustments for real-time sensor data inputs.

## Recent Updates

The project brief has been updated to incorporate the current calculation models. These updates integrate:
- Refined formulas to better capture the nuances of heat exchange and energy loss.
- Enhanced calibration parameters based on recent sensor feedback and operational data.
- Improved simulation fidelity, ensuring that the performance predictions for both boiler and condenser systems match the latest engineering standards.

This update ensures that our simulation delivers more accurate and reliable performance insights, directly influencing operational efficiency and energy output predictions.
