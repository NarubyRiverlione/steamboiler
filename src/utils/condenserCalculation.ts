import { CondenserState } from "../context/PowerPlantState"
import { CstPhysics, CstSimulation } from "../context/const"
import { waterMassOf } from "./boilerCalculations"
import { getBoilingPoint, getSaturationEnthalpies } from "./steamTable"

const PaPerMbar = 100
const KelvinOffset = 273.15

// Air mass (kg) in the shell that makes the given air pressure (mbar) at the shell temperature (°C): P·V = m·R·T
export function airMassOf(airPressure: number, temperature: number): number {
  const { ShellVolume } = CstSimulation.CstCondenser
  return (airPressure * PaPerMbar * ShellVolume) / (CstPhysics.AirGasConstant * (temperature + KelvinOffset))
}

// Air pressure (mbar) of the air mass (kg) in the shell at the shell temperature (°C)
export function airPressureOf(airMass: number, temperature: number): number {
  const { ShellVolume } = CstSimulation.CstCondenser
  return (airMass * CstPhysics.AirGasConstant * (temperature + KelvinOffset)) / ShellVolume / PaPerMbar
}

/**
 * The air inventory after one tick (ADR 0035). In: the constant in-leakage. Out: the vacuum system removes volume,
 * S·ρ_air(P_air, T) = S·m/V kg/s, so the removal is proportional to the air there is. Taken implicitly, so a pump much
 * larger than the shell stays stable. The air extraction pump always removes; the SJAE only with enough motive steam
 * and while the shell is under its suction limit (it breaks above), and scales with its valve.
 * @returns The new air mass (kg) and whether the SJAE is still enabled
 */
export function calculateAirInventory(
  condenserState: CondenserState,
  boilerPressure: number,
): { airMass: number; newIsSjaeEnabled: boolean } {
  const {
    DeltaTime,
    CstTurbine: { MainSteamValveMinimumPressure },
    CstCondenser: { ShellVolume, AirLeakRate, CAR_Capacity, SJAE_Capacity, SJAE_SuctionLimit },
  } = CstSimulation

  const newIsSjaeEnabled: boolean =
    condenserState.isSjaeEnabled &&
    boilerPressure > MainSteamValveMinimumPressure &&
    condenserState.pressure < SJAE_SuctionLimit
  const pump: number = condenserState.isAirExtractionPumpEnabled ? CAR_Capacity : 0
  const ejector: number = newIsSjaeEnabled ? SJAE_Capacity * condenserState.sjaeValvePosition : 0

  const removalRate: number = (pump + ejector) / ShellVolume // 1/s
  // Air only leaks in while the shell is under atmospheric pressure
  const leak: number = condenserState.pressure < CstPhysics.AtmosphericPressure_mBar ? AirLeakRate : 0
  const airMass: number = (condenserState.airMass + leak * DeltaTime) / (1 + removalRate * DeltaTime)
  return { airMass, newIsSjaeEnabled }
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

export type SteamStream = { flow: number; enthalpy: number }

const SolverIterations = 40
const PressureSearchMin = 1 // mbar
const PressureSearchMax = 2000 // mbar

// Saturation pressure (mbar) at a temperature (°C): the inverse of the boiling point, by bisection
export function vapourPressureAt(temperature: number): number {
  let low: number = PressureSearchMin
  let high: number = PressureSearchMax
  for (let i = 0; i < SolverIterations; i++) {
    const mid: number = (low + high) / 2
    if (saturationTemperature(mid) < temperature) low = mid
    else high = mid
  }
  return high
}

/**
 * Heat (kW) the exchanger must take to condense the streams at the shell vapour pressure (mbar): every kg condenses to
 * saturated liquid, so a stream gives flow·(h − hf). Moisture is already liquid and costs nothing; the heat above
 * saturated vapour is part of h.
 */
export function condensingDemand(streams: SteamStream[], vapourPressure: number): number {
  const { liquid } = getSaturationEnthalpies(vapourPressure / MbarPerBar)
  return streams.reduce((sum: number, { flow, enthalpy }) => sum + flow * Math.max(0, enthalpy - liquid), 0)
}

/**
 * The shell vapour pressure (mbar) at which the exchanger takes exactly the heat the streams bring (ADR 0035). The
 * exchanger heat rises with the saturation temperature and the demand falls with it, so there is one root, found by
 * bisection between the floor and the ceiling. The floor is the vapour pressure of the hotter of the intake water and
 * the hotwell water: with nothing to condense the shell cannot be cooler than the water in it. If the exchanger
 * cannot take the heat even at the ceiling the pressure sits at the ceiling.
 */
export function solveShellVapourPressure(
  streams: SteamStream[],
  coolingWaterFlow: number,
  ceiling: number,
  hotwellTemperature: number,
): number {
  const floor: number = vapourPressureAt(
    Math.max(CstSimulation.CstCondenser.RecirculationPump_IntakeTemperature, hotwellTemperature),
  )
  const top: number = Math.max(floor, ceiling)
  const surplus = (pressure: number): number =>
    condensingDemand(streams, pressure) - condenserHeatCapacity(coolingWaterFlow, saturationTemperature(pressure))

  if (condensingDemand(streams, floor) <= 0) return floor
  if (surplus(top) > 0) return top
  let low: number = floor
  let high: number = top
  for (let i = 0; i < SolverIterations; i++) {
    const mid: number = (low + high) / 2
    if (surplus(mid) > 0) low = mid
    else high = mid
  }
  return high
}

/**
 * Condenses the streams at the shell vapour pressure. The cooling water takes at most Q = ε·ṁ·cp·(Tsat − Tin); below the
 * ceiling that covers the intake exactly. At the ceiling it covers only a share of the vapour: the rest, and whatever
 * does not fit in the hotwell, leaves through the hood relief (vented). The condensate leaves at the saturation
 * temperature. There is no steam pool: the shell holds no vapour inventory (ADR 0035).
 *
 * @param streams The turbine exhaust and bypass steam, flow (kg/s) and enthalpy (kJ/kg)
 * @param recirculationPumpValvePosition Valve position of the recirculation pump (0-1)
 * @param vapourPressure Shell vapour pressure (mbar)
 * @param hotwellRoom kg of water the hotwell can still take at its temperature
 * @returns Mass (kg) that entered the hotwell (moisture and condensate), the mass vented, the condensate temperature
 * (saturation temperature, °C) and the cooling water outlet temperature (°C)
 */
export function calculateCondensation(
  streams: SteamStream[],
  recirculationPumpValvePosition: number,
  vapourPressure: number,
  hotwellRoom: number,
): { condensed: number; vented: number; newOutletTemperature: number; coolingWaterOutletTemperature: number } {
  const {
    DeltaTime,
    CstCondenser: { RecirculationPump_MaxFlowRate, RecirculationPump_IntakeTemperature },
  } = CstSimulation

  const saturationTemp: number = saturationTemperature(vapourPressure)
  const coolingWaterFlow: number = recirculationPumpValvePosition * RecirculationPump_MaxFlowRate
  const capacity: number = condenserHeatCapacity(coolingWaterFlow, saturationTemp) * DeltaTime // kJ

  // Moisture goes straight to the hotwell, the vapour (with the heat above saturated vapour) must be condensed
  const latentHeat: number = latentHeatAt(vapourPressure)
  let moisture = 0
  let vapour = 0
  let excessHeat = 0
  for (const { flow, enthalpy } of streams) {
    const { quality, excessHeat: excess } = splitStreamAtCondenser(enthalpy, vapourPressure)
    moisture += flow * (1 - quality) * DeltaTime
    vapour += flow * quality * DeltaTime
    excessHeat += flow * excess * DeltaTime
  }
  const demand: number = vapour * latentHeat + excessHeat
  const heatTaken: number = Math.min(capacity, demand)
  const vapourCondensed: number = demand > 0 ? (vapour * heatTaken) / demand : vapour

  const arriving: number = moisture + vapourCondensed
  const condensed: number = Math.max(0, Math.min(arriving, hotwellRoom))
  const vented: number = Math.max(0, vapour - vapourCondensed + (arriving - condensed))

  const capacityRate: number = coolingWaterFlow * CstPhysics.Water_SpecificHeat * DeltaTime
  const coolingWaterOutletTemperature: number =
    capacityRate > 0 ? RecirculationPump_IntakeTemperature + heatTaken / capacityRate : RecirculationPump_IntakeTemperature

  return { condensed, vented, newOutletTemperature: saturationTemp, coolingWaterOutletTemperature }
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
