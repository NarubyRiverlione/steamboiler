export const CstSimulation = {
  StartTemperature: 98, // Celsius
  StartWaterVolume: 50, // liters
  MaxGasFlow: 10, // liters/second
  FillingRate: 0.005, // 0.5% per second
  DrainingRate: 0.002, // 0.2% per second
  BoilerTotalVolume: 100, // liters
  GasEfficiency: 0.85,
  CoolingRate: 1/15, // °C per second
}

export const CstPhysics = {
  Water_Density: 1000, // kg/m³
  Water_SpecificHeat: 4.18, // kJ/kg°C
  GasEnergyDensity: 35000, // kJ/m³ (approximate energy density of natural gas)
  AtmosphericPressure: 1.013, // bar
}
