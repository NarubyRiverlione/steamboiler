import { CstSimulation } from "../context/const"

const { CstTurbine } = CstSimulation

export function calculateElectricityOutput(turbineValvePosition: number): number {
  const steamIntake = turbineValvePosition * CstTurbine.MaxSteamRemovalRate
  const electricityOutput = steamIntake * CstTurbine.steamToElectricityEfficiency
  return electricityOutput
}
