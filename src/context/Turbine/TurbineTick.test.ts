import { describe, it, expect } from "vitest"
import TurbineTick from "./TurbineTick"
import { TurbineState } from "../PowerPlantState"

import { CstSimulation } from "../const"

describe("TurbineTick", () => {
  const initialState: TurbineState = { 
    electricOutput: 0,
    bypassValvePosition: 0,
    bypassSteamFlowOut: 0,
    turbineValvePosition: 0,
    turbineSteamFlowOut: 0,
    mainSteamValve: false,
    rpm: 0,
    rpmSetPoint: CstSimulation.CstTurbine.DefaultRPMSetPoint,
    holdMode: false
  }
  
  const valvePositions = [0, 0.25, 0.5, 0.75, 1]
  const boilerPressure = 20 // Example boiler pressure for testing
  
  valvePositions.forEach((position) => {
    const steamFlow = position * CstSimulation.CstTurbine.MaxSteamRemovalRate
    const expectPower = CstSimulation.CstTurbine.steamToElectricityEfficiency * steamFlow
    
    it(`should create ${String(expectPower)} MW based on ${String(position * 100)}% turbine Valve Position`, () => {
      const newState = TurbineTick(initialState, position, boilerPressure)
      expect(newState.electricOutput).toBe(expectPower)
    })
  })
  
  it("should calculate RPM based on steam flow and boiler pressure", () => {
    // Arrange
    const testState: TurbineState = {
      ...initialState,
      turbineSteamFlowOut: 50, // Some steam flow
    }
    
    // Act
    const result = TurbineTick(testState, 0.5, boilerPressure)
    
    // Assert
    expect(result.rpm).toBeGreaterThan(0) // RPM should increase with steam flow
  })
  
  it("should maintain RPM setpoint in hold mode", () => {
    // Arrange
    const testState: TurbineState = {
      ...initialState,
      rpm: 1000, // Current RPM
      rpmSetPoint: 2000, // Target RPM
      holdMode: true, // Enable hold mode
      mainSteamValve: true, // Main valve open
      turbineSteamFlowOut: 20, // Some steam flow
    }
    
    // Act
    const result = TurbineTick(testState, 0.3, boilerPressure)
    
    // Assert
    // In hold mode, the valve position should be adjusted to reach the setpoint
    expect(result.turbineValvePosition).not.toBe(0.3)
  })
})
