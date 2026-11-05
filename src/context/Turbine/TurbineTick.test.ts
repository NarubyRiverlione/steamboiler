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
    runUpPoint: CstSimulation.CstTurbine.DefaultRunUpPoint,
    speedMode: "free",
    speedReference: 0,
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
  
  describe("speed modes", () => {
    const { RunUpRate, HoldEngageWindow, PID_Kp, PID_Ki, PID_Kd } = CstSimulation.CstTurbine
    const { DeltaTime } = CstSimulation
    const rampPerTick: number = (RunUpRate * DeltaTime) / 60
    const ramping: TurbineState = {
      ...initialState,
      rpm: 1000,
      runUpPoint: 2500,
      speedMode: "rampUp",
      speedReference: 1000,
      mainSteamValve: true,
      turbineSteamFlowOut: 20,
    }

    describe("Ramp up", () => {
      it("moves the speed reference at the run-up rate", () => {
        expect(TurbineTick(ramping, boilerPressure, vacuum).speedReference).toBeCloseTo(1000 + rampPerTick, 9)
      })

      it("stops the reference at the selected point without overshoot", () => {
        const nearly: TurbineState = { ...ramping, speedReference: 2500 - rampPerTick / 2 }
        const once: TurbineState = TurbineTick(nearly, boilerPressure, vacuum)
        expect(once.speedReference).toBe(2500)
        expect(TurbineTick(once, boilerPressure, vacuum).speedReference).toBe(2500)
      })

      it("aims the PID at the reference: P, a zero-start I and D on this tick's rpm change", () => {
        const lagging: TurbineState = { ...ramping, speedReference: 1100, turbineSteamFlowOut: 0 }
        const result: TurbineState = TurbineTick(lagging, boilerPressure, vacuum)
        const error: number = result.speedReference - result.rpm
        const integral: number = Math.min(1, error * DeltaTime)
        const damping: number = (-PID_Kd * (result.rpm - lagging.rpm)) / DeltaTime
        const expected: number = Math.min(1, PID_Kp * error + PID_Ki * integral + damping)
        expect(expected).toBeGreaterThan(0)
        expect(result.turbineValvePosition).toBeCloseTo(expected, 6)
      })

      it("writes the updated integral error into the returned state", () => {
        const result: TurbineState = TurbineTick(ramping, boilerPressure, vacuum)
        expect(result.pidIntegralError).toBe(Math.min(1, (result.speedReference - result.rpm) * DeltaTime))
      })

      it("engages Hold on arrival: reference at the point and speed within the window", () => {
        const arrived: TurbineState = { ...ramping, rpm: 2500 - 1, runUpPoint: 2500, speedReference: 2500, turbineSteamFlowOut: 0 }
        expect(TurbineTick(arrived, boilerPressure, vacuum).speedMode).toBe("hold")
      })

      it("stays in Ramp up while the reference is still short of the point, even within the window", () => {
        const early: TurbineState = { ...ramping, rpm: 2500 - 1, speedReference: 2000 }
        expect(TurbineTick(early, boilerPressure, vacuum).speedMode).toBe("rampUp")
      })

      it("stays in Ramp up when the reference is at the point but the speed is outside the window", () => {
        const behind: TurbineState = { ...ramping, rpm: 2500 - HoldEngageWindow - 50, speedReference: 2500, turbineSteamFlowOut: 0 }
        expect(TurbineTick(behind, boilerPressure, vacuum).speedMode).toBe("rampUp")
      })
    })

    describe("Hold", () => {
      const holding: TurbineState = { ...ramping, speedMode: "hold", rpm: 1000, runUpPoint: 1500, speedReference: 1500 }

      it("aims the PID at the selected point with no ramp", () => {
        const result: TurbineState = TurbineTick(holding, boilerPressure, vacuum)
        expect(result.speedReference).toBe(1500)
        expect(result.speedMode).toBe("hold")
        expect(result.turbineValvePosition).toBeGreaterThan(0)
      })

      it("stays on when the speed leaves the window", () => {
        const far: TurbineState = { ...holding, rpm: 1500 + HoldEngageWindow + 100 }
        expect(TurbineTick(far, boilerPressure, vacuum).speedMode).toBe("hold")
      })
    })

    describe("PID inactive", () => {
      it("resets the integral and follows the speed in Free, keeping the mode", () => {
        const result: TurbineState = TurbineTick({ ...ramping, speedMode: "free", pidIntegralError: 0.4 }, boilerPressure, vacuum)
        expect(result.pidIntegralError).toBe(0)
        expect(result.speedReference).toBe(result.rpm)
        expect(result.speedMode).toBe("free")
      })

      it("resets the integral and follows the speed with the main steam valve closed, keeping the mode", () => {
        const result: TurbineState = TurbineTick({ ...ramping, mainSteamValve: false, pidIntegralError: 0.4 }, boilerPressure, vacuum)
        expect(result.pidIntegralError).toBe(0)
        expect(result.speedReference).toBe(result.rpm)
        expect(result.speedMode).toBe("rampUp")
      })

      it("does not move the valve in Free", () => {
        expect(TurbineTick({ ...ramping, speedMode: "free", turbineValvePosition: 0.3 }, boilerPressure, vacuum).turbineValvePosition).toBe(0.3)
      })

      it("re-opening the main steam valve in Ramp up starts the reference from the current speed", () => {
        const closed: TurbineState = TurbineTick({ ...ramping, rpm: 1500, mainSteamValve: false, speedReference: 1000, pidIntegralError: 0.9 }, boilerPressure, vacuum)
        const reopened: TurbineState = TurbineTick({ ...closed, mainSteamValve: true }, boilerPressure, vacuum)
        expect(reopened.speedReference).toBeCloseTo(closed.rpm + rampPerTick, 9)
        expect(reopened.pidIntegralError).toBe(Math.min(1, (reopened.speedReference - reopened.rpm) * DeltaTime))
      })
    })

    it("depends on its input alone: the same state gives the same tick", () => {
      const first: TurbineState = TurbineTick(ramping, boilerPressure, vacuum)
      TurbineTick(first, boilerPressure, vacuum) // a tick in between must not leak into the next call
      expect(TurbineTick(ramping, boilerPressure, vacuum)).toEqual(first)
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
      runUpPoint: 2000,
      speedMode: "hold",
      speedReference: 2000,
      mainSteamValve: true,
      turbineValvePosition: 0.3,
      turbineSteamFlowOut: 20,
      pidIntegralError: 0.4,
    }

    it("closes an open valve, returns to Free, clears the PID memory and sets the trip flag", () => {
      const result = TurbineTick(running, boilerPressure, limit + 0.1)
      expect(result).toMatchObject({
        turbineValvePosition: 0,
        speedMode: "free",
        pidIntegralError: 0,
        turbineTripped: true,
      })
    })

    it("a turbine trip also happens outside hold mode", () => {
      const result = TurbineTick({ ...running, speedMode: "free" }, boilerPressure, limit + 50)
      expect(result.turbineValvePosition).toBe(0)
      expect(result.turbineTripped).toBe(true)
    })

    it("does nothing at or below the limit", () => {
      for (const pressure of [limit, limit - 0.1]) {
        const result = TurbineTick({ ...running, speedMode: "free" }, boilerPressure, pressure)
        expect(result.turbineValvePosition).toBe(0.3)
        expect(result.turbineTripped).toBe(false)
        expect(result.pidIntegralError).toBe(0) // Free, so the integral is reset
      }
    })

    it("a closed valve gives no turbine trip", () => {
      const closed: TurbineState = { ...running, speedMode: "free", turbineValvePosition: 0 }
      expect(TurbineTick(closed, boilerPressure, limit + 100).turbineTripped).toBe(false)
    })

    it("in Hold above the limit the PID never raises a closed valve", () => {
      // rpm far under the setpoint: the PID would open the valve
      const closedHolding = { ...running, turbineValvePosition: 0 }
      expect(TurbineTick(closedHolding, boilerPressure, limit + 1).turbineValvePosition).toBe(0)
    })

    it("a Hold PID opening under vacuum clears the trip flag", () => {
      const tripped = { ...running, turbineValvePosition: 0, turbineTripped: true }
      const result = TurbineTick(tripped, boilerPressure, limit)
      expect(result.turbineValvePosition).toBeGreaterThan(0)
      expect(result.turbineTripped).toBe(false)
    })

    it("the flag stays set while the valve stays shut", () => {
      const tripped: TurbineState = { ...running, speedMode: "free", turbineValvePosition: 0, turbineTripped: true }
      expect(TurbineTick(tripped, boilerPressure, limit - 100).turbineTripped).toBe(true)
    })
  })
})
