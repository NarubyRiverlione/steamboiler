/**
 * The seal water of the condenser air pump, a liquid ring pump (ADR 0035, #166): its vapour pressure is the lowest pressure the
 * pump can reach, the compression work and the vapour condensing in the ring heat it, and a seal water cooler cools it.
 */

import { CstPhysics, CstSimulation } from "../context/const"
import { vapourPressureAt } from "./condenserCalculation"

const MbarToPa = 100
const WaterMolarMass = 18.015 // kg/kmol
const GasConstant = 8314 // J/(kmol·K)
const KelvinOffset = 273.15
const LatentHeat = 2450 // kJ/kg, water near 20 to 30 °C

// The lowest pressure (mbar) the pump reaches: the vapour pressure of its seal water
export const sealWaterFloor = (sealWaterTemperature: number): number => vapourPressureAt(sealWaterTemperature)

// Share of the pump's volumetric capacity left at the shell pressure (mbar): none at the floor, all of it far above it
export function capacityFraction(sealWaterTemperature: number, shellPressure: number): number {
  if (shellPressure <= 0) return 0
  return Math.max(0, 1 - sealWaterFloor(sealWaterTemperature) / shellPressure)
}

/**
 * The seal water temperature after one tick. Heat in while the pump runs: the shaft power and the latent heat of the vapour
 * that condenses in the ring (the pump flow carries the vapour at the shell vapour pressure). Heat out: the cooler,
 * UA times the difference to the cooling water, when the cooler is on.
 *
 * @param temperature Seal water temperature (°C)
 * @param running The pump runs: it takes its shaft power even stalled at its floor
 * @param pumpFlow Volumetric flow the pump moves (m³/s), zero when it is off, tripped or at its floor
 * @param vapourPressure Shell vapour pressure (mbar)
 * @param shellTemperature Shell temperature (°C)
 * @param coolerOn The seal water cooler works
 */
export function sealWaterTemperatureAfter(
  temperature: number,
  running: boolean,
  pumpFlow: number,
  vapourPressure: number,
  shellTemperature: number,
  coolerOn: boolean,
): number {
  const { DeltaTime, CstCondenser } = CstSimulation
  const vapourDensity: number = (vapourPressure * MbarToPa * WaterMolarMass) / (GasConstant * (shellTemperature + KelvinOffset)) // kg/m³
  const condensationHeat: number = pumpFlow * vapourDensity * CstCondenser.CAR_CondensationFactor * LatentHeat // kW
  const heatIn: number = running ? CstCondenser.CAR_ShaftPower + condensationHeat : 0
  const heatOut: number = coolerOn ? CstCondenser.CAR_SealCoolerUA * (temperature - CstCondenser.RecirculationPump_IntakeTemperature) : 0
  return temperature + ((heatIn - heatOut) * DeltaTime) / (CstCondenser.CAR_SealWaterMass * CstPhysics.Water_SpecificHeat)
}

export const isSealWaterWarning = (temperature: number): boolean => temperature >= CstSimulation.CstCondenser.CAR_SealWaterWarning
export const isSealWaterTrip = (temperature: number): boolean => temperature >= CstSimulation.CstCondenser.CAR_SealWaterTrip
