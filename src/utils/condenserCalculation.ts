import { CondenserState } from "../context/Condenser/CondenserTypes"
import { CstPhysics, CstSimulation } from "../context/const"

// Air Extraction Pump (CAR) behavior
const calcCARpressure = (isAirExtractionPumpEnabled: boolean, pressure: number, deltaTime: number) => {
  // Check if air extraction pump is enabled, if not the potential vacuum decay is handled in a separated function
  if (!isAirExtractionPumpEnabled) return pressure

  const {
    Condenser: { CAR_MaxVacuum, CAR_TimeNeeded },
  } = CstSimulation
  // pressure already below CAR max (because of SJAE)
  if (pressure < CAR_MaxVacuum) return pressure

  // Calculate vacuum increase based on time needed to reach max vacuum
  const vacuumIncreaseRate = Math.abs(CAR_MaxVacuum) / CAR_TimeNeeded // mbar per second

  // Gradually increase vacuum (more negative pressure)
  const newVacuum = Math.max(CAR_MaxVacuum, pressure - vacuumIncreaseRate * deltaTime)
  return newVacuum
}

// Steam Jet Air Extraction (SJAE) behavior
const calcSJAEpressure = (
  isSjaeEnabled: boolean,
  sjaeValvePosition: number,
  pressure: number,
  boilerSteamFlow: number,
  deltaTime: number,
): { newIsSjaeEnabled: boolean; pressureBySJAE: number } => {
  // Check if SJAE is enabled, handle potential vacuum decay in separated function
  if (!isSjaeEnabled) return { newIsSjaeEnabled: false, pressureBySJAE: pressure }

  // Check if SJAE should be automatically disabled
  if (boilerSteamFlow <= 0) {
    // No steam flow, disable SJAE
    return { newIsSjaeEnabled: false, pressureBySJAE: pressure }
  }

  const {
    MaxSteamRemovalRate,
    Condenser: { CAR_MaxVacuum, SJAE_MaxPressureDifference, SJAE_VacuumIncreaseRate },
  } = CstSimulation

  // Calculate max allowed vacuum for SJAE
  const minVacuumNeeded = CAR_MaxVacuum + SJAE_MaxPressureDifference

  // Check if pressure is too high for SJAE
  if (pressure > minVacuumNeeded) {
    // Pressure too high, disable SJAE
    return { newIsSjaeEnabled: false, pressureBySJAE: pressure }
  }

  // Calculate vacuum increase based on steam flow and valve position
  const valveEffect = sjaeValvePosition / 100 // 0-1 range
  const steamFlowEffect = Math.min(1, boilerSteamFlow / MaxSteamRemovalRate)

  // Combine effects for final vacuum increase
  const vacuumIncreaseRate = SJAE_VacuumIncreaseRate * valveEffect * steamFlowEffect

  // Apply vacuum increase (limited by max allowed vacuum)
  const newPressure = Math.min(CAR_MaxVacuum, pressure - vacuumIncreaseRate * deltaTime)
  return { newIsSjaeEnabled: true, pressureBySJAE: newPressure }
}

const decayVacuum = (isAirExtractionPumpEnabled: boolean, isSjaeEnabled: boolean, pressure: number, deltaTime: number) => {
  let decayToPressure = pressure

  const {
    Condenser: { VacuumDecayRate, CAR_MaxVacuum },
  } = CstSimulation

  // without CAR & SJAE, decay pressure to atmospheric pressure
  if (!isSjaeEnabled && !isAirExtractionPumpEnabled) {
    decayToPressure = CstPhysics.AtmosphericPressure * 1000
  }

  // without SJAE, with running CAR, decay pressure to CAR max vacuum
  if (!isSjaeEnabled && isAirExtractionPumpEnabled) {
    decayToPressure = CAR_MaxVacuum
  }
  // needs for decay ?
  if (decayToPressure <= pressure) return pressure

  const pressureAfterDecay = Math.min(decayToPressure, pressure + VacuumDecayRate * deltaTime)

  return pressureAfterDecay
}

export const calculatePressure = (
  condenserState: CondenserState,
  boilerSteamFlow: number,
  deltaTime: number,
): { newPressure: number; newIsSjaeEnabled: boolean } => {
  const pressureByCAR = calcCARpressure(condenserState.isAirExtractionPumpEnabled, condenserState.pressure, deltaTime)

  const { pressureBySJAE, newIsSjaeEnabled } = calcSJAEpressure(
    condenserState.isSjaeEnabled,
    condenserState.sjaeValvePosition,
    pressureByCAR,
    boilerSteamFlow,
    deltaTime,
  )
  const pressureAfterDecay = decayVacuum(condenserState.isAirExtractionPumpEnabled, newIsSjaeEnabled, pressureBySJAE, deltaTime)

  return {
    newPressure: pressureAfterDecay,
    newIsSjaeEnabled,
  }
}
