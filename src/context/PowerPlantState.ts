export type BoilerState = {
  gasFlow: number // liters/second
  waterVolume: number // liters
  deltaWaterVolume: number
  temperature: number // Celsius
  pressure: number // bar
  energy: number // kJ
  steamMass: number // kg - Mass of steam currently in the boiler
  deltaSteamMass: number // kg/s generated steam
  potentialSteamGeneration: number // kg/s - Maximum potential steam generation rate
  energyDelta: number // kJ/s
  fillValveOpen: boolean
  drainValveOpen: boolean
}
export type CondenserState = {
  pressure: number // in mBar (negative pressure)
  steamMass: number // kg
  hotwellWaterVolume: number
  intakeFlowRate: number // g/s Flow rate from turbine to condenser
  returnRate: number
  coolingRate: number
  isAirExtractionPumpEnabled: boolean
  isSjaeEnabled: boolean
  sjaeValvePosition: number // 0-1 (0-100%) open
  recirculationPumpValvePosition: number // 0-1 (0-100%) open
  condensationPumpValvePosition: number // 0-1 (0-100%) open
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
}

type PowerPlantState = {
  Boiler: BoilerState
  Condenser: CondenserState
  Turbine: TurbineState
}
export default PowerPlantState
