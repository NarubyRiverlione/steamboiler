# Boiler

A gas-fired boiler in a closed water loop, modelled as a single lumped vessel ([ADR 0019](../adr/0019-boiler-is-one-lumped-vessel.md)). Its volume and steel mass are sized from a real drum boiler (steam drum, waterwall tubes and downcomers), but it behaves as one pot: one volume and one temperature. Sizes and limits are in [design-basis.md](design-basis.md). Code: `src/context/Boiler/BoilerTick.ts`, `src/utils/boilerCalculations.ts`, constants in `CstSimulation.CstBoiler` (`src/context/const.ts`).

## What the model is not

A real drum boiler is a steam drum at the top and a lower (mud) drum at the bottom, joined by waterwall tubes (risers) in the furnace and downcomers outside it. Water heats and partly boils in the risers, and the lighter mixture rises while the denser water in the downcomers sinks (natural circulation). This simulator models none of that:

- **No separate drum, risers or downcomers**: the boiler is one 100 m³ volume. The water sits at the bottom and saturated steam fills the rest, so the steam space is the total minus the water, larger than a real drum's ([design-basis.md](design-basis.md)).
- **No circulation**: heat goes into the water as a whole; there is no flow through tubes and no steam quality in the risers.
- **No swell and shrink**: a real drum level jumps up when the steam valve opens, because the bubbles in the risers expand as pressure falls, and drops when it closes. Here the level moves only through thermal expansion of the water ([ADR 0007](../adr/0007-water-state-is-mass-in-kg.md)), boiling off, and water in and out.
- **No drum level**: the level is the water's share of the 100 m³ (a volume fraction), not millimetres from a normal water level in the drum. Levels such as the burner low-low level are therefore estimates without a real-plant equivalent.
- **No metal temperature**: the water and the steel share one temperature, so thermal stress in the drum walls is not modelled ([ADR 0006](../adr/0006-heating-rate-alarm-only.md)).

## Elements

- **Water and steam**: the boiler holds liquid water that turns to steam when enough energy is added. The water is held as mass in kg (`waterMass`) and its volume follows temperature (`getWaterSpecificVolume`, saturated-liquid specific volume from 20 °C up), so the level rises as the water heats (about +40% from 20 to 300 °C) and falls as water boils ([ADR 0007](../adr/0007-water-state-is-mass-in-kg.md)). Steam takes far more volume than the water it came from (about 1600× at atmospheric pressure).
- **Temperature**: one lumped temperature for the water and the drum and tube metal. It rises with gas energy, falls through heat loss to the surroundings and through the latent heat of water flashing to steam, and is diluted by returned water. A closed drum keeps heating past 100 °C; pressure follows it.
- **Pressure**: see **Pressure model** below.
- **Thermal mass**: the water plus about 100 t of drum and tube steel at 0.5 kJ/kg·K (50 MJ/K), at the water temperature. No separate metal temperature. At the cold start (35 t of water, 147 MJ/K) the metal adds about a third.
- **Energy**: the heat content above 0 °C of the water and the metal. The source is the gas burner. The sinks are heat loss, the latent heat of the flash (which includes steam vented by the relief valve), and drained water (the water's share only; the metal stays).
- **Volume**: a fixed 100 m³ shared between water and steam; 35 m³ of water at the start (34 937 kg at ambient), which expands to the 50 m³ working level at 165 bar ([ADR 0018](../adr/0018-cold-fill-at-35-percent.md)). `waterVolume` is derived from `waterMass` every tick, in `BoilerTick` only.
- **Water in and out**: the boiler is fed only by the condensation pump from the hotwell ([ADR 0002](../adr/0002-makeup-into-hotwell.md)). The drain valve removes 0.5% of total volume per second, converted to kg at the boiler temperature (`drainedTotal` counts kg). Steam leaves through the relief valve to the atmosphere (`BoilerVent`, see **Relief valve**), and through the turbine valve and the bypass (`BoilerRemoveSteam`): each passes `position ×` its max steam removal ([design-basis.md](design-basis.md)) in kg/s, so `× DeltaTime` kg per tick, taken from the steam inventory. The draw does not yet depend on boiler pressure. While #32 is open the reported flow can exceed the steam actually removed (this tick's generation is counted twice).

## Calculations

```
Heat capacity      = water mass × specific heat + metal mass × steel specific heat
Heat loss          = UA × (T − T_ambient)        (UA = 0.5 MW / (357 − 20) K ≈ 1.48 kW/K)
Heated temperature = T + (gas input − heat loss) / heat capacity
Steam inventory    = saturated steam density(T) × (total volume − water volume),  water volume = waterMass × specific volume(T)
Flashed mass       = inventory wanted − steam mass held     (negative: steam condenses)
Temperature        = heated temperature − flashed mass × latent heat / heat capacity
Pressure           = max(1.013 bar, Psat(temperature))
```

Each tick (`BoilerTick`, `calculateFlashedMass`):

1. Gas energy in, minus heat loss, warms the water and the metal. The temperature stops at the critical point, where the saturated model ends; a boiler run dry would otherwise run away.
2. The steam space should hold saturated steam at that temperature. Water flashes to steam (or steam condenses) to restore the inventory, and the latent heat is taken from (or returned to) the water.
3. Flashing cools the water (less steam wanted) and lowers the water level (more steam space), so the flashed mass is solved implicitly by bisection. An explicit step oscillates near the critical point, where steam density approaches water density. A boiler already in equilibrium flashes exactly nothing, so a resting plant stays at rest.
4. `deltaSteamMass` is the flash rate in kg/s: positive while heating or under draw, negative while cooling.
5. `heatLoss` (kW) is this tick's loss; `heatingRate` and `heatingRateOverLimit` are updated (see **Heating rate**).

Saturated steam density: the table holds only the liquid side, so the steam side comes from Clausius-Clapeyron, `vg = vf + hfg / (T · dP/dT)`, with `dP/dT` a centred difference over ±5 K (within 3% of IAPWS-IF97 from 100 to 300 °C). Below 80 °C it is the ideal-gas vapour density at the Antoine saturation pressure: the vapour over the water in the vented drum. The cold start holds this vapour inventory (about 0.9 kg at 20 °C), so it starts in equilibrium.

Steam table (`src/utils/steamData.ts`): saturated water from 80 °C up to the critical point (373.946 °C, 220.64 bar), generated from IAPWS-IF97 (liquid specific volume, enthalpy and specific heat, plus latent heat). Boiling point at 180 bar is 357.0 °C. Lookups clamp at the critical point and never throw: a temperature or pressure above it returns the critical-point row (latent heat 0). Over-pressure is handled by the relief valve (see below) and the burner trip (see below). Specific heat is held at its 370 °C value in the last row, see [design-basis.md](design-basis.md).

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

A boiler that runs dry with gas on keeps heating its metal: with no water left to flash, the gas heats the 50 MJ/K of steel by about 7 K/s up to the critical-point clamp (373.9 °C, 220.6 bar). This starts in the last litre or so, which cannot absorb the gas heat. The relief valve cannot prevent it; the burner trip does (below).

## Burner trip

The burner trips when the water volume falls below the burner low-low level, 20% of the boiler volume (`CstBoiler.BurnerLowLowLevel`, UNVERIFIED, see [design-basis.md](design-basis.md)) ([ADR 0017](../adr/0017-burner-trips-on-low-water-level.md)). `BoilerBurnerTrip` runs first in `PowerPlantTick`, upstream of the relief valve, on the volume at the start of the tick: the gas is forced to 0 and `burnerTripped` is set, whatever the operator or a scenario does. `INCREASE_GAS_FLOW` is refused while the volume is below the level; the next successful raise clears the flag. There is no pressure or temperature trip: pressure follows saturation, and the relief valve holds it while water remains. A drained boiler trips the burner as well. The boiler panel shows the trip and the sim report notes its time; the CSV has `boiler_burnerTripped`.

In `boiler-low` (full gas, everything closed) the burner trips at about 270 s with about 18 m³ left, and the peak is 177.5 bar and 355.7 °C, inside design.

Constants: `CstBoiler.ReliefOpenPressure`, `ReliefClosePressure`, `ReliefCapacityMargin`; the capacity itself is derived (`ReliefCapacity` in `BoilerTick.ts`). It is realistic sizing, not a departure.

## Heating rate

The rise of the water temperature, smoothed (`heatingRate`, K/s; shown in K/min), and an alarm over the heating-rate limit (`heatingRateOverLimit`) ([ADR 0006](../adr/0006-heating-rate-alarm-only.md)). The smoothing is an exponential moving average with a 30 s time constant: each tick moves it `DeltaTime / 30 s` of the way to this tick's rate, so after a step it covers 63% in 30 s.

```
Heating rate = previous + (ΔT / tick − previous) × tick / 30 s
Alarm        = heating rate > 0.4 K/s (24 K/min)
```

The limit is time-compressed (a real drum allows about 100 K/h, see [design-basis.md](design-basis.md)). Alarm only: the burner trip is on water level only and does not look at the rate. Full gas from cold rises at about 98 K/min and raises the alarm; the operator ramping the gas at the limit reaches 165 bar in about 16.3 min (`heat-up`). Constants: `CstBoiler.HeatingRateLimit`, `HeatingRateWindow`.

## Pressure model

Pressure is the saturation pressure of the water temperature, never below atmospheric: `P = max(1.013 bar, Psat(T))` ([ADR 0001](../adr/0001-boiler-pressure-follows-saturation.md), `calculateBoilerPressure`). Steam mass does not feed into it. Below 100 °C the drum is vented and stays at atmospheric. The pressure is finite everywhere: the steam table clamps at the critical point (220.64 bar). Over-pressure is not capped here; the relief valve (below) owns it, and the burner trip keeps the boiler from running dry. Since pressure follows saturation, the relief valve is the temperature cap too: there is no separate temperature clamp. How fast pressure responds depends on the thermal mass of the water and the metal.

## Constants and simplifications

| Item | Value |
|---|---|
| Gas energy density | 35 000 kJ/m³ |
| Burner efficiency | 85% |
| Metal mass | 100 t steel at 0.5 kJ/kg·K (`CstBoiler.MetalMass`, `CstPhysics.Steel_SpecificHeat`) |
| Heat loss | 0.5 MW at design temperature, proportional to T − ambient (`CstBoiler.HeatLossAtDesign`): about 250 kW and 3.6 K per hour at 190 °C, so a cooldown takes days |
| Heating-rate limit | 0.4 K/s (24 K/min), smoothed over 30 s, alarm only |
| Atmospheric pressure | 1.013 bar |
| Ambient temperature | 20 °C (`CstPhysics.AmbientTemperature`): heat loss stops here, and the temperature never falls below it |
| Start state | cold: ambient temperature, atmospheric pressure, 35 m³ water (34 937 kg at ambient), the vapour inventory at ambient, energy = heating that water and 100 t of steel from 0 °C to ambient |

## Remaining empirical areas

- `calculateGasEnergy` uses `GasEfficiency`, which may be an empirical factor
- The metal shares the water temperature; a lagging metal temperature (thermal stress) is not modelled
