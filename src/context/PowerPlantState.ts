export type BoilerState = {
  gasFlow: number // liters/second
  waterMass: number // kg, the state; volume and level are derived from it
  waterVolume: number // liters, derived: mass × specific volume at the boiler temperature
  deltaWaterMass: number // kg change over the last tick
  temperature: number // Celsius
  pressure: number // bar
  energy: number // kJ
  steamMass: number // kg - Mass of steam currently in the boiler
  deltaSteamMass: number // kg/s generated steam
  energyDelta: number // kJ/s
  heatLoss: number // kW lost to the surroundings
  heatingRate: number // K/s rise of the water temperature, smoothed over HeatingRateWindow
  heatingRateOverLimit: boolean // alarm: heating rate above HeatingRateLimit
  drainValveOpen: boolean
  drainedTotal: number // kg drained since start (totalizer)
  reliefValveOpen: boolean // relief valve lifted (automatic, see GLOSSARY.md)
  ventedTotal: number // kg of steam vented to the atmosphere since start (totalizer)
  reliefLifts: number // lifts of the relief valve since start (counter)
}
export type CondenserState = {
  pressure: number // in mBar (negative pressure)
  steamMass: number // kg
  hotwellWaterMass: number // kg, the state
  hotwellWaterVolume: number // liters, derived: mass × specific volume at the hotwell temperature
  hotwellTemperature: number // Celsius
  intakeFlowRate: number // kg/s turbine exhaust plus bypass steam into the condenser
  returnRate: number // kg returned to the boiler over the last tick
  condensationRate: number // kg/s steam condensed into the hotwell
  coolingRate: number
  isAirExtractionPumpEnabled: boolean
  isSjaeEnabled: boolean
  sjaeValvePosition: number // 0-1 (0-100%) open
  recirculationPumpValvePosition: number // 0-1 (0-100%) open
  condensationPumpValvePosition: number // 0-1 (0-100%) open
  condensationPumpTripped: boolean // set by the low-low trip, cleared by the next successful opening
  makeupValvePosition: number // 0-1 (0-100%) open, water from outside into the hotwell
  rejectValvePosition: number // 0-1 (0-100%) open, hotwell water out of the loop
  makeupTotal: number // kg of makeup since start (totalizer)
  rejectTotal: number // kg rejected since start (totalizer)
  deltaWaterMass: number // kg change of the hotwell over the last tick
}
export type TurbineState = {
  electricOutput: number // MW
  bypassValvePosition: number // 0-1 (0-100%) open
  bypassSteamFlowOut: number // kg/s
  turbineValvePosition: number // 0-1 (0-100%) open
  turbineSteamFlowOut: number // kg/s
  mainSteamValve: boolean // open/close MSV
  rpm: number // Current RPM of the turbine
  rpmSetPoint: number // Target RPM when in hold mode
  holdMode: boolean // Whether the turbine is in hold mode
  generatorBreaker: boolean // Whether the generator breaker is closed (Phase 4)
  pidIntegralError: number // hold-mode PID accumulated rpm error (rpm·s, clamped to ±1)
  turbineTripped: boolean // set by a turbine trip, cleared by the next opening of the turbine valve
}

type PowerPlantState = {
  Boiler: BoilerState
  Condenser: CondenserState
  Turbine: TurbineState
}
export default PowerPlantState
