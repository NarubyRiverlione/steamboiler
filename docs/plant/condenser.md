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
- Enabled, it builds vacuum over time based on steam flow and valve position
- Auto-disables when there is no steam flow in the master steam valve, or when condenser pressure is more than `SJAE_MaxPressureDifference` above `CAR_MaxVacuum`

`CondenserTick` calls `calculateVacuumByReducers` (`condenserCalculation.ts`) each tick: CAR first, then SJAE, then decay if neither is active. Pressure is atmospheric plus a steam-mass term (`steamMass / 1000`, not physically derived) minus that vacuum. The vacuum does not limit the intake: all turbine exhaust and bypass steam enters the condenser. `OptimalPressure` and `OptimalPressureBellWidth` only set the band shown on the vacuum readout. The turbine valve is interlocked with the condenser pressure: above the vacuum limit (`VacuumLimit`, value and source in [design-basis.md](design-basis.md#steam-path-and-turbine)) it cannot be opened, and an open valve closes in a turbine trip (see [turbine.md](turbine.md#vacuum-interlock-and-turbine-trip)). The air extraction pump alone (`CAR_MaxVacuum`) gets under the limit; with steam coming in, the pressure only stays there while the recirculation pump condenses it.

## Energy balance

`calculateCondensation` implements the condensation:

1. Cold recirculation mass flow from the recirculation valve position
2. Temperature difference between condensed water and cold intake water
3. Energy absorbed: Q = m · cp · ΔT
4. Condensed steam mass = Q ÷ latent heat
5. Steam and liquid masses (kg) adjusted, limited by the room left in the hotwell (`CstCondenser.TotalVolume` minus its volume, ÷ the specific volume at the hotwell temperature); the hotwell collects the condensate
6. New outlet temperature from the energy transfer, tracked as `outletTemperature`

A condensation pump moves hotwell water into the boiler as the **Return** (`returnRate`, kg per tick; the pump flow in L/s is converted at the hotwell temperature). It is the boiler's only water supply ([ADR 0002](../adr/0002-makeup-into-hotwell.md)); its limits are in [feedwater-loop.md](feedwater-loop.md#return-and-capacity).

The hotwell holds `hotwellWaterMass` (kg); `hotwellWaterVolume` and the level are derived from it at `hotwellTemperature` ([ADR 0007](../adr/0007-water-state-is-mass-in-kg.md)), so a hot hotwell shows a higher level for the same water. Makeup and reject are valve flows in L/s converted to kg at the hotwell temperature; makeup stops at the hotwell room.

Known gap: `calculateCondensation` condenses 10 × the energy balance (`massCondensed * 10`, kept from before #34, see #47): a magic number against the realism rule.

Known gap: the hotwell runs near 100 °C because condensate enters at the bypass steam temperature instead of the condenser saturation temperature (#35).

## Hotwell makeup and reject

- **Makeup valve**: demineralised water from outside the loop into the hotwell (`makeupValvePosition`, totalizer `makeupTotal`)
- **Reject valve**: hotwell water out of the loop to storage (`rejectValvePosition`, totalizer `rejectTotal`)

Loop targets and the operator that holds them are in [feedwater-loop.md](feedwater-loop.md).

## Intakes

The condenser takes steam from two paths: the turbine exhaust and the boiler bypass valve. `PowerPlantTick` removes the steam from the boiler first and passes those same-tick flows to `CondenserTick`, so every kg through either valve arrives in the condenser in that tick (`intakeFlowRate` is their sum). Condenser vacuum should act on turbine back-pressure and power, not on the exhaust mass flow; that coupling is not modelled yet (#14).

## Remaining empirical areas

`calcCARvacuum` (`CAR_MaxVacuum`, `CAR_TimeNeeded`), `calcSJAEvacuum` (`SJAE_MaxPressureDifference`, `SJAE_VacuumIncreaseRate`), `calculateCondensation` (`DampingFactor`), and the steam-mass pressure term in `CondenserTick`.
