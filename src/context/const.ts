export const CstSimulation = {
  DeltaTime: 0.1, // Simulation tick duration in sec
  MaxTicksPerUpdate: 300, // cap on ticks run in one loop update (about 1.4 ms per 100 ticks measured, 10x the need at 60x); above it the plant runs slower than requested (ADR 0034)
  UpdateInterval: 50, // ms between loop updates
  CstBoiler: {
    StartWaterVolume: 35e3, // liters at ambient: thermal expansion brings it to the 50% working level at 165 bar (ADR 0018)
    TotalVolume: 100e3, // liters (typical  20-100m3)
    MaxGasFlow: 12000, // liters/second, about 420 MW of fuel for a 200 MWe unit (docs/research/2026-10-sizing-check.md)
    DrainingRate: 0.005, // 0.5% per second
    GasRateMax: 300, // L/s per second of gas change at full knob deflection, 0 to full in 40 s (#15, UNVERIFIED, tune with the headless runner)
    GasRateDeadZone: 0.05, // share of the knob travel either side of the centre that holds the gas
    DesignPressure: 180, // bar, the boiler must never exceed it (see GLOSSARY.md)
    DesignTemperature: 357, // Celsius, saturation at design pressure (IAPWS-IF97: 357.0°C at 180 bar)
    ReliefOpenPressure: 178, // bar, the relief valve lifts fully (2 bar margin for one tick's rise)
    ReliefClosePressure: 171, // bar, the relief valve reseats (7 bar blowdown, about 4%)
    WorkingLevel: 0.5, // share of TotalVolume, the level the drum holds at 165 bar: the target line on the level gauge (ADR 0018)
    BurnerLowLowLevel: 0.2, // share of TotalVolume, below it the burner trips (UNVERIFIED estimate, see design-basis.md)
    LowLevel: 0.35, // share of TotalVolume: the low level zone on the gauge starts here; its warning tile is on below it (UNVERIFIED estimate, #54, #137, see design-basis.md)
    WorkingLow: 0.45, // share of TotalVolume: lower end of the green band on the level gauge, the 50% working level minus 5 points (UNVERIFIED estimate, #54)
    WorkingHigh: 0.55, // share of TotalVolume: upper end of the green band
    HighLevel: 0.65, // share of TotalVolume, from it the boiler level high alarm is on (UNVERIFIED estimate, see design-basis.md)
    HighHighLevel: 0.7, // share of TotalVolume, from it the boiler feed pump and the turbine trip (UNVERIFIED estimate, see design-basis.md)
    ReliefCapacityMargin: 1.1, // relief capacity over the steam made at full gas at the opening pressure
    MetalMass: 100e3, // kg of drum and tube steel, at the water temperature (one lump)
    HeatLossAtDesign: 500, // kW lost to the surroundings at design temperature, proportional to T - ambient
    HeatingRateLimit: 100 / 3600, // K/s, alarm above it (the real limit, about 100 K/h)
    HeatingRateWindow: 30, // s, time constant of the smoothed heating rate
  },

  CstCondenser: {
    TotalVolume: 50e3, // liters (about 3 min of full-gas condensate below normal level, see design-basis.md)
    HotwellStartVolume: 35e3, // liter (70%, the normal level)
    HotwellNormalLevel: 0.7, // share of TotalVolume, the target line on the level gauge (design-basis.md)
    OptimalPressure: 31, // mBar, centre of the band on the vacuum readout: the design vacuum (ADR 0032)
    OptimalPressureBellWidth: 20, // mBar, half width of the band on the vacuum readout
    VacuumLimit: 327, // mbar absolute, turbine trip above it (-0.7 kg/cm² gauge, see design-basis.md)
    ShellVolume: 450, // m³ steam space of the shell with the exhaust neck and casing (UNVERIFIED, ADR 0035)
    AirLeakRate: 0.0022, // kg/s of air in-leakage, 3.75 SCFM (ASME PTC 12.2 Table 10-1, ADR 0035)
    CAR_Capacity: 26, // m³/s of air: over-dimensioned utility, pulls 1 bar to the design vacuum in about 60 s (design-basis.md)
    SJAE_Capacity: 0.96, // m³/s at the full valve (HEI holding example, ADR 0035)
    SJAE_SuctionLimit: 170, // mbar absolute: above it the ejector breaks and removes nothing (EPRI §8.3.8)
    HoodReliefPressure: 1353, // mbar absolute: the atmospheric relief diaphragm, the ceiling of the condenser pressure
    SJAE_ValveStep: 5, // % per click open/close
    RecirculationPump_MaxFlowRate: 7400, // l/s: single pass at the rated load with 10 °C water, rise 8.5 K (ADR 0032, design-basis.md)
    RecirculationPump_Step: 1, // % per wheel notch or arrow key: a pump is set finely
    RecirculationPump_IntakeTemperature: 10, // C temp of cooling water (typical 8-12C)
    HeatExchangerUA: 27000, // kW/K at the full cooling water flow: terminal temperature difference 6 K at the rated load; scales with flow^0.5 (ADR 0032)
    CondensationPump_MaxFlowRate: 300, // l/s (typical 160 - 270 l/s)
    CondensationPump_Step: 100 / 300, // % per click, wheel notch or arrow key: 1 l/s (about 1 kg/s) of the 300 l/s max, #138
    Makeup_MaxFlowRate: 50, // l/s demineralised water into the hotwell
    Makeup_Temperature: 20, // Celsius
    Makeup_Step: 5, // % per click open/close
    Reject_MaxFlowRate: 50, // l/s hotwell water out to storage
    Reject_Step: 5, // % per click open/close
    HotwellLow: 0.25, // fraction of TotalVolume: below it the low level alarm is on (our own number, design-basis.md)
    HotwellHigh: 0.85, // fraction of TotalVolume: from it the high level alarm is on (our own number, design-basis.md)
    HotwellLowLow: 0.1, // fraction of TotalVolume: below it the condensation pump trips (NPSH, see design-basis.md)
    HotwellHighHigh: 0.95, // fraction of TotalVolume: from it the reject valve is forced fully open (overfill clamp)
    HotwellWorkingLow: 0.55, // fraction of TotalVolume: makeup opens below it, the green band on the level gauge starts here (operator band around the 70% normal level, ADR 0011)
    HotwellWorkingHigh: 0.75, // fraction of TotalVolume: reject opens above it, the green band ends here
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
    RatedSteamFlow: 134, // kg/s, what full gas makes at 165 bar with the superheater and the extraction heater (measured in max-output, #113, ADR 0044; was 192 with saturated steam); S, the no-load loss and the tap pressure are sized on it
    RatedSteamTemperature: 540, // °C, the steam the attemperator holds (CstSuperheater.SteamTemperature); the rated state and the no-load loss are sized on it (ADR 0044)
    RatedEnthalpyDrop: 1496, // kJ/kg, isentropic drop at the rated state: 165 bar and 540 °C to the 31 mbar design vacuum (IF97, ADR 0032, ADR 0044; was 1016 with saturated steam)
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

// Deaerator vessel (ADR 0036, ADR 0037, figures in docs/plant/design-basis.md and docs/plant/deaerator.md); all estimates
// to confirm in the headless runner
export const CstDeaerator = {
  TotalVolume: 150e3, // liters: 5 minutes of rated feedwater (192 kg/s) from the 50% working level down to the 38% low-low trip
  WorkingLevel: 0.5, // share of TotalVolume the vessel holds at 3 bar: the target line on the level gauge (ADR 0037)
  LowLowLevel: 0.12, // share of TotalVolume: below it the boiler feed pump trips; 5 minutes of rated feedwater (38% of the volume) below the 50% working level (#112, design-basis.md)
  LowLevel: 0.25, // share of TotalVolume: the low level zone on the gauge starts here; its warning tile is on below it (UNVERIFIED estimate, #54, #137, see design-basis.md)
  HighLevel: 0.75, // share of TotalVolume: the high level zone on the gauge starts here; its warning tile is on from it (UNVERIFIED estimate, #54, #137); no trip yet (#129)
  HighHighLevel: 0.85, // share of TotalVolume: the red zone on the gauge starts here; display only, 22 m³ of headroom (UNVERIFIED estimate, #54, #129)
  WorkingLow: 0.45, // share of TotalVolume: lower end of the green band on the level gauge, the 50% working level minus 5 points (UNVERIFIED estimate, #54)
  WorkingHigh: 0.55, // share of TotalVolume: upper end of the green band
  FeedPump_Step: 100 / 300, // % per click, wheel notch or arrow key: 1 l/s (about 1 kg/s), #138; the pump flow is the CondensationPump_MaxFlowRate times the position (206 L/s needed at 192 kg/s and 134 °C, #112)
  StartLevel: 0.38, // share of TotalVolume filled cold at ambient: ends at 50% at 3 bar (ADR 0037)
  Pressure: 3, // bar, held by the steam inlet valve (about 134 °C)
  ExtractionValveCapacity: 60, // kg/s the extraction valve passes: over-dimensioned, about 35 kg/s are needed at rated flow (design-basis.md)
  ExtractionOpeningRange: 0.5, // share of the setpoint the tap pressure must rise above it for the non-return valve to pass its full capacity: flow rises with the pressure margin, so no step when the tap crosses 3 bar (design-basis.md)
  LetDownCapacity: 50, // kg/s the let-down valve passes at the boiler working pressure; scales with the boiler pressure like the steam valves (ADR 0026)
  // Air, vents and relief (ADR 0038, #120); tuning values set in the headless runner, recorded in design-basis.md
  SafeToClosePressure: 0.05, // bar of air partial pressure below which the safe-to-close lamp lights (5% of the cold air)
  SafeToCloseRelease: 0.075, // bar: a lit lamp goes out only above this, so the heating of the closed vessel (the air pressure rises with the temperature) does not flicker it
  StartUpVentArea: 0.06, // m², effective flow area (discharge coefficient included) of the manual start-up vent
  OperatingVentArea: 0.0001, // m², the small fixed orifice that is always open: about 0.08 kg/s of steam at 3 bar, 0.04% of the rated feedwater
  ReliefPressure: 4, // bar absolute, where the relief valve lifts: the 3 bar setpoint plus about 33% (owner, #40)
  ReliefReseatPressure: 3.6, // bar absolute, where it seats again (10% blowdown)
  ReliefCapacity: 120, // kg/s of mixture at the lift pressure: 110% of what both steam valves can pass (60 + 50 kg/s), like ADR 0005
}

export const CstPhysics = {
  Water_SpecificHeat: 4.18, // kJ/kg°C (used as fallback for temperatures below 80°C)
  Steel_SpecificHeat: 0.5, // kJ/kg·K, carbon steel
  GasEnergyDensity: 35000, // kJ/m³: LOWER heating value of natural gas (water leaves as vapour), at 25 °C combustion and 0 °C metering, 1 atm (IS 14504 Table 5: methane 35.8 MJ/m³ less inerts; owner decision, ADR 0029)
  AtmosphericPressure_mBar: 1013.25, // mbar
  AmbientTemperature: 20, // Celsius, the plant at rest and the floor of heat loss
  AirGasConstant: 287.05, // J/(kg·K), specific gas constant of dry air
  UniversalGasConstant: 8314.46, // J/(kmol·K)
  AirMolarMass: 28.96, // kg/kmol
  WaterMolarMass: 18.015, // kg/kmol
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

// Superheater and spray attemperator (ADR 0044, #113, figures in docs/plant/design-basis.md and docs/research/2026-11-superheater.md)
export const CstSuperheater = {
  SteamTemperature: 540, // °C, the attemperator setpoint and the design outlet at full gas without spray
  DesignSteamFlow: 134, // kg/s of steam through the superheater at full gas, which the surface is sized on (measured in the headless runner)
  DesignPressure: 165, // bar, the pressure the surface is sized at
  TimeConstant: 100, // s, first-order lag of the steam and tube metal together (POWER magazine: 100-200 s, low end; research note)
  SprayCapacity: 15, // kg/s the spray valve passes fully open: 8% of the outlet steam is the purity ceiling at rated flow (CCJ), this is over-dimensioned for the part-load cases (design-basis.md)
  AlarmTemperature: 555, // °C, the high steam temperature alarm: 15 K over the setpoint (own estimate)
  PID_Kp: 0.02, // per K of error: spray valve share (tuned in the headless runner)
  PID_Ki: 0.001, // per K·s of error
  PID_Kd: 0, // per K/s of the measurement: none needed, the 100 s lag is slow and a derivative chatters at the 0.1 s tick (tuned in the headless runner)
  IntegralLimit: 500, // K·s, anti-windup clamp of the integral error
}
