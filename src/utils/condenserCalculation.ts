import { CondenserState } from "../context/Condenser/CondenserTypes"
import { CstPhysics, CstSimulation } from "../context/const"
import { getLatentHeat } from "./steamTable"

// Air Extraction Pump (CAR) behavior
const calcCARpressure = (isAirExtractionPumpEnabled: boolean, pressure: number) => {
  // Check if air extraction pump is enabled, if not the potential vacuum decay is handled in a separated function
  if (!isAirExtractionPumpEnabled) return pressure

  const {
    CstCondenser: { CAR_MaxVacuum, CAR_TimeNeeded },
  } = CstSimulation
  // pressure already below CAR max (because of SJAE)
  if (pressure < CAR_MaxVacuum) return pressure

  // Calculate vacuum increase based on time needed to reach max vacuum
  const vacuumIncreaseRate = Math.abs(CAR_MaxVacuum) / CAR_TimeNeeded // mbar per second

  // Gradually increase vacuum (more negative pressure)
  const newVacuum = Math.max(CAR_MaxVacuum, pressure - vacuumIncreaseRate * CstSimulation.DeltaTime)
  return newVacuum
}

// Steam Jet Air Extraction (SJAE) behavior
const calcSJAEpressure = (
  isSjaeEnabled: boolean,
  sjaeValvePosition: number,
  pressure: number,
  boilerSteamPressure: number,
): { newIsSjaeEnabled: boolean; pressureBySJAE: number } => {
  // Check if SJAE is enabled, handle potential vacuum decay in separated function
  if (!isSjaeEnabled) return { newIsSjaeEnabled: false, pressureBySJAE: pressure }

  // Check if SJAE should be automatically disabled
  if (boilerSteamPressure <= CstSimulation.CstBoiler.MainSteamValveMinimumPressure) {
    // Not enough steam pressure to use  SJAE
    return { newIsSjaeEnabled: false, pressureBySJAE: pressure }
  }

  const {
    CstBoiler: { MaxSteamRemovalRate },
    CstCondenser: { CAR_MaxVacuum, SJAE_MaxPressureDifference, SJAE_VacuumIncreaseRate, MinimumPressure },
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
  const steamFlowEffect = Math.min(1, boilerSteamPressure / MaxSteamRemovalRate)

  // Combine effects for final vacuum increase
  const vacuumIncreaseRate = SJAE_VacuumIncreaseRate * valveEffect * steamFlowEffect

  // Apply vacuum increase (limited by max allowed vacuum)
  const newPressure = Math.max(
    MinimumPressure,
    Math.min(CAR_MaxVacuum, pressure - vacuumIncreaseRate * CstSimulation.DeltaTime),
  )
  return { newIsSjaeEnabled: true, pressureBySJAE: newPressure }
}

const decayVacuum = (isAirExtractionPumpEnabled: boolean, isSjaeEnabled: boolean, pressure: number) => {
  let decayToPressure = pressure

  const {
    CstCondenser: { VacuumDecayRate, CAR_MaxVacuum },
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

  const pressureAfterDecay = Math.min(decayToPressure, pressure + VacuumDecayRate * CstSimulation.DeltaTime)

  return pressureAfterDecay
}

export const calculatePressure = (
  condenserState: CondenserState,
  boilerSteamFlow: number,
): { newPressure: number; newIsSjaeEnabled: boolean } => {
  const pressureByCAR = calcCARpressure(condenserState.isAirExtractionPumpEnabled, condenserState.pressure)

  const { pressureBySJAE, newIsSjaeEnabled } = calcSJAEpressure(
    condenserState.isSjaeEnabled,
    condenserState.sjaeValvePosition,
    pressureByCAR,
    boilerSteamFlow,
  )
  const pressureAfterDecay = decayVacuum(
    condenserState.isAirExtractionPumpEnabled,
    newIsSjaeEnabled,
    pressureBySJAE,
  )

  return {
    newPressure: pressureAfterDecay,
    newIsSjaeEnabled,
  }
}

/**
 * Calculates the change in steam volume based on steam flow and water flow
 * @param boilerSteamFlow Steam flow from the boiler (kg/s)
 * @param intakeFlowRate Flow rate from turbine to condenser (kg/s)
 * @returns Changed steam volume
 */
export function calculateSteamVolumeChange(boilerSteamFlow: number, intakeFlowRate: number): number {
  // Steam flow increases the steam volume, water flow decreases it
  return (boilerSteamFlow - intakeFlowRate) * CstSimulation.DeltaTime
}

/**
 * Calculates the flow rate from turbine to condenser based on steam flow and condenser pressure
 * @param boilerSteamFlow Steam flow from the boiler (kg/s)
 * @param condenserPressure Current condenser pressure (mBar)
 * @returns Flow rate from turbine to condenser (kg/s)
 */
export function calculateIntakeFlowRate(boilerSteamFlow: number, condenserPressure: number): number {
  // Define pressure parameters for bell curve

  // Calculate pressure efficiency factor using bell curve (0-1)
  const pressureEfficiency = Math.exp(
    -0.5 *
      Math.pow(
        (condenserPressure - CstSimulation.CstCondenser.OptimalPressure) /
          (CstSimulation.CstCondenser.OptimalPressureBellWidth / 2),
        2,
      ),
  )

  // Calculate flow rate based on available steam and pressure efficiency
  // Cap at maximum intake flow rate defined in constants
  return Math.min(boilerSteamFlow * pressureEfficiency, CstSimulation.CstCondenser.IntakeMaxFlowRate)
}

/**
 * Calculates the recirculation pump flow rate based on valve position
 *
 * @param valvePosition Valve position (0-1)
 * @returns Recirculation pump flow rate (kg/s)
 */
export function calculateRecirculationPumpFlowRate(valvePosition: number): number {
  // Flow rate is proportional to valve position
  return valvePosition * CstSimulation.CstCondenser.RecirculationPump_MaxFlowRate
}

/**
 * Calculates the condensation of steam based on energy balance approach
 *
 * @param currentSteamVolume Current steam volume in the condenser
 * @param currentLiquidVolume Current liquid volume in the condenser
 * @param recirculationPumpValvePosition Valve position of the recirculation pump (0-1)
 * @param steamTemp  temperature in intake steam (°C)
 * @param steamPressure  pressure in intake steam (bar)
 * @returns New steam and liquid volumes, and new outlet temperature
 */
export function calculateCondensation(
  currentSteamVolume: number,
  currentLiquidVolume: number,
  recirculationPumpValvePosition: number,
  steamTemp: number,
  // steamPressure: number,
): {
  steamVolumeAfterCondensation: number
  waterVolumeAfterCondensation: number
  newOutletTemperature: number
} {
  const {
    DeltaTime,
    CstCondenser: { RecirculationPump_MaxFlowRate, RecirculationPump_IntakeTemperature, DampingFactor },
  } = CstSimulation

  // 1. Calculate mass flow rate of recirculating cold water
  const massFlowRate = recirculationPumpValvePosition * RecirculationPump_MaxFlowRate

  // 2. Calculate temperature difference between condensed water and cold recirculation water
  const deltaTemp = steamTemp - RecirculationPump_IntakeTemperature

  // 3. Calculate energy absorbed by cold water (Q = m * cp * ΔT)
  const energyAbsorbed = massFlowRate * CstPhysics.Water_SpecificHeat * deltaTemp * DeltaTime

  // 4. Calculate mass of steam condensed (m = Q / latentHeat)
  const latentHeat = getLatentHeat(steamTemp)
  const massCondensed = energyAbsorbed / latentHeat

  // 5. Convert condensed mass to volume using water density
  const waterDensity = CstPhysics.Water_Density // kg/m³
  const volumeCondensed = (massCondensed / waterDensity) * 1000 // Convert m³ to liters

  // 6. Adjust vapor and liquid volumes
  const condensedVolume = Math.min(currentSteamVolume, volumeCondensed)
  const newSteamVolume = currentSteamVolume - condensedVolume
  const newLiquidVolume = currentLiquidVolume + condensedVolume

  // 7. Calculate new temperature of the condensed water returning to the boiler
  // If there's no recirculation flow, temperature remains the same
  if (massFlowRate <= 0) {
    return {
      steamVolumeAfterCondensation: Math.max(newSteamVolume, 0),
      waterVolumeAfterCondensation: Math.max(newLiquidVolume, 0),
      newOutletTemperature: steamTemp,
    }
  }

  // Calculate temperature change based on energy balance
  // As steam condenses, it releases energy that heats the condensed water
  // The temperature change depends on the mass of water and the energy released
  const condensationEnergy = massCondensed * latentHeat
  const coolingEffect =
    massFlowRate * CstPhysics.Water_SpecificHeat * (steamTemp - RecirculationPump_IntakeTemperature)

  // Temperature rises due to condensation and falls due to cooling water
  const temperatureChange =
    (condensationEnergy - coolingEffect) /
    (((newLiquidVolume * waterDensity) / 1000) * CstPhysics.Water_SpecificHeat)

  const newOutletTemperature = steamTemp + temperatureChange * DampingFactor

  return {
    steamVolumeAfterCondensation: Math.max(newSteamVolume, 0),
    waterVolumeAfterCondensation: Math.max(newLiquidVolume, 0),
    newOutletTemperature: Math.max(RecirculationPump_IntakeTemperature, newOutletTemperature),
  }
}

export function CalculateCondensationFlow(
  condensationPumpValvePosition: number,
  waterVolumeAfterCondensation: number,
) {
  const pumpFlowRate = condensationPumpValvePosition * CstSimulation.CstCondenser.CondensationPump_MaxFlowRate
  const condensatePumpVolume = pumpFlowRate * CstSimulation.DeltaTime
  const newHotwellWaterVolume = Math.max(0, waterVolumeAfterCondensation - condensatePumpVolume)

  return { condensatePumpVolume, newHotwellWaterVolume }
}
