# DONE - Water Properties (Density/Volume & Specific Heat):

Current: Uses a constant thermal expansion coefficient and constant specific heat for water.
Change: Water density and specific heat capacity vary non-linearly with temperature (and pressure, though temperature is usually the dominant factor in this range). We could replace the constants with functions or lookup tables derived from standard water property data (like IAPWS formulations) for better accuracy.

# Boiling Point Calculation:

Current: Uses a simplified power law 100 \* Math.pow(pressure / CstPhysics.AtmosphericPressure, 0.25).
Change: Implement a more accurate correlation like the Antoine equation, or better yet, use interpolated data directly from standard steam tables (which provide the precise saturation temperature for a given pressure). Let's check if steamTable.ts or steamTables.ts can provide this.

# DONE L- atent Heat of Vaporization:

Current: Uses a linear approximation based on temperature (calculateSteamEnergyLoss).
Change: Similar to the boiling point, use accurate values from steam tables. The latent heat of vaporization is a well-defined property that depends on temperature/pressure.

# Steam Generation Rate (Energy Balance Approach):

Current: Uses an empirical formula based on how far the temperature is above the boiling point (excessTemp _ waterMass _ factor). This is perhaps the least realistic part.
Change: Implement an energy balance approach. In each time step:
Calculate the total energy input (from gas).
Calculate energy needed to heat the existing water to the boiling point (if it's below).
Any remaining energy input is available for vaporization.
Divide this remaining energy by the accurate latent heat of vaporization (from steam tables at the current pressure) to find the mass of water converted to steam.
This ensures that steam is only generated when sufficient energy is provided after the water reaches boiling temperature.

# Heat Loss to Environment:

Current: No explicit heat loss model seems to be present.
Change: Add a heat loss term. Real boilers lose heat to their surroundings. This could be modeled simply as a rate proportional to the temperature difference between the boiler water/steam and the ambient air temperature, multiplied by a heat transfer coefficient and surface area factor.

# Integrate Steam Table Data:

Import interpolateProperties from src/utils/steamTables.ts into src/utils/boilerCalculations.ts (or wherever the main simulation step logic resides, possibly src/context/boilerLogic.ts).
Implement Accurate Boiling Point Determination:

The current calculateBoilingPoint is an approximation. We can use interpolateProperties to get the saturation pressure for a given temperature. To find the boiling temperature for a given pressure, we'll need to effectively invert this relationship – find the temperature T such that interpolateProperties(T).pressure matches the current boiler pressure. This might involve a simple search or iterative approach over the steamTableData.

# Adopt an Energy Balance Approach for Steam Generation:

Replace the current calculateSteamGeneration and calculateSteamEnergyLoss functions.
In the simulation's time step logic:
Calculate the energy added (addedEnergy) from the gas flow.
Determine the current state: water mass (m_water), water temperature (T_water), and pressure (P).
Find the boiling temperature (T_sat) for the current pressure (P) using the method from step 2.
Use interpolateProperties(T_water) to get the current water enthalpy (h_water_initial).
Use interpolateProperties(T_sat) to get properties at saturation: water enthalpy (h_f), steam enthalpy (h_g), and latent heat (h_fg).
Heating Water: If T_water < T_sat:
Calculate energy needed to reach boiling: E_to_boil = m_water \* (h_f - h_water_initial). (Using enthalpy change is more accurate than assuming constant specific heat).
If addedEnergy >= E_to_boil: The water reaches T_sat. Calculate remaining energy for boiling: E_for_boiling = addedEnergy - E_to_boil. Proceed to the boiling step.
If addedEnergy < E_to_boil: All energy goes into heating. Calculate the new enthalpy h_water_final = h_water_initial + addedEnergy / m_water. Find the corresponding new temperature T_water_final by inverting the enthalpy-temperature relationship from the table. No steam is generated (steamMass = 0).
Generating Steam: If T_water >= T_sat (or if E_for_boiling exists from the heating step):
Energy available for making steam is E_for_boiling.
Calculate the mass of steam generated: steamMass = E_for_boiling / h_fg.
Ensure steamMass does not exceed m_water. Adjust if necessary.
The temperature remains at T_sat during phase change (assuming pressure is constant within the step).
Update m_water by subtracting steamMass.

# Update Water Volume Calculation:

The steamTable.ts file contained specificVolume. We could either merge this data into steamTables.ts or use the getSteamData function from steamTable.ts specifically for volume calculations, replacing the simple thermal expansion in calculateWaterVolume.
