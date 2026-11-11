# Condenser

Turns steam from the turbine exhaust and the bypass back into water, under vacuum, and collects it in the hotwell. Sizes are in [design-basis.md](design-basis.md). Code: `src/context/Condenser/CondenserTick.ts`, `src/utils/condenserCalculation.ts`.

## Condenser pressure and the vacuum system

The condenser pressure, shown as a vacuum readout in mbar, is the **shell vapour pressure** plus the **air pressure** ([ADR 0035](../adr/0035-condenser-pressure-is-vapour-plus-air.md), terms in `GLOSSARY.md`). Constants live in `CstSimulation.CstCondenser` (`src/context/const.ts`); sized values and sources are in [design-basis.md](design-basis.md#condenser-and-water-loop) and the [research note](../research/2026-11-condenser-air-system.md).

**Shell vapour pressure** is algebraic, with no vapour inventory. Each tick `solveShellVapourPressure` finds, by bisection, the pressure at which the limited exchanger (`condenserHeatCapacity`) takes exactly the heat the intake brings (`condensingDemand`: Σ flow · (h − hf) at that pressure, so moisture costs nothing and heat above saturated vapour is included). The exchanger heat rises with the saturation temperature and the demand falls with it, so the root is unique. It lies between a floor and a ceiling:
- **Floor:** the vapour pressure of the hotter of the cooling water intake and the hotwell water. With nothing to condense the shell is not cooler than the water in it (about 12 mbar at 10 °C, 23 mbar at 20 °C).
- **Ceiling:** `HoodReliefPressure` (1353 mbar) less the air pressure. If the exchanger cannot take the heat even there, the pressure sits at the ceiling and what the exchanger cannot condense leaves through the hood relief: `ventedTotal` (kg, a boundary flow of the water inventory). Long before that the pressure has passed the vacuum limit and the turbine has tripped.

**Air** is a mass inventory `airMass` (kg) in the shell volume `ShellVolume`; `airPressureOf` is P = m · R · T ÷ V with T the shell saturation temperature. The cold plant starts with the shell full of air at 1 bar. `calculateAirInventory` runs each tick (implicit step, stable for any capacity):
- **In-leakage:** `AirLeakRate` (0.0022 kg/s), only while the shell is under atmospheric pressure.
- **Out:** the vacuum system removes volume, S · ρ_air = S · m ÷ V kg/s. The pump and the SJAE each have a volumetric capacity S; they remove air only, not vapour.
- With the vacuum system stopped the vacuum is lost by in-leakage only, over hours (ADR 0035, consequences). There is no decay constant.

**Air extraction pump (CAR)**
- Toggle starts and stops the pump; capacity `CAR_Capacity` (m³/s), always removing while on. It is over-dimensioned on purpose: it pulls 1 bar down to the design vacuum in about a minute ([design-basis.md](design-basis.md#condenser-and-water-loop)). It hogs; the SJAE holds

**Steam jet air extraction (SJAE)**
- Toggle enables or disables it, plus open and close buttons for the valve in `SJAE_ValveStep` (5%) steps; capacity `SJAE_Capacity` scales linearly with the valve position, so a closed valve removes nothing
- Its motive steam is taken from the boiler, so it does not depend on the main steam valve: it runs with the valve shut, as on a real cold start on auxiliary steam ([research](../research/2026-11-sjae-motive-steam.md)). It uses no steam from the water balance; a real holding ejector's steam drains back to the hotwell, under 1% of the bypass flow
- Auto-disables when the boiler pressure is at or below `MainSteamValveMinimumPressure` (10 bar, too little motive pressure), or when the condenser pressure is above `SJAE_SuctionLimit` (170 mbar: the ejector breaks and removes nothing; the pump pulls the first vacuum)

The vacuum does not limit the intake: all turbine exhaust and bypass steam enters the condenser. `OptimalPressure` (31 mbar, the design vacuum) and `OptimalPressureBellWidth` only set the band shown on the vacuum readout. The turbine valve is interlocked with the condenser pressure: above the vacuum limit (`VacuumLimit`, value and source in [design-basis.md](design-basis.md#steam-path-and-turbine)) it cannot be opened, and an open valve closes in a turbine trip (see [turbine.md](turbine.md#vacuum-interlock-and-turbine-trip)). The pump alone gets the air to a trace and the shell under the limit; the pressure stays there only while the cooling water condenses the steam coming in.

## Energy balance

The condenser is a limited, single-pass heat exchanger ([ADR 0032](../adr/0032-limited-condenser-and-stream-enthalpy.md)). `calculateCondensation` implements the condensation:

1. Saturation temperature of the shell vapour pressure (`saturationTemperature`: mbar to bar, then `getBoilingPoint`; about 41 °C at 80 mbar, 24.7 °C at 31 mbar), the root of the heat balance above
2. Cold recirculation mass flow from the recirculation valve position (`RecirculationPump_MaxFlowRate`, 7400 L/s)
3. The exchanger (`condenserHeatCapacity`): the shell side is isothermal, so Q = ε · ṁ · cp · (Tsat − Tin) with ε = 1 − exp(−UA / (ṁ · cp)). UA is `HeatExchangerUA` (27 000 kW/K) at the full flow and scales with the flow to the power 0.5 (HEI); half the flow gives UA ÷ √2. No flow gives no heat, with no division by zero, and there is no heat at or below the intake temperature. At the design point the water rises about 8.5 K and leaves about 6 K under the saturation temperature; it never reaches it with flow on.
4. The streams are split at that pressure (see [Intakes](#intakes)). The vapour and the heat above saturated vapour take the exchanger capacity: below the ceiling it covers them exactly and all of it condenses; at the ceiling it covers a share and the rest of the vapour is vented
5. The cooling water outlet temperature (`coolingWaterOutletTemperature`) is the intake temperature plus the heat actually taken over ṁ · cp
6. The condensate and the moisture (kg, exactly that balance, no speed-up factor; the pump and the surface are sized for it, see [design-basis.md](design-basis.md#condenser-and-water-loop)) are limited by the room left in the hotwell after the exhaust moisture (`CstCondenser.TotalVolume` minus its volume, ÷ the specific volume at the hotter of the hotwell and the condensate, so the mix stays within the hotwell volume); what does not fit is vented. The hotwell collects the condensate
7. The condensate outlet temperature (`newOutletTemperature`) is exactly the saturation temperature: a pure function of the condenser pressure. The cooling water only sets how much steam condenses, not the condensate temperature. The incoming steam matters only through its enthalpy (see [Intakes](#intakes)): each kg of vapour costs the latent heat. With no recirculation flow nothing condenses and the temperature is still the saturation temperature. There is no sub-cooling.

A condensation pump moves hotwell water into the deaerator as the **Return** (`returnRate`, kg per tick; the pump flow in L/s is converted at the hotwell temperature). It does not feed the boiler itself: the water goes on from the deaerator through the boiler feed pump, the boiler's only water supply ([deaerator.md](deaerator.md#boiler-feed-pump-112), [ADR 0002](../adr/0002-makeup-into-hotwell.md)); its limits are in [feedwater-loop.md](feedwater-loop.md#return-and-capacity).

The hotwell is 50 m³, starting at 35 m³ (70%), sized at about 3 minutes of full-gas condensate below the normal level ([ADR 0009](../adr/0009-hotwell-sized-from-condensate-flow.md)). It holds `hotwellWaterMass` (kg); `hotwellWaterVolume` and the level are derived from it at `hotwellTemperature` ([ADR 0007](../adr/0007-water-state-is-mass-in-kg.md)), so a hot hotwell shows a higher level for the same water. Makeup and reject are valve flows in L/s converted to kg at the hotwell temperature; makeup stops at the hotwell room.

The hotwell temperature is the mass-weighted mix of the existing hotwell water, the condensate and exhaust moisture at saturation temperature and the makeup water (20 °C). In `bypass-loop` it settles near 27 °C (the condenser at about 30 mbar, held by the loop operator). The condensing capacity falls with the saturation temperature, so at a given cooling water flow the pressure settles where the exchanger takes exactly the intake's heat. Whole-plant check: at the end of `turbine-load` the fuel heat equals stack, electric output, generator and shaft losses, cooling water and boiler heat loss within 0.5% (golden test).

## Hotwell makeup and reject

- **Makeup valve**: demineralised water from outside the loop into the hotwell (`makeupValvePosition`, totalizer `makeupTotal`)
- **Reject valve**: hotwell water out of the loop to storage (`rejectValvePosition`, totalizer `rejectTotal`)

Two protections act in `CondenserTick` ([ADR 0011](../adr/0011-hotwell-protections-in-the-tick.md)): below `HotwellLowLow` (10% of the volume) the condensation pump trips (`condensationPumpTripped`, valve shut, no return), and from `HotwellHighHigh` (95%) the reject flows fully open without changing the stored valve position. The reducer refuses to open the pump while the level is below low-low.

Loop targets, the working band and the operator that holds them are in [feedwater-loop.md](feedwater-loop.md).

## Intakes

The condenser takes steam from two paths: the turbine exhaust and the boiler bypass valve. `PowerPlantTick` removes the steam from the boiler first and passes those same-tick flows to `CondenserTick`, so every kg through either valve arrives in the condenser in that tick (`intakeFlowRate` is their sum). Condenser vacuum acts on turbine back-pressure and power, not on the exhaust mass flow (#14).

Every stream enters at its real enthalpy (`{ flow, enthalpy }`, kJ/kg; [ADR 0032](../adr/0032-limited-condenser-and-stream-enthalpy.md), [ADR 0028](../adr/0028-exhaust-splits-by-quality-at-condenser-intake.md)). `splitStreamAtCondenser` compares it with saturated vapour at the new condenser pressure:

- **Below saturated vapour:** it splits into moisture and vapour by quality x = (h − hf) ÷ (hg − hf). The vapour must be condensed. The moisture goes straight to the hotwell in the same tick, at saturation temperature, and costs the cooling water nothing.
- **Above saturated vapour:** it is all vapour, and the extra heat (h − hg per kg) loads the cooling water in that tick before any vapour condenses, so less condenses. It is part of the demand the pressure solves for, so nothing is left over below the ceiling.
- **Bypass:** saturated vapour at the boiler pressure. At 10 bar it takes about 8% more cooling than the latent heat, at 165 bar under 1%.
- **Turbine exhaust:** the inlet enthalpy minus the work the shaft actually took per kg (`getExhaustEnthalpy`, `steamTable.ts`): `IsentropicEfficiency` × the drop × `shaftWorkFraction(rpm)` (x(2 − x), x = rpm ÷ sync; 0 at standstill, 1 at sync). `PowerPlantTick` works it out from the same pressures `TurbineTick` uses for the enthalpy drop, see [turbine.md](turbine.md#electric-output-14-since-71-the-load-carried). The exhaust is about 0.67 vapour at 165 bar to 100 mbar at sync speed, drier during run-up, and at standstill it behaves like bypass steam.
- **Full hotwell:** what does not fit in the room left is vented through the hood relief (`ventedTotal`), so no mass is lost from the count; condensation and makeup get what room remains.

`condensationRate` counts everything entering the hotwell, moisture included, so it equals the intake in a steady state.

## Remaining empirical areas

`ShellVolume` (UNVERIFIED, derived), the pump and SJAE capacities and the hood relief pressure (weak sources) in [design-basis.md](design-basis.md#condenser-and-water-loop); the exchanger UA at low flow ([ADR 0032](../adr/0032-limited-condenser-and-stream-enthalpy.md)).
