# Active Context

## Current Work Focus

The current focus of the Steam Boiler Simulation project is on improving the physical accuracy of the simulation while maintaining performance and stability. Based on the improvements.md file, several enhancements are being considered to make the simulation more realistic.

## Recent Changes

According to the improvements.md file, the following improvements have already been implemented:

1. **Water Properties**: Implemented temperature-dependent water density and specific heat using steam table data instead of constant values.

2. **Latent Heat of Vaporization**: Replaced linear approximation with accurate values from steam tables.

## Active Development Areas

The following areas are currently being worked on or considered for improvement:

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

Based on the improvements.md file, the following steps are planned:

1. **Implement Energy Balance Approach**: Replace the current steam generation calculation with an energy balance approach.

2. **Improve Boiling Point Determination**: Use steam table data to accurately determine the boiling point for a given pressure.

3. **Update Water Volume Calculation**: Use specific volume data from steam tables for more accurate water volume calculations.

4. **Add Heat Loss Model**: Implement a more realistic heat loss model.

## Active Decisions and Considerations

### Accuracy vs. Performance

There is an ongoing balance between simulation accuracy and performance. The current approach uses simplifications where appropriate to ensure the simulation runs smoothly in a browser environment.

### Numerical Stability

Care must be taken to ensure that changes to the simulation logic don't introduce numerical instabilities, especially when dealing with phase changes and pressure calculations.

### Educational Value

Any improvements should maintain or enhance the educational value of the simulation, making complex thermodynamic concepts more accessible and understandable.

### User Experience

Changes to the simulation should not negatively impact the user experience. The interface should remain intuitive, and the simulation should respond in ways that match user expectations.
