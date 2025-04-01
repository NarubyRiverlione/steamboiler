# Condenser Calculation Plan

This document outlines the plan for updating the condenser volume calculations to mirror the boiler's methodology while incorporating an additional energy conversion step for the cold water recirculation.

## Overview

The goal is to calculate the condenser vapor and liquid volumes by:
- Replicating the boiler’s calculation for initial vapor and liquid volumes.
- Incorporating an energy absorption step from the cold water recirculation flow, which reduces the steam volume and increases the liquid volume.

## Detailed Steps

1. **Replicate Boiler Calculations**  
   - Use the boiler's calculation logic (from `boilerCalculations.ts`) as a baseline for computing the initial vapor (steam) and liquid (water) volumes.

2. **Compute Energy Absorbed by the Cold Water**  
   - **Mass Flow Rate:**  
     The mass flow rate of the recirculating cold water is calculated as:  
     `massFlowRate = condensationPumpValvePosition * CstSimulation.CstCondenser.RecirculationPump_MaxFlowRate`  
     - *condensationPumpValvePosition* is a value between 0 and 1 from the condenser state.
   - **Temperature Difference (ΔT):**  
     Calculate the difference between the condenser outlet temperature and the intake temperature (defined as a constant):  
     `ΔT = outletTemperature - CstSimulation.CstCondenser.IntakeTemperature`
   - **Energy Absorbed (Q):**  
     Use the formula:  
     `Q = massFlowRate * cp * ΔT`  
     where `cp` is the specific heat capacity obtained from `CstPhysics.specificHeat` in the constants file.

3. **Determine Steam Condensation**  
   - **Mass of Steam Condensed:**  
     Calculate the mass of steam that condenses due to the absorbed energy:  
     `massCondensed = Q / latentHeatOfVaporization`  
     where `latentHeatOfVaporization` is from `CstPhysics.latentHeatOfVaporization`.
   - **Volume of Condensed Steam:**  
     Convert the condensed mass to volume using water density:  
     `volumeCondensed = massCondensed / waterDensity`  
     with `waterDensity` coming from `CstPhysics.Water_Density` (or a default value of 1000 kg/m³).

4. **Adjust the Volumes**  
   - **Vapor Volume:** Reduce the initial vapor volume by the condensed volume, ensuring it does not drop below zero.
   - **Liquid Volume:** Increase the initial liquid volume by the same condensed volume.

## Constants and Parameters

- **Physical Constants:**  
  Defined in the `CstPhysics` section of `const.ts`:
  - Specific Heat (`specificHeat`)
  - Latent Heat of Vaporization (`latentHeatOfVaporization`)
  - Water Density (`Water_Density`)

- **Simulation Constants:**  
  Available under the `CstSimulation.CstCondenser` section of `const.ts`:
  - Maximum recirculation pump flow rate (`RecirculationPump_MaxFlowRate`)
  - Intake Temperature (`IntakeTemperature`)

- **Condenser State Properties:**  
  The necessary input properties from the condenser state include:
  - `condensationPumpValvePosition`
  - `outletTemperature`

## Integration Considerations

- The energy absorbed by the cold water reduces the steam's energy, causing a portion of the vapor to condense into liquid.
- This new calculation method maintains consistency with the boiler's approach while accurately accounting for the additional energy conversion process.
- Ensure that the adjusted vapor volume is never negative.

---

This plan will guide the implementation and future refinements of the condenser's volume calculations.
