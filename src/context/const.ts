export const CstSimulation = {
  DeltaTime: 0.1, // Simulation tick duration in sec
  CstBoiler: {
    StartTemperature: 98, // Celsius
    StartWaterVolume: 50e3, // liters
    MaxGasFlow: 8000, // liters/second (typical 700 - 900 liters/sec @20-40 bar)
    FillingRate: 0.005, // 0.5% per second
    DrainingRate: 0.005, // 0.5% per second
    TotalVolume: 100e3, // liters (typical  50,000 - 100,000 liters)
    GasEfficiency: 0.85,
    SteamGenerationEfficiency: 0.5, // Fraction of available energy used for steam generation
    CoolingRate: 1 / 15, // °C per second
    GasChangeRateFast: 500, // °C per second
    GasChangeRateSlow: 250, // °C per second,
    PressureDampingFactor: 1, //0.05, // Damping factor for pressure calculation
    HeatLossPercentage: 0.15, // Percentage of energy lost due to heat loss
    MaxSteamRemovalRate: 150, // kg/second when valve is fully open
    BypassValveStep: 5, // % per click open/close
    TurbineValveStep: 5, // % per click open/close
    MainSteamValveMinimumPressure: 2, //10, // bar = 1MPa
  },

  CstCondenser: {
    HotwellStartVolume: 10000, // liter
    MinimumPressure: 10, // mbar
    VacuumDecayRate: 20, // mbar per second when pump is off
    OptimalPressure: 55, // mBar (center of bell curve)
    OptimalPressureBellWidth: 30, // Controls how quickly efficiency drops off
    CAR_MaxVacuum: 140, // mbar (negative pressure)
    CAR_TimeNeeded: 1, // seconds to reach max vacuum
    SJAE_VacuumIncreaseRate: 10, // mbar per second at 100% valve position
    SJAE_MaxPressureDifference: 10, // mbar above AirExtractionPump.MaxVacuum
    SJAE_ValveStep: 10,
    DampingFactor: 1, // Apply a damping factor to make temperature changes more gradual
    IntakeMaxFlowRate: 250, // kg/s
    RecirculationPump_MaxFlowRate: 1800, // l/s (typical 9.000-12.000)
    RecirculationPump_Step: 5,
    RecirculationPump_IntakeTemperature: 10, // C temp of cooling water (typical 8-12C)
    HeatTransferCoefficient: 0.25, // Condensation rate per unit of recirculation flow
    CondensationPump_MaxFlowRate: 1000, // l/s (typical 160 - 270 l/s)
    CondensationPump_Step: 5,
  },
  CstTurbine: {},
}

export const CstPhysics = {
  SteamExpansionFactorLow: 1600, // For temperatures < 100°C
  SteamExpansionFactorMedium: 1200, // For temperatures 100-150°C
  SteamExpansionFactorHigh: 800, // For temperatures > 150°C
  Water_Density: 1000, // kg/m³ (used as fallback for temperatures below 80°C)
  Water_SpecificHeat: 4.18, // kJ/kg°C (used as fallback for temperatures below 80°C)
  GasEnergyDensity: 35000, // kJ/m³ (approximate energy density of natural gas)
  AtmosphericPressure: 1.013, // bar
}
