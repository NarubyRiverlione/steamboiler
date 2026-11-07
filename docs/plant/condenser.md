# Condenser

Turns steam from the turbine exhaust and the bypass back into water, under vacuum, and collects it in the hotwell. Sizes are in [design-basis.md](design-basis.md). Code: `src/context/Condenser/CondenserTick.ts`, `src/utils/condenserCalculation.ts`.

## Vacuum system

The condenser pressure, shown as a vacuum readout in mbar, is controlled by two systems. Constants live in `CstSimulation.CstCondenser` (`src/context/const.ts`).

**Air extraction pump (CAR)**
- Toggle starts and stops the pump
- Builds vacuum gradually to `CAR_MaxVacuum` over `CAR_TimeNeeded`
- When stopped, vacuum decays gradually toward atmospheric

**Steam jet air extraction (SJAE)**
- Toggle enables or disables it, plus open and close buttons for the valve in `SJAE_ValveStep` (5%) steps
- With the SJAE disabled the valve position is ignored and pressure climbs gradually
- Enabled, it builds vacuum over time based on boiler pressure and valve position
- Its motive steam is taken from the boiler, so it does not depend on the main steam valve: it runs with the valve shut, as on a real cold start on auxiliary steam ([research](../research/2026-11-sjae-motive-steam.md)). It uses no steam from the water balance; a real holding ejector's steam drains back to the hotwell, under 1% of the bypass flow
- Auto-disables when the boiler pressure is at or below `MainSteamValveMinimumPressure` (10 bar, too little motive pressure), or when condenser pressure is more than `SJAE_MaxPressureDifference` above `CAR_MaxVacuum` (the air extraction pump pulls the first vacuum)

`CondenserTick` calls `calculateVacuumByReducers` (`condenserCalculation.ts`) each tick: CAR first, then SJAE, then decay if neither is active. Pressure is atmospheric plus a steam-mass term (`steamMass / 1000`, not physically derived) minus that vacuum. The vacuum does not limit the intake: all turbine exhaust and bypass steam enters the condenser. `OptimalPressure` (31 mbar, the design vacuum) and `OptimalPressureBellWidth` only set the band shown on the vacuum readout. The turbine valve is interlocked with the condenser pressure: above the vacuum limit (`VacuumLimit`, value and source in [design-basis.md](design-basis.md#steam-path-and-turbine)) it cannot be opened, and an open valve closes in a turbine trip (see [turbine.md](turbine.md#vacuum-interlock-and-turbine-trip)). The air extraction pump alone (`CAR_MaxVacuum`) gets under the limit; with steam coming in, the pressure only stays there while the recirculation pump condenses it.

## Energy balance

The condenser is a limited, single-pass heat exchanger ([ADR 0032](../adr/0032-limited-condenser-and-stream-enthalpy.md)). `calculateCondensation` implements the condensation:

1. Saturation temperature of the condenser pressure (`saturationTemperature`: mbar to bar, then `getBoilingPoint`; about 41 °C at 80 mbar, 24.7 °C at 31 mbar)
2. Cold recirculation mass flow from the recirculation valve position (`RecirculationPump_MaxFlowRate`, 7400 L/s)
3. The exchanger (`condenserHeatCapacity`): the shell side is isothermal, so Q = ε · ṁ · cp · (Tsat − Tin) with ε = 1 − exp(−UA / (ṁ · cp)). UA is `HeatExchangerUA` (27 000 kW/K) at the full flow and scales with the flow to the power 0.5 (HEI); half the flow gives UA ÷ √2. No flow gives no heat, with no division by zero, and there is no heat at or below the intake temperature. At the design point the water rises about 8.5 K and leaves about 6 K under the saturation temperature; it never reaches it with flow on.
4. The heat the intake carries above saturated vapour (see [Intakes](#intakes)) takes capacity first; the rest condenses vapour: mass = (Q − extra heat) ÷ latent heat (`hg − hf` at the condenser pressure, the table of the exhaust enthalpy)
5. The cooling water outlet temperature (`coolingWaterOutletTemperature`) is the intake temperature plus the heat actually taken over ṁ · cp
6. Steam and liquid masses (kg) adjusted by exactly that balance (no speed-up factor; the pump and the surface are sized for it, see [design-basis.md](design-basis.md#condenser-and-water-loop)), limited by the room left in the hotwell after the exhaust moisture (`CstCondenser.TotalVolume` minus its volume, ÷ the specific volume at the hotter of the hotwell and the condensate, so the mix stays within the hotwell volume); the hotwell collects the condensate
7. The condensate outlet temperature (`newOutletTemperature`) is exactly the saturation temperature: a pure function of the condenser pressure. The cooling water only sets how much steam condenses, not the condensate temperature. The incoming steam matters only through its enthalpy (see [Intakes](#intakes)): the pool holds vapour, so each kg of it costs the latent heat. With no recirculation flow nothing condenses and the temperature is still the saturation temperature. There is no sub-cooling.

A condensation pump moves hotwell water into the boiler as the **Return** (`returnRate`, kg per tick; the pump flow in L/s is converted at the hotwell temperature). It is the boiler's only water supply ([ADR 0002](../adr/0002-makeup-into-hotwell.md)); its limits are in [feedwater-loop.md](feedwater-loop.md#return-and-capacity).

The hotwell is 50 m³, starting at 35 m³ (70%), sized at about 3 minutes of full-gas condensate below the normal level ([ADR 0009](../adr/0009-hotwell-sized-from-condensate-flow.md)). It holds `hotwellWaterMass` (kg); `hotwellWaterVolume` and the level are derived from it at `hotwellTemperature` ([ADR 0007](../adr/0007-water-state-is-mass-in-kg.md)), so a hot hotwell shows a higher level for the same water. Makeup and reject are valve flows in L/s converted to kg at the hotwell temperature; makeup stops at the hotwell room.

The hotwell temperature is the mass-weighted mix of the existing hotwell water, the condensate and exhaust moisture at saturation temperature and the makeup water (20 °C). In `bypass-loop` it settles near 30 °C (condenser at 15 to 65 mbar). At full recirculation the condensing capacity falls with the saturation temperature, so at the 15 mbar of `bypass-loop` (about 13 °C, 3 K above the intake) it is only about the bypass steam: the condenser holds a few hundred kg of steam and its pressure settles where condensation equals the intake. Whole-plant check: at the end of `turbine-load` the fuel heat equals stack, electric output, generator and shaft losses, cooling water and boiler heat loss within 0.5% (golden test).

## Hotwell makeup and reject

- **Makeup valve**: demineralised water from outside the loop into the hotwell (`makeupValvePosition`, totalizer `makeupTotal`)
- **Reject valve**: hotwell water out of the loop to storage (`rejectValvePosition`, totalizer `rejectTotal`)

Two protections act in `CondenserTick` ([ADR 0011](../adr/0011-hotwell-protections-in-the-tick.md)): below `HotwellLowLow` (10% of the volume) the condensation pump trips (`condensationPumpTripped`, valve shut, no return), and from `HotwellHighHigh` (95%) the reject flows fully open without changing the stored valve position. The reducer refuses to open the pump while the level is below low-low.

Loop targets, the working band and the operator that holds them are in [feedwater-loop.md](feedwater-loop.md).

## Intakes

The condenser takes steam from two paths: the turbine exhaust and the boiler bypass valve. `PowerPlantTick` removes the steam from the boiler first and passes those same-tick flows to `CondenserTick`, so every kg through either valve arrives in the condenser in that tick (`intakeFlowRate` is their sum). Condenser vacuum acts on turbine back-pressure and power, not on the exhaust mass flow (#14).

Every stream enters at its real enthalpy (`{ flow, enthalpy }`, kJ/kg; [ADR 0032](../adr/0032-limited-condenser-and-stream-enthalpy.md), [ADR 0028](../adr/0028-exhaust-splits-by-quality-at-condenser-intake.md)). `splitStreamAtCondenser` compares it with saturated vapour at the new condenser pressure:

- **Below saturated vapour:** it splits into moisture and vapour by quality x = (h − hf) ÷ (hg − hf). The vapour joins the pool. The moisture goes straight to the hotwell in the same tick, at saturation temperature, and no longer counts in the steam-mass pressure term.
- **Above saturated vapour:** it is all vapour, and the extra heat (h − hg per kg) loads the cooling water in that tick before any vapour condenses, so less condenses. The pool stays pure vapour with no energy state; extra heat the exchanger cannot take is not carried over (a departure, [design-basis.md](design-basis.md#deliberate-departures-from-a-real-plant)).
- **Bypass:** saturated vapour at the boiler pressure. At 10 bar it takes about 8% more cooling than the latent heat, at 165 bar under 1%.
- **Turbine exhaust:** the inlet enthalpy minus the work the shaft actually took per kg (`getExhaustEnthalpy`, `steamTable.ts`): `IsentropicEfficiency` × the drop × `shaftWorkFraction(rpm)` (x(2 − x), x = rpm ÷ sync; 0 at standstill, 1 at sync). `PowerPlantTick` works it out from the same pressures `TurbineTick` uses for the enthalpy drop, see [turbine.md](turbine.md#electric-output-14-since-71-the-load-carried). The exhaust is about 0.67 vapour at 165 bar to 100 mbar at sync speed, drier during run-up, and at standstill it behaves like bypass steam.
- **Full hotwell:** moisture that does not fit in the room left joins the pool, so no mass is lost; condensation and makeup get what room remains.

`condensationRate` counts everything entering the hotwell, moisture included, so it equals the intake in a steady state.

## Remaining empirical areas

`calcCARvacuum` (`CAR_MaxVacuum`, `CAR_TimeNeeded`), `calcSJAEvacuum` (`SJAE_MaxPressureDifference`, `SJAE_VacuumIncreaseRate`), `calculateCondensation`, and the steam-mass pressure term in `CondenserTick`.
