this is a simulation of a gas fueled closed system steam boiler

There should be controls to add or removing the natural gas flow as energy source to the boiler
show the amount of supply gas in liters/second 
use 4 buttons: add or reduce the flow 0.5 or 0.25 l
the gas should be converted to energy with a efficiency of 85%
show to difference of energy per second
without any gas flow the boiler should naturally cool down at the rate of 1 degree every 15 seconds

Use degree Celsius for temperature unit and bar for pressure unit. Use kilo Joules as energy unit
All readout should have be rounded to 1 decimal

The boiler should have a fill and drain valve for controlling the water content
Filling and draining should be 0.5 % per second
This water valves should change the boiler content over time
The energy should reflect the change of water mass

The total volume of the boiler is 100 liter
And the start the boiler should be fill with 50 liters

the water volume should expand according the temperature change
converting the liquid to steam should reduce the energy and the water volume

add a steam table with data between 80 and 300 degrees to determent the Enthalpy

The should be a text readout for the water volume, temperature and pressure
Also the steam generation in kg per second should be showed

All valve are button that should there open or closed state

The start the boiler should be at atmospheric pressure and 98 degrees
The water should have the correct energy for this temperature


---

# Physics model

## Elements

- **Water and steam**: the boiler holds liquid water that turns to steam when enough energy is added. Water volume changes with temperature (specific volume from the steam tables) and shrinks as water boils. Steam occupies far more volume than the water it came from (~1600× at atmospheric pressure).
- **Temperature**: rises with gas energy, falls through natural cooling, is diluted by added water, and holds at the boiling point while steam is generated.
- **Pressure**: equals saturation pressure with no accumulated steam, and rises above it as steam accumulates in the fixed volume. Higher pressure raises the boiling point non-linearly. It is held at atmospheric (1 bar) when steam mass is negligible (< 0.001 kg).
- **Energy**: source is the gas burner. Sinks are natural cooling, latent heat of steam generation and drained water.
- **Volume**: fixed 100 l shared between water and steam; 50 l at start.

## Calculations

```
Energy change      = gas input − (cooling + steam generation + draining)
Temperature change = energy change / (water mass × specific heat)
```

Steam generation (energy balance, per tick):

1. Gas energy in, minus cooling losses
2. Energy needed to heat the water to the boiling point at the current pressure
3. Remaining energy ÷ latent heat (steam tables) = mass of steam generated, capped at the water mass
4. Temperature stays at the boiling point during the phase change; subtract the steam mass from the water mass

Pressure comes from steam mass, temperature (specific volume), free volume (total minus water) and saturation pressure. It uses a modified ideal-gas relationship with damping factors.

Boiling point: steam-table interpolation in range, Antoine equation below, power law above.

## Constants and simplifications

| Item | Value |
|---|---|
| Gas energy density | 35000 kJ/m³ |
| Burner efficiency | 85% |
| Natural cooling | 1 °C per 15 s (without gas) |
| Atmospheric pressure | 1.013 bar |
| Ambient temperature | 20 °C (`CstPhysics.AmbientTemperature`): natural cooling stops here, so energy keeps matching temperature |
| Start state | cold: ambient temperature, atmospheric pressure, 50 m³ water, energy = heating 50 m³ from 0 °C to ambient |
| Pressure damping / steam expansion factors | `CstSimulation` |

Steam expansion factor approximations: 1600× below 100 °C, 1200× at 100–150 °C, 800× above 150 °C. The square root of the volume ratio models non-ideal gas behaviour.

## Remaining empirical areas

- `calculateGasEnergy` uses `GasEfficiency`, which may be an empirical factor
- `calculatePressureFromSteam` uses the `SteamExpansionFactorLow/Medium/High` constants
- `calculateWaterVolume` uses a linear approximation below 80 °C
- Heat-loss model is simplified

See [improvements.md](improvements.md) for the physics roadmap.
