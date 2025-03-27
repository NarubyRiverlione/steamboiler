export const CstSimulation = {
  StartTemperature: 80, // Celsius
  StartWaterVolume: 50, // liters
  MaxGasFlow: 10, // liters/second
  FillingRate: 0.005, // 0.5% per second
  DrainingRate: 0.005, // 0.5% per second
  BoilerTotalVolume: 100, // liters
  GasEfficiency: 0.85,
  CoolingRate: 1 / 15, // °C per second
  GasChangeRateFast: 0.5, // °C per second
  GasChangeRateSlow: 0.25, // °C per second
}

export const CstPhysics = {
  Water_Density: 1000, // kg/m³ (used as fallback for temperatures below 80°C)
  Water_SpecificHeat: 4.18, // kJ/kg°C (used as fallback for temperatures below 80°C)
  GasEnergyDensity: 35000, // kJ/m³ (approximate energy density of natural gas)
  AtmosphericPressure: 1.013, // bar
}
