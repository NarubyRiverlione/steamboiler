# Boiler

A gas-fired, closed-loop drum boiler. Sizes and limits are in [design-basis.md](design-basis.md). Code: `src/context/Boiler/BoilerTick.ts`, `src/utils/boilerCalculations.ts`, constants in `CstSimulation.CstBoiler` (`src/context/const.ts`).

## Elements

- **Water and steam**: the boiler holds liquid water that turns to steam when enough energy is added. Water volume follows temperature (specific volume from the steam tables) and shrinks as water boils. Steam takes far more volume than the water it came from (about 1600× at atmospheric pressure).
- **Temperature**: rises with gas energy, falls through natural cooling, is diluted by returned water, and holds at the boiling point while steam is generated.
- **Pressure**: see **Pressure model** below.
- **Energy**: the source is the gas burner. The sinks are natural cooling, the latent heat of steam generation, and drained water.
- **Volume**: a fixed 100 m³ shared between water and steam; 50 m³ of water at the start.
- **Water in and out**: the boiler is fed only by the condensation pump from the hotwell ([ADR 0002](../adr/0002-makeup-into-hotwell.md)). The drain valve removes 0.5% of total volume per second.

## Calculations

```
Energy change      = gas input − (cooling + steam generation + draining)
Temperature change = energy change / (water mass × specific heat)
```

Steam generation (energy balance per tick, #8):

1. Gas energy in, minus cooling losses
2. Energy needed to heat the water to the boiling point at the current pressure
3. Remaining energy ÷ latent heat (steam tables) = mass of steam generated, capped at the water mass
4. Temperature stays at the boiling point during the phase change; the steam mass is subtracted from the water mass

Steam removal (`BoilerRemoveSteam`, once for the bypass, then for the turbine valve):

```
Removed this tick = min(valve position × MaxSteamRemovalRate × tick, steam mass in the boiler)
Reported flow     = removed / tick   (kg/s, never above valve position × 200 kg/s)
```

All of it is subtracted from the steam mass; the bypass and the turbine valve draw from the same steam, in that order. Removal runs before this tick's generation, so it takes the steam from earlier ticks. Pressure follows the balance: it rises while less steam leaves than is generated, holds when they match, and falls when more leaves.

Boiling point: steam-table interpolation in range, Antoine equation below it, power law above it. The high-pressure end is wrong: `getBoilingPoint(180)` gives about 434 °C instead of 357 °C (#22).

## Pressure model

**Today:** pressure comes from steam mass, temperature (specific volume), free volume (total minus water) and saturation pressure, through a modified ideal-gas relation with damping. It uses the expansion factors `SteamExpansionFactorLow/Medium/High` (1600× below 100 °C, 1200× at 100–150 °C, 800× above 150 °C) and the square root of the volume ratio. It is held at atmospheric when steam mass is negligible (< 0.001 kg). This model gives unrealistic pressures and runs away.

**Decided:** pressure equals the saturation pressure of the water temperature, never below atmospheric ([ADR 0001](../adr/0001-boiler-pressure-follows-saturation.md)). It is being built in #12; when it lands, replace this section.

## Constants and simplifications

| Item | Value |
|---|---|
| Gas energy density | 35 000 kJ/m³ |
| Burner efficiency | 85% |
| Natural cooling | 1 °C per 15 s without gas, a constant rate (heat loss proportional to temperature difference is #13) |
| Atmospheric pressure | 1.013 bar |
| Ambient temperature | 20 °C (`CstPhysics.AmbientTemperature`): natural cooling stops here, so energy keeps matching temperature |
| Start state | cold: ambient temperature, atmospheric pressure, 50 m³ water, energy = heating 50 m³ from 0 °C to ambient |

## Remaining empirical areas

- `calculateGasEnergy` uses `GasEfficiency`, which may be an empirical factor
- `calculatePressureFromSteam` uses the expansion factors (removed by #12)
- `calculateWaterVolume` uses a linear approximation below 80 °C (#34)
- Natural cooling is a constant rate, with no thermal mass of the metal (#13)
