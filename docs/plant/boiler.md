# Boiler

A gas-fired, closed-loop drum boiler. Sizes and limits are in [design-basis.md](design-basis.md). Code: `src/context/Boiler/BoilerTick.ts`, `src/utils/boilerCalculations.ts`, constants in `CstSimulation.CstBoiler` (`src/context/const.ts`).

## Elements

- **Water and steam**: the boiler holds liquid water that turns to steam when enough energy is added. Water volume follows temperature (specific volume from the steam tables) and shrinks as water boils. Steam takes far more volume than the water it came from (about 1600× at atmospheric pressure).
- **Temperature**: rises with gas energy, falls through natural cooling and through the latent heat of water flashing to steam, and is diluted by returned water. A closed drum keeps heating past 100 °C; pressure follows it.
- **Pressure**: see **Pressure model** below.
- **Energy**: the source is the gas burner (thermal mass: the water only; metal mass is #13). The sinks are natural cooling, the latent heat of the flash (which includes steam vented by the relief valve), and drained water.
- **Volume**: a fixed 100 m³ shared between water and steam; 50 m³ of water at the start.
- **Water in and out**: the boiler is fed only by the condensation pump from the hotwell ([ADR 0002](../adr/0002-makeup-into-hotwell.md)). The drain valve removes 0.5% of total volume per second. Steam leaves through the relief valve to the atmosphere (`BoilerVent`, see **Relief valve**), and through the turbine valve and the bypass (`BoilerRemoveSteam`): each passes `position ×` its max steam removal ([design-basis.md](design-basis.md)) in kg/s, so `× DeltaTime` kg per tick, taken from the steam inventory. The draw does not yet depend on boiler pressure. While #32 is open the reported flow can exceed the steam actually removed (this tick's generation is counted twice).

## Calculations

```
Heated temperature = T + (gas input − cooling) / (water mass × specific heat)
Steam inventory    = saturated steam density(T) × (total volume − water volume)
Flashed mass       = inventory wanted − steam mass held     (negative: steam condenses)
Temperature        = heated temperature − flashed mass × latent heat / (water mass × specific heat)
Pressure           = max(1.013 bar, Psat(temperature))
```

Each tick (`BoilerTick`, `calculateFlashedMass`):

1. Gas energy in, minus cooling losses, warms the water. The temperature stops at the critical point, where the saturated model ends; a boiler run dry would otherwise run away.
2. The steam space should hold saturated steam at that temperature. Water flashes to steam (or steam condenses) to restore the inventory, and the latent heat is taken from (or returned to) the water.
3. Flashing cools the water (less steam wanted) and lowers the water level (more steam space), so the flashed mass is solved implicitly by bisection. An explicit step oscillates near the critical point, where steam density approaches water density. A boiler already in equilibrium flashes exactly nothing, so a resting plant stays at rest.
4. `deltaSteamMass` is the flash rate in kg/s: positive while heating or under draw, negative while cooling.

Saturated steam density: the table holds only the liquid side, so the steam side comes from Clausius-Clapeyron, `vg = vf + hfg / (T · dP/dT)`, with `dP/dT` a centred difference over ±5 K (within 3% of IAPWS-IF97 from 100 to 300 °C). Below 80 °C it is the ideal-gas vapour density at the Antoine saturation pressure: the vapour over the water in the vented drum. The cold start holds this vapour inventory (about 0.9 kg at 20 °C), so it starts in equilibrium.

Steam table (`src/utils/steamData.ts`): saturated water from 80 °C up to the critical point (373.946 °C, 220.64 bar), generated from IAPWS-IF97 (liquid specific volume, enthalpy and specific heat, plus latent heat). Boiling point at 180 bar is 357.0 °C. Lookups clamp at the critical point and never throw: a temperature or pressure above it returns the critical-point row (latent heat 0). Over-pressure is handled by the relief valve (see below) and burner protection (#33). Specific heat is held at its 370 °C value in the last row, see [design-basis.md](design-basis.md).

Steam removal (`BoilerRemoveSteam`, once for the bypass, then for the turbine valve):

```
Removed this tick = min(valve position × rated steam flow × tick, steam mass in the boiler)
Reported flow     = removed / tick   (kg/s, never above valve position × rated steam flow)
```

Rated steam flow is in [design-basis.md](design-basis.md) (`CstTurbine.MaxSteamRemovalRate`). All removed steam is subtracted from the steam mass; the bypass and the turbine valve draw from the same steam, in that order. Removal runs before `BoilerTick`, which flashes water to refill the inventory. That flash takes its latent heat from the water, so a draw cools the water and lowers the pressure; the gas holds pressure only while its heat matches the latent heat of the steam leaving.

Boiling point: steam-table interpolation in range, Antoine equation below it, clamped to the critical point (373.946 °C) from 220.64 bar up. `getBoilingPoint(180)` gives 357.0 °C.

## Relief valve

The boiler's automatic relief valve on the drum ([ADR 0005](../adr/0005-relief-valve-vents-to-atmosphere.md), `BoilerVent`, run first in `PowerPlantTick`, upstream of the main steam valve, so it vents with that valve closed). It opens fully at 178 bar and stays fully open until it closes at 171 bar (7 bar blowdown, about 4%). It decides on the pressure at the start of the tick; 178 bar leaves 2 bar below the 180 bar design pressure for the rise within one tick.

```
Relief capacity = 1.1 × heat into the water at full gas / latent heat at 178 bar ≈ 1.1 × 357 MW / 790 kJ/kg ≈ 497 kg/s
Vented this tick = min(relief capacity × tick, steam mass in the boiler)   (while open)
```

The vented steam goes to the atmosphere, not the condenser: it leaves the loop and is counted in the `ventedTotal` totalizer (kg) ([ADR 0002](../adr/0002-makeup-into-hotwell.md)). `reliefValveOpen` is the valve state and `reliefLifts` counts lifts. Like a steam draw, the vent leaves a deficit that the flash refills with latent heat from the water, so the water cools and the pressure falls. At full gas the capacity exceeds the steam made by 10%, so the pressure falls slowly and the valve lifts and reseats about every 10 s until the gas is reduced or the boiler runs dry. The operator cannot open, close or test it.

A boiler that runs dry with gas on jumps to the critical point (373.9 °C, 220.6 bar) in the tick its last water goes, whatever its pressure before (`turbine-sync` sits at 1 bar with 12 L just before): the last litres take the whole tick's gas heat and the heated temperature stops only at the critical-point clamp. The relief valve cannot prevent that; burner protection on low level is #33. A boiler that runs dry while venting (`full-gas`) instead freezes where its last water flashed (about 126 bar), with the energy totalizer still climbing.

Constants: `CstBoiler.ReliefOpenPressure`, `ReliefClosePressure`, `ReliefCapacityMargin`; the capacity itself is derived (`ReliefCapacity` in `BoilerTick.ts`). It is realistic sizing, not a departure.

## Pressure model

Pressure is the saturation pressure of the water temperature, never below atmospheric: `P = max(1.013 bar, Psat(T))` ([ADR 0001](../adr/0001-boiler-pressure-follows-saturation.md), `calculateBoilerPressure`). Steam mass does not feed into it. Below 100 °C the drum is vented and stays at atmospheric. The pressure is finite everywhere: the steam table clamps at the critical point (220.64 bar). Over-pressure is not capped here; the relief valve (below) and burner protection (#33) own it. Since pressure follows saturation, the relief valve is the temperature cap too: there is no separate temperature clamp. How fast pressure responds depends on the thermal mass, water only until #13.

## Constants and simplifications

| Item | Value |
|---|---|
| Gas energy density | 35 000 kJ/m³ |
| Burner efficiency | 85% |
| Natural cooling | 1 °C per 15 s without gas, a constant rate (heat loss proportional to temperature difference is #13) |
| Atmospheric pressure | 1.013 bar |
| Ambient temperature | 20 °C (`CstPhysics.AmbientTemperature`): natural cooling stops here, so energy keeps matching temperature |
| Start state | cold: ambient temperature, atmospheric pressure, 50 m³ water, the vapour inventory at ambient, energy = heating 50 m³ from 0 °C to ambient |

## Remaining empirical areas

- `calculateGasEnergy` uses `GasEfficiency`, which may be an empirical factor
- `calculateWaterVolume` uses a linear approximation below 80 °C (#34)
- Natural cooling is a constant rate, with no thermal mass of the metal (#13)
