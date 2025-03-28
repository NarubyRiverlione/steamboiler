export const CstSimulation = {
  StartTemperature: 98, // Celsius
  StartWaterVolume: 50, // liters
  MaxGasFlow: 10, // liters/second
  FillingRate: 0.005, // 0.5% per second
  DrainingRate: 0.005, // 0.5% per second
  BoilerTotalVolume: 100, // liters
  GasEfficiency: 0.85,
  CoolingRate: 1 / 15, // °C per second
  GasChangeRateFast: 0.5, // °C per second
  GasChangeRateSlow: 0.25, // °C per second,
  PressureDampingFactor: 0.05, // Damping factor for pressure calculation
  // Steam expansion factors for different temperature ranges
  SteamExpansionFactorLow: 1600, // For temperatures < 100°C
  SteamExpansionFactorMedium: 1200, // For temperatures 100-150°C
  SteamExpansionFactorHigh: 800, // For temperatures > 150°C
}

export const CstPhysics = {
  Water_Density: 1000, // kg/m³ (used as fallback for temperatures below 80°C)
  Water_SpecificHeat: 4.18, // kJ/kg°C (used as fallback for temperatures below 80°C)
  GasEnergyDensity: 35000, // kJ/m³ (approximate energy density of natural gas)
  AtmosphericPressure: 1.013, // bar
}
