import { CstSimulation } from "../context/const"

const { CstCondenser, CstTurbine } = CstSimulation

// True when the turbine runs within the breaker margin of sync speed
export const isAtSyncSpeed = (rpm: number): boolean =>
  Math.abs(rpm - CstTurbine.SyncRPM) <= CstTurbine.BreakerRPMMargin

// True when condenser pressure (mbar absolute) is above the vacuum limit; a deep vacuum is never refused (ADR 0003)
export const isAboveVacuumLimit = (condenserPressure: number): boolean => condenserPressure > CstCondenser.VacuumLimit

// Highest turbine valve position allowed: above the vacuum limit the valve may close but not open further
export const maxTurbineValvePosition = (currentPosition: number, condenserPressure: number): number =>
  isAboveVacuumLimit(condenserPressure) ? currentPosition : 1

// The turbine trip flag clears on the next opening of the turbine valve, by the operator or the hold-mode PID
export const turbineTrippedAfter = (tripped: boolean, previousPosition: number, newPosition: number): boolean =>
  tripped && newPosition <= previousPosition

/**
 * Electric output of the generator, from the steam flow and the isentropic enthalpy drop:
 * MW = flow [kg/s] x drop [kJ/kg] x turbine isentropic efficiency x generator efficiency / 1000.
 * Produced only with the breaker closed at sync speed; clamped at 0 MW for no flow or a non-positive drop.
 *
 * @param steamFlow - Steam flow through the turbine in kg/s
 * @param enthalpyDrop - Isentropic enthalpy drop from boiler to condenser pressure in kJ/kg
 * @param rpm - The current RPM of the turbine
 * @param generatorBreaker - Whether the generator breaker is closed
 * @returns The electric output in MW
 */
export function calculateElectricityOutput(
  steamFlow: number,
  enthalpyDrop: number,
  rpm: number,
  generatorBreaker: boolean,
): number {
  if (!generatorBreaker || !isAtSyncSpeed(rpm)) return 0
  const megawatt: number =
    (steamFlow * enthalpyDrop * CstTurbine.IsentropicEfficiency * CstTurbine.GeneratorEfficiency) / 1000
  return Math.max(0, megawatt)
}

/**
 * Calculates the RPM of the turbine based on steam flow, boiler pressure, and current RPM.
 * Implements gradual changes according to Newton's laws of motion.
 * 
 * @param currentRPM - The current RPM of the turbine
 * @param steamFlow - The steam flow through the turbine in kg/s
 * @param boilerPressure - The pressure of the boiler in bar
 * @returns The new RPM value
 */
export function calculateRPM(
  currentRPM: number,
  steamFlow: number,
  boilerPressure: number,
): number {
  // Calculate torque from steam flow and pressure
  // Higher pressure and flow = more torque
  const steamTorque = steamFlow * boilerPressure * CstTurbine.TorqueFactor
  
  // Calculate friction torque (increases with RPM)
  const frictionTorque = currentRPM * CstTurbine.FrictionFactor
  
  // Net torque
  const netTorque = steamTorque - frictionTorque
  
  // Calculate angular acceleration (α = τ/I)
  const angularAcceleration = netTorque / CstTurbine.MomentOfInertia
  
  // Calculate RPM change (ω = ω₀ + α·t)
  const rpmChange = angularAcceleration * CstSimulation.DeltaTime * 60 / (2 * Math.PI) // Convert rad/s² to RPM/s
  
  // Calculate new RPM with gradual change
  const newRPM = Math.max(0, currentRPM + rpmChange)
  
  return newRPM
}

/**
 * Calculates the valve adjustment needed to maintain the RPM setpoint in hold mode.
 * Uses a PID controller whose derivative acts on the measured rpm (not the error), so engaging
 * the controller or changing the setpoint gives no derivative kick and D needs no controller memory.
 * 
 * @param currentRPM - The RPM after this tick
 * @param previousRPM - The RPM before this tick
 * @param setPointRPM - The target RPM
 * @param integralError - The accumulated error over time
 * @param deltaTime - The simulation time step in seconds
 * @returns Object containing the valve adjustment and the updated integral error
 */
export function calculateValveAdjustment(
  currentRPM: number,
  previousRPM: number,
  setPointRPM: number,
  integralError: number,
  deltaTime: number
): {
  valveAdjustment: number,
  newIntegralError: number
} {
  const error = setPointRPM - currentRPM
  
  // Proportional term
  const P = CstTurbine.PID_Kp * error
  
  // Integral term (with anti-windup)
  const newIntegralError = Math.max(-1, Math.min(1, integralError + error * deltaTime))
  const I = CstTurbine.PID_Ki * newIntegralError
  
  // Derivative term on measurement: damps a rising rpm
  const D = -CstTurbine.PID_Kd * (currentRPM - previousRPM) / deltaTime
  
  return {
    valveAdjustment: P + I + D,
    newIntegralError
  }
}
