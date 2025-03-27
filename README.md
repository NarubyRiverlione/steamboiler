# Steam Boiler Simulation

A physics-based simulation of a steam boiler system, modeling the thermodynamic processes of water heating, steam generation, and pressure development.

## Introduction

This simulation models a steam boiler with a fixed volume containing water that can be heated by a gas burner. As energy is added to the system, the water temperature increases. When the temperature reaches the boiling point (which depends on the current pressure), water begins to convert to steam. As steam accumulates in the fixed volume, pressure increases according to thermodynamic principles.

The simulation allows users to:
- Control the gas flow rate to add heat to the system
- Open/close fill and drain valves to add or remove water
- Observe the dynamic changes in temperature, pressure, water volume, and steam generation

## Physical Elements and Their Interactions

### Water and Steam
- The boiler contains liquid water that can be converted to steam when sufficient energy is added
- Water volume changes with temperature due to thermal expansion
- When water boils, it converts to steam, reducing the liquid water volume
- Steam occupies significantly more volume than the liquid water it came from (approximately 1600 times at atmospheric pressure)

### Temperature
- Increases when energy is added via gas heating
- Decreases due to natural cooling
- Affected by adding/removing water (energy is distributed over more/less mass)
- Remains constant at the boiling point during steam generation until all water is converted to steam

### Pressure
- At temperatures below boiling, pressure equals the saturation pressure (vapor pressure) from steam tables
- When steam accumulates in the fixed volume, pressure increases above saturation pressure
- Pressure is maintained at atmospheric (1 bar) when there is no steam
- Higher pressure raises the boiling point of water (they have a non-linear relationship)

### Energy
- **Sources**: Gas burner (controlled by user)
- **Sinks**: 
  - Natural cooling to environment
  - Energy used for steam generation (latent heat of vaporization)
  - Energy lost when draining water

### Volume
- The boiler has a fixed total volume (100 liters)
- This volume is shared between liquid water and steam
- As water converts to steam, it occupies more volume, reducing available space
- When the steam would require more volume than available, pressure increases

## Key Calculations and Formulas

### Energy Balance
The simulation uses an energy balance approach to track energy flows in and out of the system:
```
Energy Change = Energy Input (gas) - Energy Output (cooling, steam generation, draining)
```

### Temperature Calculation
Temperature changes are calculated based on the energy change and the water's specific heat capacity:
```
Temperature Change = Energy Change / (Water Mass × Specific Heat)
```

### Steam Generation
Steam is generated when:
1. The temperature reaches the boiling point for the current pressure
2. Additional energy is available after heating water to the boiling point

The steam generation rate depends on:
- Available energy (after heating)
- Latent heat of vaporization (energy needed to convert water to steam)
- Water mass

### Pressure Calculation
Pressure is calculated based on:
- Steam mass accumulated in the system
- Temperature (which affects specific volume of steam)
- Available volume (total volume minus water volume)
- Saturation pressure at the current temperature

When steam is present, the pressure calculation uses a modified ideal gas relationship with damping factors to model real steam behavior.

### Water Properties
The simulation uses temperature-dependent water properties:
- Density (or specific volume)
- Specific heat capacity
- Latent heat of vaporization
- Saturation pressure

These properties are obtained from steam tables with interpolation between data points.

## Simplifications and Approximations

### Water Property Approximations
- For temperatures below 80°C, linear approximations are used for water properties
- Above 80°C, steam table data with interpolation is used
- For temperatures above 300°C or below 80°C, extrapolation is used

### Steam Volume Calculation
- The expansion factor (ratio of steam volume to liquid water volume) is approximated based on temperature ranges:
  - Below 100°C: 1600× expansion
  - 100-150°C: 1200× expansion
  - Above 150°C: 800× expansion

### Pressure Calculation Simplifications
- A damping factor (0.5) is applied to make pressure rise more gradually
- Square root function applied to volume ratio to model non-ideal gas behavior
- Pressure is maintained at 1 bar when steam mass is negligible (< 0.001 kg)

### Fixed Constants
- Gas energy density: 35000 kJ/m³
- Gas burner efficiency: 85%
- Cooling rate: 1/15 °C per second
- Atmospheric pressure: 1.013 bar
- Minimum temperature: 20°C (room temperature)

### Boiling Point Calculation
- For pressures within the steam table range: Interpolation between data points
- For pressures below the range: Antoine equation
- For pressures above the range: Power law extrapolation

## Technical Implementation

The simulation is implemented as a React application with:
- Context API for state management
- Reducer pattern for simulation logic
- Steam tables for accurate water property data
- 10 updates per second simulation rate

The core simulation loop:
1. Calculate energy input from gas
2. Apply cooling losses
3. Calculate energy needed to heat water to boiling point
4. Use remaining energy for steam generation
5. Update temperature, pressure, water volume, and steam mass
6. Update UI with new state

---

This simulation provides an educational model of boiler thermodynamics while making reasonable simplifications for real-time performance and usability.
