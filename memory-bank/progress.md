# Progress

## Current Status

The Steam Boiler Simulation is currently in a functional state with core features implemented. The simulation accurately models the basic thermodynamic processes of a steam boiler system, including water heating, steam generation, and pressure development.

## What Works

### Core Simulation

- ✅ Basic thermodynamic model with energy balance
- ✅ Temperature-dependent water properties (density, specific heat)
- ✅ Steam generation based on temperature and pressure
- ✅ Steam removal mechanism with valve position control
- ✅ Pressure calculation based on steam accumulation with configurable parameters
- ✅ Boiling point calculation based on pressure
- ✅ Water volume changes due to temperature (thermal expansion) and phase change
- ✅ Energy tracking and calculation
- ✅ Updated Water Volume Calculation: Water volume is now calculated using specific volume data from steam tables for more accurate thermal expansion modeling.
- ✅ Condenser vacuum system with Air Extraction Pump (CAR) and Steam Jet Air Extraction (SJAE)
- ✅ Vacuum decay mechanism when pumps are disabled
- ✅ Automatic SJAE disabling based on steam flow and pressure conditions
- ✅ Hotwell water collection and recirculation pump
- ✅ Energy balance approach for condenser calculations:
  - Temperature tracking for condensed water returning to the boiler
  - Calculation of energy absorbed by cold recirculation water
  - Conversion of absorbed energy to condensed steam volume
  - Dynamic temperature changes based on energy transfer
- ✅ Energy balance approach for boiler calculations
- ✅ Turbine RPM calculation based on steam flow and boiler pressure
- ✅ Physics-based turbine model with inertia and friction
- ✅ Automatic turbine valve control using PID controller in hold mode
- ✅ Realistic electricity generation that only occurs at maximum RPM

### User Interface

- ✅ Visual representation of boiler with water level
- ✅ Gas flow controls with fine and coarse adjustments
- ✅ Water valve controls (fill and drain)
- ✅ Main Steam Valve control with 10% increment adjustments
- ✅ Real-time status readouts (temperature, pressure, etc.)
- ✅ Steam visualization when boiling occurs
- ✅ Condenser pressure readout with high/low pressure indicators
- ✅ Air Extraction Pump (CAR) toggle controls
- ✅ Steam Jet Air Extraction (SJAE) toggle and valve position controls
- ✅ Recirculation pump valve position control
- ✅ Condensation pump to pull feed water from the condenser to the boiler
- ✅ Turbine RPM display in readouts
- ✅ RPM setpoint control with slider
- ✅ Turbine mode toggle (Free/Hold) for automatic control

### Technical Implementation

- ✅ React component structure
- ✅ Context API for state management
- ✅ Reducer pattern for simulation logic
- ✅ Simulation loop with time-based updates
- ✅ Steam table data for accurate water properties
- ✅ PID controller implementation for automatic control systems
- ✅ Physics-based calculations for rotational systems
- ✅ UI smoothing with Exponential Moving Average (EMA) via the useEMA hook

## What's Left to Build

### Potential Future Features

- ⬜ turbine valve cannot open if condenser pressure isn't inside the bell
- ⬜ More detailed visualization of internal processes
- ⬜ Aerator between condenser and boiler
- ⬜ Turbines for power generation (Phases 1, 2 & 3 completed; Phase 4-5 planned)
- ⬜ Enhance valve control responsiveness in control panels (continuous firing behavior for valve buttons with ~150ms interval)
- ⬜ Performance optimizations and monitoring (low priority) - see performance_enhancements.md
- ⬜ Reduce empirical approaches in calculations:
  - Boiler:
    - `calculateGasEnergy` uses `CstPhysics.GasEnergyDensity` and `CstBoiler.GasEfficiency`, where `GasEfficiency` might be an empirical factor.
    - `calculatePressureFromSteam` uses `CstPhysics.SteamExpansionFactorLow`, `CstPhysics.SteamExpansionFactorMedium`, and `CstPhysics.SteamExpansionFactorHigh`, which might be empirical approximations.
    - `calculateWaterVolume` uses linear approximation for temperatures below 80°C.
  - Condenser:
    - `calcCARpressure` uses `CAR_MaxVacuum` and `CAR_TimeNeeded`, which might be empirical approximations.
    - `calcSJAEpressure` uses `SJAE_MaxPressureDifference` and `SJAE_VacuumIncreaseRate`, which might be empirical approximations.
    - `calculateIntakeFlowRate` uses a bell curve and `CstSimulation.CstCondenser.OptimalPressure` and `CstSimulation.CstCondenser.OptimalPressureBellWidth`, which might be empirical approximations.
    - `calculateCondensation` uses `DampingFactor` which might be an empirical value.

## Known Issues

### Simulation Accuracy

- Boiling point calculation uses a simplified power law for pressures above the steam table range
- Heat loss model is simplified

### Edge Cases

- Extreme conditions (very high temperatures or pressures) may not be modeled accurately
- Rapid changes in inputs may cause unrealistic behavior

### User Interface

- Limited visual feedback for some processes
- No historical data visualization

## Next Milestone

The next milestones are:

1. **Turbine Phase 4**: Implement the generator breaker that only works at the rated RPM (3600 RPM), with electricity only being produced when the breaker is closed.

2. **Aerator Implementation**: Add an aerator between the condenser and the boiler to make the water cycle more realistic.

3. **Turbine Phase 5**: Add synchronization features including phase calculation and synchroscope UI.

These improvements will make the simulation more realistic and educational, particularly for understanding the complete power generation cycle and the relationship between energy input and steam output.
