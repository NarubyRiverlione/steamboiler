export type BoilerState = {
  gasFlow: number // liters/second
  waterVolume: number // liters
  deltaWaterVolume: number
  temperature: number // Celsius
  pressure: number // bar
  energy: number // kJ
  steamMass: number // kg - Mass of steam currently in the boiler
  deltaSteamMass: number // kg/s generated steam
  energyDelta: number // kJ/s
  drainValveOpen: boolean
  drainedTotal: number // liters drained since start (totalizer)
}
export type CondenserState = {
  pressure: number // in mBar (negative pressure)
  steamMass: number // kg
  hotwellWaterVolume: number
  hotwellTemperature: number // Celsius
  intakeFlowRate: number // g/s Flow rate from turbine to condenser
  returnRate: number
  condensationRate: number // l/s steam condensed into the hotwell
  coolingRate: number
  isAirExtractionPumpEnabled: boolean
  isSjaeEnabled: boolean
  sjaeValvePosition: number // 0-1 (0-100%) open
  recirculationPumpValvePosition: number // 0-1 (0-100%) open
  condensationPumpValvePosition: number // 0-1 (0-100%) open
  makeupValvePosition: number // 0-1 (0-100%) open, water from outside into the hotwell
  rejectValvePosition: number // 0-1 (0-100%) open, hotwell water out of the loop
  makeupTotal: number // liters of makeup since start (totalizer)
  rejectTotal: number // liters rejected since start (totalizer)
  deltaWaterVolume: number
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
  pidPreviousError: number // hold-mode PID rpm error of the last hold-mode tick
}

type PowerPlantState = {
  Boiler: BoilerState
  Condenser: CondenserState
  Turbine: TurbineState
}
export default PowerPlantState
