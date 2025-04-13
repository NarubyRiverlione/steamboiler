import { CstSimulation } from "../context/const"

const { CstTurbine } = CstSimulation

export function calculateElectricityOutput(turbineValvePosition: number, rpm: number): number {
  // Only generate electricity when the turbine is at or very close to MaxRPM
  const rpmThreshold = CstTurbine.MaxRPM * 0.99; // Allow a small tolerance (99% of MaxRPM)
  
  if (rpm >= rpmThreshold) {
    const steamIntake = turbineValvePosition * CstTurbine.MaxSteamRemovalRate
    const electricityOutput = steamIntake * CstTurbine.steamToElectricityEfficiency
    return electricityOutput
  }
  
  return 0; // No electricity output when not at required RPM
}

/**
 * Calculates the RPM of the turbine based on steam flow, boiler pressure, and current RPM.
 * Implements gradual changes according to Newton's laws of motion.
 * 
 * @param currentRPM - The current RPM of the turbine
 * @param steamFlow - The steam flow through the turbine in kg/s
 * @param boilerPressure - The pressure of the boiler in bar
 * @param deltaTime - The simulation time step in seconds
 * @returns The new RPM value
 */
export function calculateRPM(
  currentRPM: number,
  steamFlow: number,
  boilerPressure: number,
  deltaTime: number
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
  const rpmChange = angularAcceleration * deltaTime * 60 / (2 * Math.PI) // Convert rad/s² to RPM/s
  
  // Calculate new RPM with gradual change
  const newRPM = Math.max(0, currentRPM + rpmChange)
  
  return newRPM
}

/**
 * Calculates the valve adjustment needed to maintain the RPM setpoint in hold mode.
 * Uses a PID controller for smooth and accurate control.
 * 
 * @param currentRPM - The current RPM of the turbine
 * @param setPointRPM - The target RPM
 * @param previousError - The error from the previous calculation
 * @param integralError - The accumulated error over time
 * @param deltaTime - The simulation time step in seconds
 * @returns Object containing the valve adjustment and updated PID state
 */
export function calculateValveAdjustment(
  currentRPM: number,
  setPointRPM: number,
  previousError: number,
  integralError: number,
  deltaTime: number
): {
  valveAdjustment: number,
  newIntegralError: number,
  newPreviousError: number
} {
  // PID controller implementation
  const error = setPointRPM - currentRPM
  
  // Proportional term
  const P = CstTurbine.PID_Kp * error
  
  // Integral term (with anti-windup)
  const newIntegralError = Math.max(-1, Math.min(1, integralError + error * deltaTime))
  const I = CstTurbine.PID_Ki * newIntegralError
  
  // Derivative term
  const errorChange = (error - previousError) / deltaTime
  const D = CstTurbine.PID_Kd * errorChange
  
  // Calculate valve adjustment
  const valveAdjustment = P + I + D
  
  return {
    valveAdjustment,
    newIntegralError,
    newPreviousError: error
  }
}
