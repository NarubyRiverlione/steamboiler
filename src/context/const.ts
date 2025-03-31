export const CstSimulation = {
  StartTemperature: 98, // Celsius
  StartWaterVolume: 100000, // liters
  MaxGasFlow: 650000000, // liters/second
  FillingRate: 0.005, // 0.5% per second
  DrainingRate: 0.005, // 0.5% per second
  BoilerTotalVolume: 200000, // liters
  GasEfficiency: 0.85,
  CoolingRate: 1 / 15, // °C per second
  GasChangeRateFast: 500, // °C per second
  GasChangeRateSlow: 250, // °C per second,
  PressureDampingFactor: 0.05, // Damping factor for pressure calculation
  // Steam expansion factors for different temperature ranges
  SteamExpansionFactorLow: 1600, // For temperatures < 100°C
  SteamExpansionFactorMedium: 1200, // For temperatures 100-150°C
  SteamExpansionFactorHigh: 800, // For temperatures > 150°C
  MaxSteamRemovalRate: 200, // kg/second when valve is fully open (about 1800 kg/hour)

  // Condenser settings
  Condenser: {
    VacuumDecayRate: 20, // mbar per second when pump is off
    CAR_MaxVacuum: 140, // mbar (negative pressure)
    CAR_TimeNeeded: 1, // seconds to reach max vacuum
    SJAE_VacuumIncreaseRate: 10, // mbar per second at 100% valve position
    SJAE_MaxPressureDifference: 10, // mbar above AirExtractionPump.MaxVacuum
    IntakeMaxFlowRate: 250, // kg/s
    RecirculationPump_MaxFlowRate: 1000, // kg/s
    HeatTransferCoefficient: 0.25, // Condensation rate per unit of recirculation flow
  },
}

export const CstPhysics = {
  Water_Density: 1000, // kg/m³ (used as fallback for temperatures below 80°C)
  Water_SpecificHeat: 4.18, // kJ/kg°C (used as fallback for temperatures below 80°C)
  GasEnergyDensity: 35000, // kJ/m³ (approximate energy density of natural gas)
  AtmosphericPressure: 1.013, // bar
}
