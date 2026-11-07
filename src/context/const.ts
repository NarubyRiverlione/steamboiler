export const CstSimulation = {
  DeltaTime: 0.1, // Simulation tick duration in sec
  CstBoiler: {
    StartWaterVolume: 35e3, // liters at ambient: thermal expansion brings it to the 50% working level at 165 bar (ADR 0018)
    TotalVolume: 100e3, // liters (typical  20-100m3)
    MaxGasFlow: 12000, // liters/second, about 420 MW of fuel for a 200 MWe unit (docs/research/2026-10-sizing-check.md)
    DrainingRate: 0.005, // 0.5% per second
    GasChangeRateFast: 500, // °C per second
    GasChangeRateSlow: 250, // °C per second,
    DesignPressure: 180, // bar, the boiler must never exceed it (see GLOSSARY.md)
    DesignTemperature: 357, // Celsius, saturation at design pressure (IAPWS-IF97: 357.0°C at 180 bar)
    ReliefOpenPressure: 178, // bar, the relief valve lifts fully (2 bar margin for one tick's rise)
    ReliefClosePressure: 171, // bar, the relief valve reseats (7 bar blowdown, about 4%)
    BurnerLowLowLevel: 0.2, // share of TotalVolume, below it the burner trips (UNVERIFIED estimate, see design-basis.md)
    ReliefCapacityMargin: 1.1, // relief capacity over the steam made at full gas at the opening pressure
    MetalMass: 100e3, // kg of drum and tube steel, at the water temperature (one lump)
    HeatLossAtDesign: 500, // kW lost to the surroundings at design temperature, proportional to T - ambient
    HeatingRateLimit: 0.4, // K/s, alarm above it (time-compressed: real about 100 K/h, see design-basis.md)
    HeatingRateWindow: 30, // s, time constant of the smoothed heating rate
  },

  CstCondenser: {
    TotalVolume: 50e3, // liters (about 3 min of full-gas condensate below normal level, see design-basis.md)
    HotwellStartVolume: 35e3, // liter (70%, the normal level)
    MaxVacuum: 1000, // mbar = minimum pressure 13 mbar absolute
    VacuumDecayRate: 5, // mbar per second when pump is off
    OptimalPressure: 31, // mBar, centre of the band on the vacuum readout: the design vacuum (ADR 0032)
    OptimalPressureBellWidth: 20, // mBar, half width of the band on the vacuum readout
    VacuumLimit: 327, // mbar absolute, turbine trip above it (-0.7 kg/cm² gauge, see design-basis.md)
    CAR_MaxVacuum: 800, // mbar vacuum  (70-90 kPa vacuum = 11-31 kPa absolute pressure)
    CAR_TimeNeeded: 15, // seconds to reach max vacuum
    SJAE_VacuumIncreaseRate: 10, // mbar per second at 100% valve position
    SJAE_MaxPressureDifference: 20, // mbar above AirExtractionPump.MaxVacuum
    SJAE_ValveStep: 5, // % per click open/close
    RecirculationPump_MaxFlowRate: 7400, // l/s: single pass at the rated load with 10 °C water, rise 8.5 K (ADR 0032, design-basis.md)
    RecirculationPump_Step: 5,
    RecirculationPump_IntakeTemperature: 10, // C temp of cooling water (typical 8-12C)
    HeatExchangerUA: 27000, // kW/K at the full cooling water flow: terminal temperature difference 6 K at the rated load; scales with flow^0.5 (ADR 0032)
    CondensationPump_MaxFlowRate: 300, // l/s (typical 160 - 270 l/s)
    CondensationPump_Step: 5,
    PressureMultiplier: 0.8, // steam volume adds pressure
    SteamVolumeBaseLine: 1000,
    LeakingRate: 0.01, // kg/s (typical 0.005 to 0.015 kg/s )
    Makeup_MaxFlowRate: 50, // l/s demineralised water into the hotwell
    Makeup_Temperature: 20, // Celsius
    Makeup_Step: 5, // % per click open/close
    Reject_MaxFlowRate: 50, // l/s hotwell water out to storage
    Reject_Step: 5, // % per click open/close
    HotwellLowLow: 0.1, // fraction of TotalVolume: below it the condensation pump trips (NPSH, see design-basis.md)
    HotwellHighHigh: 0.95, // fraction of TotalVolume: from it the reject valve is forced fully open (overfill clamp)
  },

  CstTurbine: {
    MaxSteamRemovalRate: 200, // valve capacity: kg/second when the valve is fully open at ValveRatingPressure
    ValveRatingPressure: 165, // bar: working pressure, where the valve capacity holds (ADR 0026)
    BypassValveStep: 5, // % per click open/close
    TurbineValveStep: 1, // % per click open/close
    MainSteamValveMinimumPressure: 10, // bar = 1MPa

    IsentropicEfficiency: 0.85, // turbine isentropic efficiency (actual vs ideal enthalpy drop)
    GeneratorEfficiency: 0.98, // generator efficiency, shaft to electric

    // New constants for Phase 3
    SyncRPM: 3000, // Sync speed: generator matches the 50 Hz grid
    GeneratorPoles: 2, // two-pole turbogenerator, direct-coupled: 3000 rpm gives 50 Hz
    MaxRPM: 3300, // Overspeed limit (110% of sync speed)
    MinRPM: 0, // Minimum RPM
    RunUpPoints: [500, 1500, 2500, 3000], // rpm: the fixed run-up points the operator selects (ADR 0021; owner's choice, design-basis.md)
    DefaultRunUpPoint: 3000, // rpm: the point selected at start = sync speed
    RunUpRate: 50, // rpm per minute: Ramp up moves its speed reference at this rate (cold-start value, #68, design-basis.md)
    HoldEngageWindow: 5, // rpm: Hold engages within ± this of the selected run-up point (estimate, design-basis.md)

    // Speed model (ADR 0021, figures in docs/plant/design-basis.md): shaft power from steam, losses and inertia derived
    RatedSteamFlow: 192, // kg/s, what full gas makes at 165 bar with the Return heated by the extraction heater (measured: 192.3 kg/s at 138 MW in max-output, #88; was 158 with no heater, #82, ADR 0031); S, the no-load loss and the tap pressure are sized on it
    RatedEnthalpyDrop: 1016, // kJ/kg, isentropic drop at the rated state: 165 bar to the 31 mbar design vacuum (IF97, ADR 0032)
    InertiaConstant: 4, // s, H of the whole shaft line (sourced range 2.5-6 s); J = 2·H·S / ω_s²
    NoLoadFlowFraction: 0.03, // of rated flow: holds sync speed unloaded; loss power ∝ ω³ is calibrated on it (sourced 1.5-3%)

    // PID controller constants for Ramp up and Hold
    PID_Kp: 0.001, // Proportional gain
    PID_Ki: 0.0001, // Integral gain
    PID_Kd: 0.0005, // Derivative gain

    // Phase 4: Generator breaker constants
    BreakerRPMMargin: 2, // Allow ±2 RPM from SyncRPM for breaker operation

    // Generator load (#71, ADR 0027): a constant-power resisting torque on the shaft
    LoadRate: 0.03, // share of rated output per minute, up and down (sourced from coal units, docs/research/2026-11-generator-load-rate.md)
    LoadSetpointLimit: 200, // MW: top of the 180-200 MWe class the utilities are sized for, so the steam limits the load, not the setpoint (design-basis.md)
  },
}

// Extraction heater (ADR 0031, figures in docs/plant/design-basis.md and docs/research/2026-11-extraction-heaters.md)
export const CstHeater = {
  TapPressureAtRated: 5, // bar, the turbine tap at RatedSteamFlow (own estimate: the Return leaves at about 150 °C); proportional to turbine flow
  LineDrop: 0.06, // share of the tap pressure lost on the way to the heater (6% from a shell opening, PRESTO default)
  TerminalTemperatureDifference: 2, // K, the Return leaves this far below the saturation temperature of the heater pressure (1.7-2.8 K sourced, weak)
}

export const CstPhysics = {
  Water_SpecificHeat: 4.18, // kJ/kg°C (used as fallback for temperatures below 80°C)
  Steel_SpecificHeat: 0.5, // kJ/kg·K, carbon steel
  GasEnergyDensity: 35000, // kJ/m³: LOWER heating value of natural gas (water leaves as vapour), at 25 °C combustion and 0 °C metering, 1 atm (IS 14504 Table 5: methane 35.8 MJ/m³ less inerts; owner decision, ADR 0029)
  AtmosphericPressure_mBar: 1013.25, // mbar
  AmbientTemperature: 20, // Celsius, the plant at rest and the floor of heat loss
}

// Flue gas, boiler stage and economizer (ADR 0029, figures in docs/plant/design-basis.md and
// docs/research/2026-11-economizer-flue-gas.md)
export const CstFlueGas = {
  MassPerGasVolume: 14.7, // kg of flue gas per m³ of gas at 15% excess air (derived from Ganapathy Table 3.4: 176.7 kg/s at 420 MW)
  // Flue gas enthalpy, Ganapathy Table A7b (natural gas, 15% excess air): [°C, kJ/kg] from 200, 600 and 1000 °F (Btu/lb x 2.326)
  EnthalpyPoints: [
    [(200 - 32) / 1.8, 37.1 * 2.326],
    [(600 - 32) / 1.8, 147.9 * 2.326],
    [(1000 - 32) / 1.8, 264.9 * 2.326],
  ] as [number, number][],
  CombustionTemperature: 1775, // °C, Ganapathy Table 4.2: natural gas, 15% excess air, no recirculation
  SurfaceExponent: 0.65, // surface (UA) scales with gas flow to this power (Ganapathy, HRSG off-design, Q8.35a)
  BoilerApproachAtDesign: 100, // K, flue gas above the water leaving the boiler stage at full gas and DesignWaterTemperature (ESTIMATE; sourced span 60-150 K, design-basis.md)
  DesignWaterTemperature: 350, // °C, boiler water the boiler stage is sized at (the plant works at 350-357 °C)
  EconomizerDesignStack: 160, // °C, stack temperature at full gas with the design Return (Ganapathy Tables 1.8, 3.4: 160-164 °C; design choice)
  EconomizerDesignReturn: 171, // kg/s, the Return the economizer is sized for (171 kg/s, the design flow before #74; #88 leaves the surface as it is)
  EconomizerDesignReturnTemperature: 37, // °C, hotwell temperature the economizer is sized for
  ReturnSaturationMargin: 28, // K, the Return leaves the economizer at least this far below saturation (UNVERIFIED, no steaming in the economizer)
}
