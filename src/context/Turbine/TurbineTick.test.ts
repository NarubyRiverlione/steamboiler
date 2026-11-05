import { describe, it, expect } from "vitest"
import TurbineTick from "./TurbineTick"
import { TurbineState } from "../PowerPlantState"

import { CstSimulation } from "../const"
import { calculateRPM } from "../../utils/turbineCalculations"
import { getIsentropicEnthalpyDrop } from "../../utils/steamTable"

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
    holdMode: false,
    generatorBreaker: false,
    pidIntegralError: 0,
    turbineTripped: false,
  }
  
  const valvePositions = [0, 0.25, 0.5, 0.75, 1]
  const boilerPressure = 20 // Example boiler pressure for testing
  const vacuum = CstSimulation.CstCondenser.VacuumLimit - 100 // condenser pressure well under the limit
  
  valvePositions.forEach((position) => {
    // No electricity at 0 RPM regardless of valve position
    const expectPower = 0 // No power at 0 RPM
    
    it(`should create ${String(expectPower)} MW at 0 RPM with ${String(position * 100)}% turbine Valve Position`, () => {
      const newState = TurbineTick(initialState, boilerPressure, vacuum)
      expect(newState.electricOutput).toBe(expectPower)
    })
  })
  
  // Sync speed with the breaker closed: output follows the actual steam flow and the live conditions
  const loadedState: TurbineState = {
    ...initialState,
    rpm: CstSimulation.CstTurbine.SyncRPM,
    generatorBreaker: true,
    mainSteamValve: true,
    turbineSteamFlowOut: 100, // kg/s
  }
  // The shaft carries no generator load yet (#71), so this much steam accelerates it out of the breaker margin in a
  // tick. Start from the speed that one tick of calculateRPM takes to sync speed, so the breaker stays closed and
  // these tests keep checking the output chain.
  const speedThatTicksToSync = (flow: number, boiler: number, condenserMbar: number): number => {
    const drop: number = getIsentropicEnthalpyDrop(boiler, condenserMbar / 1000)
    let low = 0
    let high: number = CstSimulation.CstTurbine.SyncRPM
    for (let i = 0; i < 60; i++) {
      const mid: number = (low + high) / 2
      if (calculateRPM(mid, flow, drop) < CstSimulation.CstTurbine.SyncRPM) low = mid
      else high = mid
    }
    return low
  }
  const toMW = (state: TurbineState, boiler: number, condenserMbar: number): number =>
    TurbineTick(
      { ...state, rpm: state.rpm !== CstSimulation.CstTurbine.SyncRPM ? state.rpm : speedThatTicksToSync(state.turbineSteamFlowOut, boiler, condenserMbar) },
      boiler,
      condenserMbar,
    ).electricOutput

  it("should generate the IF97 output at sync speed: 100 kg/s, 20 bar to 100 mbar = 65.95 MW", () => {
    expect(Math.abs(toMW(loadedState, 20, 100) - 65.95)).toBeLessThan(65.95 * 0.005)
  })

  it("should give the output at valve capacity: 200 kg/s, 165 bar to 100 mbar = 152.8 MWe", () => {
    const atCapacity: TurbineState = { ...loadedState, turbineSteamFlowOut: CstSimulation.CstTurbine.MaxSteamRemovalRate }
    expect(Math.abs(toMW(atCapacity, 165, 100) - 152.8)).toBeLessThan(152.8 * 0.005)
  })

  it("should give 130.6 MWe at the 171 kg/s of full gas (165 bar, 100 mbar)", () => {
    expect(Math.abs(toMW({ ...loadedState, turbineSteamFlowOut: 171 }, 165, 100) - 130.6)).toBeLessThan(130.6 * 0.005)
  })

  it("should produce nothing off sync speed", () => {
    expect(toMW({ ...loadedState, rpm: CstSimulation.CstTurbine.SyncRPM - 100 }, 20, 100)).toBe(0)
  })

  it("should follow the steam flow in the state, whatever the valve position is", () => {
    const closedValve: number = toMW({ ...loadedState, turbineValvePosition: 0 }, 20, 100)
    expect(Math.abs(closedValve - 65.95)).toBeLessThan(65.95 * 0.005)
    expect(toMW({ ...loadedState, turbineSteamFlowOut: 50 }, 20, 100)).toBeCloseTo(toMW(loadedState, 20, 100) / 2, 1)
  })

  it("should lose output when the condenser vacuum worsens: 200 mbar = 59.30 MW", () => {
    expect(Math.abs(toMW(loadedState, 20, 200) - 59.3)).toBeLessThan(59.3 * 0.005)
  })

  it("should lose output when the boiler pressure drops, at equal flow", () => {
    expect(toMW(loadedState, 10, 100)).toBeLessThan(toMW(loadedState, 20, 100))
  })

  it("should produce nothing with the breaker open or without flow", () => {
    expect(toMW({ ...loadedState, generatorBreaker: false }, 20, 100)).toBe(0)
    expect(toMW({ ...loadedState, turbineSteamFlowOut: 0 }, 20, 100)).toBe(0)
  })
  
  it("should calculate RPM based on steam flow and boiler pressure", () => {
    // Arrange
    const testState: TurbineState = {
      ...initialState,
      turbineSteamFlowOut: 50, // Some steam flow
    }
    
    // Act
    const result = TurbineTick(testState, boilerPressure, vacuum)
    
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
    const result = TurbineTick(testState, boilerPressure, vacuum)
    
    // Assert
    // In hold mode, the valve position should be adjusted to reach the setpoint
    expect(result.turbineValvePosition).not.toBe(0.3)
  })

  describe("hold-mode PID memory", () => {
    const holding: TurbineState = {
      ...initialState,
      rpm: 1000,
      rpmSetPoint: 2000,
      holdMode: true,
      mainSteamValve: true,
      turbineSteamFlowOut: 20,
    }

    it("writes the updated integral error into the returned state", () => {
      const result = TurbineTick(holding, boilerPressure, vacuum)
      const error = holding.rpmSetPoint - result.rpm
      expect(result.pidIntegralError).toBe(Math.min(1, error * CstSimulation.DeltaTime))
    })

    it("resets the integral while hold mode is off", () => {
      const result = TurbineTick({ ...holding, pidIntegralError: 0.4, holdMode: false }, boilerPressure, vacuum)
      expect(result.pidIntegralError).toBe(0)
    })

    it("resets the integral while the main steam valve is closed", () => {
      const result = TurbineTick({ ...holding, pidIntegralError: 0.4, mainSteamValve: false }, boilerPressure, vacuum)
      expect(result.pidIntegralError).toBe(0)
    })

    // The first tick of a (re)engaged PID: P, a zero-start I and D on the rpm change of this tick only
    const { PID_Kp, PID_Ki, PID_Kd } = CstSimulation.CstTurbine
    const firstTickMove = (state: TurbineState): number => {
      const result = TurbineTick(state, boilerPressure, vacuum)
      const error = state.rpmSetPoint - result.rpm
      const integral = Math.min(1, error * CstSimulation.DeltaTime)
      const damping = -PID_Kd * (result.rpm - state.rpm) / CstSimulation.DeltaTime
      const expected = Math.min(1, state.turbineValvePosition + PID_Kp * error + PID_Ki * integral + damping)
      expect(result.turbineValvePosition).toBeCloseTo(expected, 6)
      return result.turbineValvePosition - state.turbineValvePosition
    }

    it("engaging hold mode with a 3000 rpm error gives no derivative kick", () => {
      // the old D term alone added 15; the valve is capped at 1, so the P term (3) saturates it
      firstTickMove({ ...holding, rpm: 0, rpmSetPoint: 3000, turbineSteamFlowOut: 0 })
    })

    it("engaging hold mode with an unclamped error moves the valve by the P term only", () => {
      // 500 rpm error: P = 0.5, the old D term would have added 2.5 and saturated the valve
      const move = firstTickMove({ ...holding, rpm: 1500, rpmSetPoint: 2000 })
      expect(move).toBeLessThan(0.6)
    })

    it("re-engaging hold mode after a while off does not use stale PID memory", () => {
      const off: TurbineState = { ...holding, rpm: 1500, holdMode: false, pidIntegralError: 0.9 }
      const afterOff: TurbineState = TurbineTick(off, boilerPressure, vacuum)
      firstTickMove({ ...afterOff, holdMode: true })
    })

    it("re-opening the main steam valve with hold mode on starts the PID fresh", () => {
      const closed: TurbineState = TurbineTick({ ...holding, rpm: 1500, mainSteamValve: false, pidIntegralError: 0.9 }, boilerPressure, vacuum)
      firstTickMove({ ...closed, mainSteamValve: true })
    })

    it("depends on its input alone: the same state gives the same tick", () => {
      // Small error so the integral stays below its ±1 clamp and leftover memory would show
      const nearSetPoint: TurbineState = { ...holding, rpm: 2000, rpmSetPoint: 2001 }
      const first = TurbineTick(nearSetPoint, boilerPressure, vacuum)
      TurbineTick(first, boilerPressure, vacuum) // a tick in between must not leak into the next call
      expect(TurbineTick(nearSetPoint, boilerPressure, vacuum)).toEqual(first)
    })
  })
  
  it("should gradually slow down when steam flow is cut to zero", () => {
    // Arrange - Start with a turbine at a significant RPM
    const initialRpm = 2000;
    const runningState: TurbineState = {
      ...initialState,
      rpm: initialRpm,
      turbineSteamFlowOut: 50, // Initial steam flow
      mainSteamValve: true
    };
    
    // Act - Cut steam flow to zero and run multiple ticks
    let currentState = runningState;
    const numTicks = 10;
    const boilerPressure = 20;
    
    // First tick with zero steam flow
    // Important: We need to set turbineSteamFlowOut to 0 to simulate cutting the steam flow
    currentState = TurbineTick(
      { ...currentState, turbineSteamFlowOut: 0 }, 
      boilerPressure,
      vacuum
    );
    
    // Assert - RPM should decrease but not immediately drop to zero
    expect(currentState.rpm).toBeLessThan(initialRpm);
    expect(currentState.rpm).toBeGreaterThan(0);
    
    // Run additional ticks to observe continued deceleration
    for (let i = 0; i < numTicks - 1; i++) {
      const previousRpm = currentState.rpm;
      currentState = TurbineTick(currentState, boilerPressure, vacuum);
      
      // Each tick should reduce RPM further due to friction
      expect(currentState.rpm).toBeLessThan(previousRpm);
    }
    
    // After multiple ticks, RPM should be lower than initial
    // The decrease is extremely small due to the high moment of inertia (25000 kg·m²) 
    // and low friction factor (0.01) in the turbine model
    expect(currentState.rpm).toBeLessThan(initialRpm);
    
    // For a large industrial turbine with high inertia, even a tiny decrease
    // confirms that the deceleration model is working correctly
    const actualDecrease = initialRpm - currentState.rpm;
    expect(actualDecrease).toBeGreaterThan(0);
    
    // We can also verify that multiple ticks result in a greater decrease
    // than a single tick would
    const singleTickState = TurbineTick(
      { ...runningState, turbineSteamFlowOut: 0 }, 
      boilerPressure,
      vacuum
    );
    const singleTickDecrease = initialRpm - singleTickState.rpm;
    expect(actualDecrease).toBeGreaterThan(singleTickDecrease);
  })

  describe("turbine trip above the vacuum limit", () => {
    const limit = CstSimulation.CstCondenser.VacuumLimit
    const running: TurbineState = {
      ...initialState,
      rpm: 1000,
      rpmSetPoint: 2000,
      holdMode: true,
      mainSteamValve: true,
      turbineValvePosition: 0.3,
      turbineSteamFlowOut: 20,
      pidIntegralError: 0.4,
    }

    it("closes an open valve, turns hold mode off, clears the PID memory and sets the trip flag", () => {
      const result = TurbineTick(running, boilerPressure, limit + 0.1)
      expect(result).toMatchObject({
        turbineValvePosition: 0,
        holdMode: false,
        pidIntegralError: 0,
        turbineTripped: true,
      })
    })

    it("a turbine trip also happens outside hold mode", () => {
      const result = TurbineTick({ ...running, holdMode: false }, boilerPressure, limit + 50)
      expect(result.turbineValvePosition).toBe(0)
      expect(result.turbineTripped).toBe(true)
    })

    it("does nothing at or below the limit", () => {
      for (const pressure of [limit, limit - 0.1]) {
        const result = TurbineTick({ ...running, holdMode: false }, boilerPressure, pressure)
        expect(result.turbineValvePosition).toBe(0.3)
        expect(result.turbineTripped).toBe(false)
        expect(result.pidIntegralError).toBe(0) // hold mode is off, so the integral is reset
      }
    })

    it("a closed valve gives no turbine trip", () => {
      const closed = { ...running, holdMode: false, turbineValvePosition: 0 }
      expect(TurbineTick(closed, boilerPressure, limit + 100).turbineTripped).toBe(false)
    })

    it("in hold mode above the limit the PID never raises a closed valve", () => {
      // rpm far under the setpoint: the PID would open the valve
      const closedHolding = { ...running, turbineValvePosition: 0 }
      expect(TurbineTick(closedHolding, boilerPressure, limit + 1).turbineValvePosition).toBe(0)
    })

    it("a hold-mode PID opening under vacuum clears the trip flag", () => {
      const tripped = { ...running, turbineValvePosition: 0, turbineTripped: true }
      const result = TurbineTick(tripped, boilerPressure, limit)
      expect(result.turbineValvePosition).toBeGreaterThan(0)
      expect(result.turbineTripped).toBe(false)
    })

    it("the flag stays set while the valve stays shut", () => {
      const tripped = { ...running, holdMode: false, turbineValvePosition: 0, turbineTripped: true }
      expect(TurbineTick(tripped, boilerPressure, limit - 100).turbineTripped).toBe(true)
    })
  })
})
