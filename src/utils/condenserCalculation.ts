import { CondenserState } from "../context/PowerPlantState"
import { CstPhysics, CstSimulation } from "../context/const"
import { waterMassOf } from "./boilerCalculations"
import { getBoilingPoint, getSaturationEnthalpies } from "./steamTable"

// Air Extraction Pump (CAR) behavior
const calcCARvacuum = (isAirExtractionPumpEnabled: boolean, previousVacuum: number) => {
  // Check if air extraction pump is enabled, if not the potential vacuum decay is handled in a separated function
  if (!isAirExtractionPumpEnabled) return 0

  const {
    CstCondenser: { CAR_MaxVacuum, CAR_TimeNeeded },
  } = CstSimulation
  // vacuum already below CAR max (because of SJAE)
  if (previousVacuum > CAR_MaxVacuum) return 0

  // Calculate vacuum increase based on time needed to reach max vacuum
  const vacuumIncreaseRate = (CAR_MaxVacuum / CAR_TimeNeeded) * CstSimulation.DeltaTime // mbar per second

  // Gradually increase vacuum (more negative pressure)
  const limitedVacuum = Math.min(CAR_MaxVacuum, previousVacuum + vacuumIncreaseRate)
  return limitedVacuum
}

// Steam Jet Air Extraction (SJAE) behavior
const calcSJAEvacuum = (
  isSjaeEnabled: boolean,
  sjaeValvePosition: number,
  vacuumAfterCAR: number,
  boilerPressure: number,
  previousVacuum: number,
): { newIsSjaeEnabled: boolean; vacuumAfterSJAE: number } => {
  // Check if SJAE is enabled, handle potential vacuum decay in separated function
  if (!isSjaeEnabled) return { newIsSjaeEnabled: false, vacuumAfterSJAE: vacuumAfterCAR }

  // Check if SJAE should be automatically disabled
  if (boilerPressure <= CstSimulation.CstTurbine.MainSteamValveMinimumPressure) {
    // Not enough steam pressure to use  SJAE
    return { newIsSjaeEnabled: false, vacuumAfterSJAE: vacuumAfterCAR }
  }

  const {
    CstTurbine: { MaxSteamRemovalRate },
    CstCondenser: { CAR_MaxVacuum, SJAE_MaxPressureDifference, SJAE_VacuumIncreaseRate, MaxVacuum },
  } = CstSimulation

  // Calculate max allowed vacuum for SJAE
  const minVacuumNeeded = CAR_MaxVacuum - SJAE_MaxPressureDifference

  // Check if pressure is too high for SJAE
  if (previousVacuum < minVacuumNeeded) {
    // Pressure too high, disable SJAE
    return { newIsSjaeEnabled: false, vacuumAfterSJAE: vacuumAfterCAR }
  }

  // Calculate vacuum increase based on steam flow and valve position
  const steamFlowEffect = Math.min(1, boilerPressure / MaxSteamRemovalRate)

  // Combine effects for final vacuum increase
  const vacuumIncreaseRate = SJAE_VacuumIncreaseRate * sjaeValvePosition * steamFlowEffect

  // Apply vacuum increase (limited by max allowed vacuum)
  const vacuumAfterSJAE = Math.min(MaxVacuum, previousVacuum + vacuumIncreaseRate * CstSimulation.DeltaTime)
  return { newIsSjaeEnabled: true, vacuumAfterSJAE }
}

const decayVacuum = (
  isAirExtractionPumpEnabled: boolean,
  isSjaeEnabled: boolean,
  vacuumAfterSJAE: number,
  previousVacuum: number,
) => {
  const {
    DeltaTime,
    CstCondenser: { VacuumDecayRate },
  } = CstSimulation

  if (vacuumAfterSJAE !== 0) return vacuumAfterSJAE

  if (isAirExtractionPumpEnabled && isSjaeEnabled) return previousVacuum

  const vacuumDecay = VacuumDecayRate * DeltaTime // mbar per second

  const vacuumAfterDecay = Math.max(previousVacuum - vacuumDecay, 0)
  return vacuumAfterDecay
}

/* Pressure below atmospheric by   CAR & SJAE behavior
 * Vacuum decay is handled in a separated function
 * @param condenserState Current state of the condenser
 * @param boilerPressure Current pressure in the boiler (bar)
 * @returns New pressure and SJAE status
 */

export function calculateVacuumByReducers(
  condenserState: CondenserState,
  boilerPressure: number,
): { vacuumByReducers: number; newIsSjaeEnabled: boolean } {
  const previousVacuum = CstPhysics.AtmosphericPressure_mBar - condenserState.pressure

  const vacuumAfterCAR = calcCARvacuum(condenserState.isAirExtractionPumpEnabled, previousVacuum)

  const { vacuumAfterSJAE, newIsSjaeEnabled } = calcSJAEvacuum(
    condenserState.isSjaeEnabled,
    condenserState.sjaeValvePosition,
    vacuumAfterCAR,
    boilerPressure,
    previousVacuum,
  )
  const vacuumAfterDecay = decayVacuum(
    condenserState.isAirExtractionPumpEnabled,
    newIsSjaeEnabled,
    vacuumAfterSJAE,
    previousVacuum,
  )

  return {
    vacuumByReducers: vacuumAfterDecay, // mBar
    newIsSjaeEnabled,
  }
}

// Saturation temperature (°C) at the condenser pressure (mbar absolute)
export function saturationTemperature(condenserPressure: number): number {
  return getBoilingPoint(condenserPressure / 1000)
}

const MbarPerBar = 1000

// Latent heat (kJ/kg) at the condenser pressure (mbar absolute), from the same rows as the stream enthalpies
const latentHeatAt = (condenserPressure: number): number => {
  const { liquid, vapor } = getSaturationEnthalpies(condenserPressure / MbarPerBar)
  return vapor - liquid
}

/**
 * A stream entering the condenser at its real enthalpy (kJ/kg). Below saturated vapour at the condenser pressure it
 * splits into moisture and vapour (quality = vapour share by mass); above it, it is all vapour and the heat above
 * saturated vapour (kJ/kg) loads the cooling water on top of the condensing (ADR 0032).
 */
export function splitStreamAtCondenser(
  enthalpy: number,
  condenserPressure: number,
): { quality: number; excessHeat: number } {
  const { liquid, vapor } = getSaturationEnthalpies(condenserPressure / MbarPerBar)
  if (enthalpy >= vapor) return { quality: 1, excessHeat: enthalpy - vapor }
  return { quality: Math.max(0, (enthalpy - liquid) / (vapor - liquid)), excessHeat: 0 }
}

/**
 * Heat (kW) a single-pass condenser gives the cooling water at the given flow (L/s, about kg/s): the shell side is
 * isothermal, so Q = ε·ṁ·cp·(Tsat − Tin) with ε = 1 − exp(−UA / (ṁ·cp)). UA scales with the flow to the power 0.5
 * (HEI). No flow gives no heat, with no division by zero (ADR 0032).
 */
export function condenserHeatCapacity(coolingWaterFlow: number, saturationTemp: number): number {
  const { RecirculationPump_MaxFlowRate, RecirculationPump_IntakeTemperature, HeatExchangerUA } = CstSimulation.CstCondenser
  if (coolingWaterFlow <= 0) return 0

  const capacityRate: number = coolingWaterFlow * CstPhysics.Water_SpecificHeat // kW/K
  const ua: number = HeatExchangerUA * (coolingWaterFlow / RecirculationPump_MaxFlowRate) ** 0.5
  const effectiveness: number = 1 - Math.exp(-ua / capacityRate)
  return effectiveness * capacityRate * Math.max(0, saturationTemp - RecirculationPump_IntakeTemperature)
}

/**
 * Calculates the condensation of steam in a limited heat exchanger at the saturation temperature of the condenser
 * pressure. The cooling water takes at most Q = ε·ṁ·cp·(Tsat − Tin); first the heat the intake carries above saturated
 * vapour, then the latent heat of the vapour it condenses. The condensate leaves at the saturation temperature.
 *
 * @param currentSteamMass kg, Current steam mass in the condenser (vapour only)
 * @param currentLiquidMass kg, Current liquid mass in the hotwell
 * @param recirculationPumpValvePosition Valve position of the recirculation pump (0-1)
 * @param condenserPressure absolute pressure in the condenser (mbar)
 * @param hotwellRoom kg of water the hotwell can still take at its temperature, limits the condensation
 * @param excessHeat kJ the intake carried above saturated vapour this tick, taken from the cooling water first
 * @returns New steam and liquid masses (kg), the condensate temperature (saturation temperature, °C) and the cooling
 * water outlet temperature (°C)
 */
export function calculateCondensation(
  currentSteamMass: number,
  currentLiquidMass: number,
  recirculationPumpValvePosition: number,
  condenserPressure: number,
  hotwellRoom: number,
  excessHeat = 0,
): {
  steamMassAfterCondensation: number
  waterMassAfterCondensation: number
  newOutletTemperature: number
  coolingWaterOutletTemperature: number
} {
  const {
    DeltaTime,
    CstCondenser: { RecirculationPump_MaxFlowRate, RecirculationPump_IntakeTemperature },
  } = CstSimulation

  // 1. Condensate leaves at the saturation temperature of the condenser pressure
  const saturationTemp: number = saturationTemperature(condenserPressure)

  // 2. Cooling water flow and the heat the exchanger can give it this tick (kJ)
  const coolingWaterFlow: number = recirculationPumpValvePosition * RecirculationPump_MaxFlowRate
  const capacity: number = condenserHeatCapacity(coolingWaterFlow, saturationTemp) * DeltaTime

  // 3. The intake's extra heat first, the rest condenses vapour: never more than the steam there is or the hotwell room
  const excessTaken: number = Math.min(capacity, excessHeat)
  const latentHeat: number = latentHeatAt(condenserPressure)
  const massCondensed: number = (capacity - excessTaken) / latentHeat
  const condensedMass: number = Math.min(currentSteamMass, massCondensed, hotwellRoom)

  // 4. The cooling water carries the heat actually taken
  const heatTaken: number = excessTaken + condensedMass * latentHeat
  const capacityRate: number = coolingWaterFlow * CstPhysics.Water_SpecificHeat * DeltaTime
  const coolingWaterOutletTemperature: number =
    capacityRate > 0 ? RecirculationPump_IntakeTemperature + heatTaken / capacityRate : RecirculationPump_IntakeTemperature

  return {
    steamMassAfterCondensation: Math.max(currentSteamMass - condensedMass, 0),
    waterMassAfterCondensation: Math.max(currentLiquidMass + condensedMass, 0),
    newOutletTemperature: saturationTemp,
    coolingWaterOutletTemperature,
  }
}

// The Return: the pump volume (L), in kg at the hotwell temperature, limited by what the hotwell holds and the room
// (kg) left in the boiler. Whatever cannot be returned stays in the hotwell.
export function CalculateCondensationFlow(
  condensationPumpValvePosition: number,
  waterMassAfterCondensation: number,
  hotwellTemperature: number,
  boilerRoom: number,
): { condensatePumpMass: number; newHotwellWaterMass: number } {
  const pumpFlowRate = condensationPumpValvePosition * CstSimulation.CstCondenser.CondensationPump_MaxFlowRate
  const pumpMass = waterMassOf(pumpFlowRate * CstSimulation.DeltaTime, hotwellTemperature)
  const condensatePumpMass = Math.max(0, Math.min(pumpMass, waterMassAfterCondensation, boilerRoom))
  const newHotwellWaterMass = waterMassAfterCondensation - condensatePumpMass

  return { condensatePumpMass, newHotwellWaterMass }
}

// Hotwell level as a fraction (0-1) of the hotwell volume; it is volumetric, so it drifts with the hotwell temperature (ADR 0007)
export const hotwellLevel = (hotwellWaterVolume: number): number =>
  hotwellWaterVolume / CstSimulation.CstCondenser.TotalVolume

// Temperature after mixing two water masses (kg, same specific heat)
export function mixTemperature(massA: number, tempA: number, massB: number, tempB: number): number {
  const total = massA + massB
  return total > 0 ? (massA * tempA + massB * tempB) / total : tempA
}

/**
 * Hotwell boundary flows: makeup water in from outside the loop, reject water out to storage.
 * The valve flows are litres, converted to kg at the hotwell temperature. Makeup stops at the room left in the
 * hotwell; reject never takes more than the hotwell holds.
 * @returns New hotwell mass (kg) and temperature, and the kg added and removed this tick
 */
export function calculateHotwellExchange(
  hotwellMass: number,
  hotwellTemperature: number,
  makeupValvePosition: number,
  rejectValvePosition: number,
  hotwellRoom: number,
): { mass: number; temperature: number; makeup: number; reject: number } {
  const {
    DeltaTime,
    CstCondenser: { Makeup_MaxFlowRate, Makeup_Temperature, Reject_MaxFlowRate },
  } = CstSimulation
  const makeup = Math.min(
    hotwellRoom,
    waterMassOf(makeupValvePosition * Makeup_MaxFlowRate * DeltaTime, hotwellTemperature),
  )
  const temperature = mixTemperature(hotwellMass, hotwellTemperature, makeup, Makeup_Temperature)
  const reject = Math.min(
    hotwellMass + makeup,
    waterMassOf(rejectValvePosition * Reject_MaxFlowRate * DeltaTime, hotwellTemperature),
  )
  return { mass: hotwellMass + makeup - reject, temperature, makeup, reject }
}
