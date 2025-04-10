export const CstSimulation = {
  DeltaTime: 0.2, // Simulation tick duration in sec
  CstBoiler: {
    StartTemperature: 250, // Celsius
    StartWaterVolume: 50e3, // liters (60-70% water volume to keep space for steam)
    TotalVolume: 100e3, // liters (typical  20-100m3)
    MaxGasFlow: 12000, // liters/second (typical 700 - 900 liters/sec @20-40 bar)
    FillingRate: 0.005, // 0.5% per second
    DrainingRate: 0.005, // 0.5% per second
    GasEfficiency: 0.85,
    SteamGenerationEfficiency: 0.75, // Fraction of available energy used for steam generation
    CoolingRate: 1 / 15, // °C per second
    GasChangeRateFast: 500, // °C per second
    GasChangeRateSlow: 250, // °C per second,
    PressureDampingFactor: 1, //0.05, // Damping factor for pressure calculation
    HeatLossPercentage: 0.15, // Percentage of energy lost due to heat loss
    MaxSteamRemovalRate: 200, // kg/second when valve is fully open
    BypassValveStep: 10, // % per click open/close
    TurbineValveStep: 10, // % per click open/close
    MainSteamValveMinimumPressure: 10, // bar = 1MPa
  },

  CstCondenser: {
    TotalVolume: 15e3, // liters
    HotwellStartVolume: 10e3, // liter
    MaxVacuum: 1000, // mbar = minimum pressure 13 mbar absolute
    VacuumDecayRate: 5, // mbar per second when pump is off
    OptimalPressure: 80, // mBar (center of bell curve)
    OptimalPressureBellWidth: 20, // Controls how quickly efficiency drops off
    CAR_MaxVacuum: 800, // mbar vacuum  (70-90 kPa vacuum = 11-31 kPa absolute pressure)
    CAR_TimeNeeded: 15, // seconds to reach max vacuum
    SJAE_VacuumIncreaseRate: 10, // mbar per second at 100% valve position
    SJAE_MaxPressureDifference: 20, // mbar above AirExtractionPump.MaxVacuum
    SJAE_ValveStep: 5, // % per click open/close
    DampingFactor: 1, // Apply a damping factor to make temperature changes more gradual
    IntakeMaxFlowRate: 250, // kg/s
    RecirculationPump_MaxFlowRate: 500, // l/s (typical 9.000-12.000)
    RecirculationPump_Step: 1,
    RecirculationPump_IntakeTemperature: 10, // C temp of cooling water (typical 8-12C)
    HeatTransferCoefficient: 0.85, // Condensation rate per unit of recirculation flow
    CondensationPump_MaxFlowRate: 500, // l/s (typical 160 - 270 l/s)
    CondensationPump_Step: 1,
    PressureMultiplier: 0.8, // steam volume adds pressure
    SteamVolumeBaseLine: 1000,
    LeakingRate: 0.01, // kg/s (typical 0.005 to 0.015 kg/s )
  },

  CstTurbine: {
    steamToElectricityEfficiency: 0.35, // Typical conversion ratio from steam energy to electrical energy (black-box approach)
    steamOutflowPressure: 0.1, // bar (typical  5-10 kPa absolute (0.05-0.1 bar or approximately )
    steamOutflowTemperature: 40, // Celsius (typical 35-45C)
  },
}

export const CstPhysics = {
  SteamExpansionFactorLow: 1600, // For temperatures < 100°C
  SteamExpansionFactorMedium: 1200, // For temperatures 100-150°C
  SteamExpansionFactorHigh: 800, // For temperatures > 150°C
  Water_Density: 1000, // kg/m³ (used as fallback for temperatures below 80°C)
  Water_SpecificHeat: 4.18, // kJ/kg°C (used as fallback for temperatures below 80°C)
  GasEnergyDensity: 35000, // kJ/m³ (approximate energy density of natural gas)
  AtmosphericPressure_mBar: 1013.25, // mbar
}
