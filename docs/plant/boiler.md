# Boiler

A gas-fired boiler in a closed water loop, modelled as a single lumped vessel ([ADR 0019](../adr/0019-boiler-is-one-lumped-vessel.md)). Its volume and steel mass are sized from a real drum boiler (steam drum, waterwall tubes and downcomers), but it behaves as one pot: one volume and one temperature. Sizes and limits are in [design-basis.md](design-basis.md). Code: `src/context/Boiler/BoilerTick.ts`, `src/utils/boilerCalculations.ts`, `src/utils/flueGas.ts`, constants in `CstSimulation.CstBoiler` and `CstFlueGas` (`src/context/const.ts`).

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
- **Energy**: the heat content above 0 °C of the water and the metal. The source is the fuel heat less what leaves up the stack (see **Flue gas and economizer**). The sinks are heat loss, the latent heat of the flash (which includes steam vented by the relief valve), and drained water (the water's share only; the metal stays).
- **Volume**: a fixed 100 m³ shared between water and steam; 35 m³ of water at the start (34 937 kg at ambient), which expands to the 50 m³ working level at 165 bar ([ADR 0018](../adr/0018-cold-fill-at-35-percent.md)). `waterVolume` is derived from `waterMass` every tick, in `BoilerTick` only.
- **Water in and out**: the boiler is fed only by the condensation pump from the hotwell ([ADR 0002](../adr/0002-makeup-into-hotwell.md)). The drain valve removes 0.5% of total volume per second, converted to kg at the boiler temperature (`drainedTotal` counts kg). Steam leaves through the relief valve to the atmosphere (`BoilerVent`, see **Relief valve**), and through the turbine valve and the bypass (`BoilerRemoveSteam`): each passes a flow that follows its position and the boiler pressure (see **Steam removal** below), taken from the steam inventory.

## Calculations

```
Heat capacity      = water mass × specific heat + metal mass × steel specific heat
Heat loss          = UA × (T − T_ambient)        (UA = 0.5 MW / (357 − 20) K ≈ 1.48 kW/K)
Heated temperature = T + (heat into the water − heat loss) / heat capacity
Steam inventory    = saturated steam density(T) × (total volume − water volume),  water volume = waterMass × specific volume(T)
Flashed mass       = inventory wanted − steam mass held     (negative: steam condenses)
Temperature        = heated temperature − flashed mass × latent heat / heat capacity
Pressure           = max(1.013 bar, Psat(temperature))
```

Each tick (`BoilerTick`, `calculateFlashedMass`):

1. The heat into the water (fuel heat less stack heat, `calculateFlueGasHeatBalance`), minus heat loss, warms the water and the metal. The temperature stops at the critical point, where the saturated model ends; a boiler run dry would otherwise run away.
2. The steam space should hold saturated steam at that temperature. Water flashes to steam (or steam condenses) to restore the inventory, and the latent heat is taken from (or returned to) the water.
3. Flashing cools the water (less steam wanted) and lowers the water level (more steam space), so the flashed mass is solved implicitly by bisection. An explicit step oscillates near the critical point, where steam density approaches water density. A boiler already in equilibrium flashes exactly nothing, so a resting plant stays at rest.
4. `deltaSteamMass` is the flash rate in kg/s: positive while heating or under draw, negative while cooling.
5. `heatLoss` (kW) is this tick's loss; `heatingRate` and `heatingRateOverLimit` are updated (see **Heating rate**).

Saturated steam density: the table holds only the liquid side, so the steam side comes from Clausius-Clapeyron, `vg = vf + hfg / (T · dP/dT)`, with `dP/dT` a centred difference over ±5 K of the table pressure (within 3% of IAPWS-IF97 from 100 to 350 °C). The table has a row every 1 K from 300 to 370 °C, so the window crosses many nodes and the density slope steps by under 0.2 kg/m³ per K (it stepped by 0.65 with the old 10-20 K rows, #46, [ADR 0025](../adr/0025-finer-steam-table-for-density-slope.md)). The last 1 K row (370 °C) sits 3.9 K below the critical-point row, so the slope still steps there and the density dips about 1% at 369.5-370 °C; the relief valve caps the plant at about 357 °C, so it is out of reach. Below 80 °C it is the ideal-gas vapour density at the Antoine saturation pressure: the vapour over the water in the vented drum. The cold start holds this vapour inventory (about 0.9 kg at 20 °C), so it starts in equilibrium.

Steam table (`src/utils/steamData.ts`): saturated water from 80 °C up to the critical point (373.946 °C, 220.64 bar), generated from IAPWS-IF97 (liquid specific volume, enthalpy and specific heat, plus latent heat), rows 1 K apart from 300 to 370 °C. Boiling point at 180 bar is 357.0 °C. Lookups clamp at the critical point and never throw: a temperature or pressure above it returns the critical-point row (latent heat 0). Over-pressure is handled by the relief valve (see below) and the burner trip (see below). Specific heat is held at its 370 °C value in the last row, see [design-basis.md](design-basis.md).

**Steam removal** (`BoilerRemoveSteam`, once for the bypass, then for the turbine valve):

```
Valve flow        = valve position × valve capacity × √(P·ρ) / √(P·ρ)rated
Removed this tick = min(valve flow × tick, steam mass in the boiler)
Reported flow     = removed / tick   (kg/s)
```

P is the boiler pressure at the start of the tick and ρ the saturated steam density at that pressure; the rated term is taken at the rating point, 165 bar (`valveFlowFactor`, [ADR 0026](../adr/0026-valve-flow-follows-pressure.md)). The capacity is a rating, not a cap; it and the flow at other pressures are in [design-basis.md](design-basis.md) (`CstTurbine.MaxSteamRemovalRate`). All removed steam is subtracted from the steam mass; the bypass and the turbine valve draw from the same steam, in that order. Removal runs before `BoilerTick`, which flashes water to refill the inventory. That flash takes its latent heat from the water, so a draw cools the water and lowers the pressure; the gas holds pressure only while its heat matches the latent heat of the steam leaving.

At or below 10 bar the main steam valve closes before any steam is removed ([turbine.md](turbine.md#low-pressure-closure)), so neither valve draws on a boiler below that pressure. That leaves one limit of the model out of reach: at ambient the clamp on `temperature` keeps the latent heat of the flash out of the water, so a draw there would evaporate water for free. `BoilerTick` has no guard for it, and none is needed while the closure stands.

Boiling point: steam-table interpolation in range, Antoine equation below it, clamped to the critical point (373.946 °C) from 220.64 bar up. `getBoilingPoint(180)` gives 357.0 °C.

## Flue gas and economizer

Boiler efficiency is not a constant. The flue gas passes two heat exchangers in turn, the boiler surface and then the economizer, and what it still carries at the stack is the loss ([ADR 0029](../adr/0029-boiler-efficiency-from-flue-gas-heat-balance.md), `src/utils/flueGas.ts`, `calculateFlueGasHeatBalance`, constants in `CstFlueGas`). `BoilerTick` runs it every tick with the boiler temperature, the Return flow of the tick (`CondenserState.returnRate` ÷ tick, kg/s) and the hotwell temperature the Return leaves at.

```
Fuel heat         = gas flow × GasEnergyDensity                       (lower heating value, 420 MW at full gas)
Flue gas          = 14.7 kg per m³ of gas (15% excess air at every firing rate), from 1775 °C
Boiler stage      : heat from the gas = UA_boiler × log-mean(gas, boiler water)     boiler water at one temperature
Economizer        : heat from the gas = UA_eco × counterflow log-mean(gas, Return)  never past Return outlet = saturation − 28 K
UA                = UA at full gas × (gas flow / full gas)^0.65     (the water side is ignored)
Stack heat        = flue gas × (enthalpy at the stack temperature − enthalpy at ambient)
Heat into water   = Fuel heat − Stack heat        (the economizer heat included)
Efficiency        = Heat into water / Fuel heat
```

- **Flue gas enthalpy:** a quadratic through three points of Ganapathy's Table A7b (natural gas, 15% excess air), taken relative to ambient (20 °C). It is extrapolated to the 1775 °C combustion temperature.
- **Boiler stage:** sized for flue gas 100 K above the water at full gas and 350 °C (an estimate; the sourced span is 60 to 150 K). The sized surface is about 668 kW/K. With the boiler colder the gas leaves cooler, so a colder boiler is more efficient; firing lower narrows the gap (about 20 K at 25% gas at 350 °C).
- **Economizer:** sized for a 160 °C stack at full gas with 171 kg/s of Return at 37 °C, about 291 kW/K (a design choice, not a real unit's figure). The Return enters at the hotwell temperature and its enthalpy is the saturated liquid enthalpy (`getLiquidEnthalpy`, IF97, with a cold table below the 80 °C start of the steam table).
- **Return limit:** the Return leaves the economizer at most 28 K below the boiler saturation temperature (UNVERIFIED). Heat it cannot take stays in the flue gas: the stack gets hotter and efficiency falls.
- **No Return:** the economizer recovers nothing and the stack is the boiler stage exit (79% at full gas and 350 °C). **No gas:** no heat in, none up the stack, efficiency 0, stack at ambient.
- **Closing the balance:** every tick, fuel heat = heat into the water + heat up the stack. The existing heat loss still comes off the water afterwards; there is no radiation term.
- **State:** `stackTemperature` (°C), `boilerEfficiency` (0 to 1) and `returnTemperatureOut` (°C, the Return after the economizer; the hotwell temperature when it takes no heat). The CSV carries them; the sim report plots the Return temperature after the economizer. The Boiler page shows the stack temperature and the boiler efficiency (#89).
- **The Return pays its enthalpy** ([ADR 0030](../adr/0030-return-pays-real-enthalpy.md), #74): `BoilerTick` adds `returnHeatOf` to the energy of the tick, this tick's Return mass times the saturated liquid enthalpy at its temperature after the economizer less that at the boiler temperature (`getLiquidEnthalpy`, not a specific heat: cp near 350 °C is more than double the cold value). A cold Return lowers the temperature and `energy`; a Return hotter than the boiler warms it. The economizer heat is counted once, in the Return's own enthalpy, so the gas share of the tick is the heat into the water less the economizer heat. Pump work (about 16 kJ/kg, 1% of the Return's cost) is ignored.

Simplifications and the figures behind them are in [design-basis.md](design-basis.md); the sources in [the research note](../research/2026-11-economizer-flue-gas.md).

## Relief valve

The boiler's automatic relief valve on the drum ([ADR 0005](../adr/0005-relief-valve-vents-to-atmosphere.md), `BoilerVent`, run first in `PowerPlantTick`, upstream of the main steam valve, so it vents with that valve closed). It opens fully at 178 bar and stays fully open until it closes at 171 bar (7 bar blowdown, about 4%). It decides on the pressure at the start of the tick; 178 bar leaves 2 bar below the 180 bar design pressure for the rise within one tick.

```
Relief capacity = 1.1 × worst-case heat into the water / latent heat at 178 bar ≈ 1.1 × 330 MW / 794 kJ/kg ≈ 457 kg/s
Worst case       = full gas, boiler at the saturation of 178 bar, no Return (the economizer recovers nothing, and all the heat goes into steam, ADR 0030)
Vented this tick = min(relief capacity × tick, steam mass in the boiler)   (while open)
```

The vented steam goes to the atmosphere, not the condenser: it leaves the loop and is counted in the `ventedTotal` totalizer (kg) ([ADR 0002](../adr/0002-makeup-into-hotwell.md)). `reliefValveOpen` is the valve state and `reliefLifts` counts lifts. Like a steam draw, the vent leaves a deficit that the flash refills with latent heat from the water, so the water cools and the pressure falls. At full gas the capacity exceeds the steam made by at least 10%, so the pressure falls slowly and the valve lifts and reseats about every 10 s until the gas is reduced or the boiler runs dry. The operator cannot open, close or test it.

A boiler that runs dry with gas on keeps heating its metal: with no water left to flash, the gas heats the 50 MJ/K of steel by about 7 K/s up to the critical-point clamp (373.9 °C, 220.6 bar). This starts in the last litre or so, which cannot absorb the gas heat. The relief valve cannot prevent it; the burner trip does (below).

## Gas rate knob

The operator does not set a gas value; the gas knob sets a **gas rate** ([ADR 0033](../adr/0033-gas-is-a-rate-knob.md)). `gasRateCommand` (-1 to 1) is the knob position in `BoilerState`: centre holds, right raises, left lowers. The reducer's `SET_GAS_RATE` sets it (clamped to the travel) and nothing else; `gasFlow` is the integral of the command, stepped in `BoilerTick` in simulated seconds (so pause and the 1x, 10x and 60x speeds behave correctly), and clamped to 0 to `MaxGasFlow`. At the ends the knob stays where it is.

In the UI the knob is dragged sideways only (right raises, left lowers, 120 px for the full sweep; up and down do nothing), or turned with the scroll wheel or the arrow keys. A drag moves the knob relative to where it was grabbed, so grabbing it never jumps the command.

```
rate (L/s per second) = sign × ((|command| − GasRateDeadZone) / (1 − GasRateDeadZone))² × GasRateMax     (0 inside the dead zone)
gasFlow               = clamp(gasFlow + rate × DeltaTime, 0, MaxGasFlow)
```

`GasRateMax` is 300 L/s per second: 0 to full gas in 40 s, one turn and one wait. `GasRateDeadZone` is 0.05 of the travel. The quadratic taper makes a small turn a trim: a quarter turn raises 13 L/s per second, half the travel about 90. There is no separate burner slew limit: the rate at full deflection is the limit. The gas never jumps within a tick (30 L/s at the most). A deflection in `BoilerTick` costs one tick: the gas of a tick is the gas after that tick's step.

The startup pace still comes from the operator ramping the gas against the heating-rate limit; the knob changes the control, not the pace. The operators of the headless scenarios turn the same knob (`sim/scenarios/gas.ts`, [headless-runner.md](../dev/headless-runner.md)). `GasRateMax` and the dead zone are UNVERIFIED playability numbers, see [design-basis.md](design-basis.md).

## Burner trip

The burner trips when the water volume falls below the burner low-low level, 20% of the boiler volume (`CstBoiler.BurnerLowLowLevel`, UNVERIFIED, see [design-basis.md](design-basis.md)) ([ADR 0017](../adr/0017-burner-trips-on-low-water-level.md)). `BoilerBurnerTrip` runs first in `PowerPlantTick`, upstream of the relief valve, on the volume at the start of the tick: the gas is forced to 0 and `burnerTripped` is set, whatever the operator or a scenario does. The trip also centres the gas knob (`gasRateCommand` 0). `SET_GAS_RATE` is refused when it turns the knob up past the dead zone while the volume is below the level; above it, a deflection past the dead zone to the raise side clears the flag and the gas ramps up from 0 (lowering or centring the knob never clears it). There is no pressure or temperature trip: pressure follows saturation, and the relief valve holds it while water remains. A drained boiler trips the burner as well. The boiler panel shows the trip and the sim report notes its time; the CSV has `boiler_burnerTripped`.

In `boiler-low` (full gas, everything closed) the burner trips at about 271 s with about 19 m³ left, and the peak is 178.0 bar and 356.1 °C, inside design.

Constants: `CstBoiler.ReliefOpenPressure`, `ReliefClosePressure`, `ReliefCapacityMargin`; the capacity itself is derived (`ReliefCapacity` in `BoilerTick.ts`). It is realistic sizing, not a departure.

## Heating rate

The rise of the water temperature, smoothed (`heatingRate`, K/s; shown in K/min), and an alarm over the heating-rate limit (`heatingRateOverLimit`) ([ADR 0006](../adr/0006-heating-rate-alarm-only.md)). The smoothing is an exponential moving average with a 30 s time constant: each tick moves it `DeltaTime / 30 s` of the way to this tick's rate, so after a step it covers 63% in 30 s.

```
Heating rate = previous + (ΔT / tick − previous) × tick / 30 s
Alarm        = heating rate > 0.4 K/s (24 K/min)
```

The limit is time-compressed (a real drum allows about 100 K/h, see [design-basis.md](design-basis.md)). Alarm only: the burner trip is on water level only and does not look at the rate. Full gas from cold rises at about 103 K/min and raises the alarm; the operator ramping the gas at the limit reaches 165 bar in about 16.0 min (`heat-up`, 962 s). Constants: `CstBoiler.HeatingRateLimit`, `HeatingRateWindow`.

## Pressure model

Pressure is the saturation pressure of the water temperature, never below atmospheric: `P = max(1.013 bar, Psat(T))` ([ADR 0001](../adr/0001-boiler-pressure-follows-saturation.md), `calculateBoilerPressure`). Steam mass does not feed into it. Below 100 °C the drum is vented and stays at atmospheric. The pressure is finite everywhere: the steam table clamps at the critical point (220.64 bar). Over-pressure is not capped here; the relief valve (below) owns it, and the burner trip keeps the boiler from running dry. Since pressure follows saturation, the relief valve is the temperature cap too: there is no separate temperature clamp. How fast pressure responds depends on the thermal mass of the water and the metal.

## Constants and simplifications

| Item | Value |
|---|---|
| Gas energy density | 35 000 kJ/m³, a lower heating value at 25 °C combustion and 0 °C metering (`CstPhysics.GasEnergyDensity`) |
| Boiler efficiency | not a constant: follows from the flue gas heat balance, about 93.4% at full gas, 350 °C and 171 kg/s of Return (93.9% at rated output), about 79% with no Return |
| Metal mass | 100 t steel at 0.5 kJ/kg·K (`CstBoiler.MetalMass`, `CstPhysics.Steel_SpecificHeat`) |
| Heat loss | 0.5 MW at design temperature, proportional to T − ambient (`CstBoiler.HeatLossAtDesign`): about 250 kW and 3.6 K per hour at 190 °C, so a cooldown takes days |
| Heating-rate limit | 0.4 K/s (24 K/min), smoothed over 30 s, alarm only |
| Atmospheric pressure | 1.013 bar |
| Ambient temperature | 20 °C (`CstPhysics.AmbientTemperature`): heat loss stops here, and the temperature never falls below it |
| Start state | cold: ambient temperature, atmospheric pressure, 35 m³ water (34 937 kg at ambient), the vapour inventory at ambient, energy = heating that water and 100 t of steel from 0 °C to ambient |

## Remaining empirical areas

- The metal shares the water temperature; a lagging metal temperature (thermal stress) is not modelled
