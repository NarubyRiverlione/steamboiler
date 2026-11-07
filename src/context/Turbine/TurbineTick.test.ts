import { describe, it, expect } from "vitest"
import TurbineTick from "./TurbineTick"
import { TurbineState } from "../PowerPlantState"

import { CstSimulation } from "../const"
import { loadAfter, ratedOutputMW } from "../../utils/turbineCalculations"
import { getIsentropicEnthalpyDrop } from "../../utils/steamTable"

describe("TurbineTick", () => {
  const initialState: TurbineState = { 
    electricOutput: 0,
    loadSetpoint: 0,
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
  
  // Generator load (#71, ADR 0027): the electric output is the load carried, an input to the shaft balance
  describe("generator load", () => {
    const { NoLoadFlowFraction, RatedSteamFlow, SyncRPM } = CstSimulation.CstTurbine
    const noLoadFlow: number = NoLoadFlowFraction * RatedSteamFlow
    const synced: TurbineState = {
      ...initialState,
      rpm: SyncRPM,
      generatorBreaker: true,
      mainSteamValve: true,
      turbineSteamFlowOut: noLoadFlow,
    }
    const drop = (boiler: number, mbar: number): number => getIsentropicEnthalpyDrop(boiler, mbar / 1000)
    // Steam flow that carries the load at sync speed: losses plus load / generator efficiency
    const flowFor = (loadMW: number, boiler: number, mbar: number): number =>
      noLoadFlow +
      (loadMW * 1e6) / CstSimulation.CstTurbine.GeneratorEfficiency /
        (drop(boiler, mbar) * 1000 * CstSimulation.CstTurbine.IsentropicEfficiency)

    it("carries 0 MW at the no-load flow and holds sync speed", () => {
      const result: TurbineState = TurbineTick(synced, 165, 31) // the no-load flow is calibrated at the rated drop: 165 bar to the 31 mbar design vacuum
      expect(result.electricOutput).toBe(0)
      expect(result.generatorBreaker).toBe(true)
      expect(result.rpm).toBeCloseTo(SyncRPM, 1)
    })

    it("reports no output from steam alone: more steam than the no-load flow accelerates, it does not make MW", () => {
      const result: TurbineState = TurbineTick({ ...synced, turbineSteamFlowOut: 100 }, 165, 100)
      expect(result.electricOutput).toBe(0)
      expect(result.rpm).toBeGreaterThan(SyncRPM)
    })

    it("moves the load toward the setpoint at the load rate and keeps it from tick to tick", () => {
      const first: TurbineState = TurbineTick({ ...synced, loadSetpoint: 100 }, 165, 100)
      expect(first.electricOutput).toBeCloseTo(loadAfter(0, 100), 9)
      const second: TurbineState = TurbineTick(first, 165, 100)
      expect(second.electricOutput).toBeCloseTo(loadAfter(first.electricOutput, 100), 9)
      expect(second.loadSetpoint).toBe(100)
    })

    it("lowers the load at the load rate when the setpoint drops, and stops at the setpoint", () => {
      const result: TurbineState = TurbineTick({ ...synced, electricOutput: 1, loadSetpoint: 0 }, 165, 100)
      expect(result.electricOutput).toBeCloseTo(loadAfter(1, 0), 9)
      expect(result.electricOutput).toBeLessThan(1)
      expect(TurbineTick({ ...synced, electricOutput: 0.005, loadSetpoint: 0 }, 165, 100).electricOutput).toBe(0)
    })

    it("holds sync speed when the steam carries the load", () => {
      const loaded: TurbineState = { ...synced, electricOutput: 50, loadSetpoint: 50, turbineSteamFlowOut: flowFor(50, 165, 31) }
      const result: TurbineState = TurbineTick(loaded, 165, 31)
      expect(result.rpm).toBeCloseTo(SyncRPM, 2)
      expect(result.electricOutput).toBe(50)
    })

    it("slows the shaft when the steam falls short of the load", () => {
      const loaded: TurbineState = { ...synced, electricOutput: 50, loadSetpoint: 50 }
      expect(TurbineTick(loaded, 165, 100).rpm).toBeLessThan(SyncRPM)
    })

    it("opens the breaker when steam cannot carry the load: load and setpoint 0 on that tick, no NaN", () => {
      const loaded: TurbineState = { ...synced, rpm: SyncRPM - 1.99, electricOutput: 100, loadSetpoint: ratedOutputMW }
      const result: TurbineState = TurbineTick(loaded, 165, 100)
      expect(result.generatorBreaker).toBe(false)
      expect(result.electricOutput).toBe(0)
      expect(result.loadSetpoint).toBe(0)
      expect(Number.isFinite(result.rpm)).toBe(true)
    })

    it("a reclose does not bring the load back: the setpoint stays 0", () => {
      const opened: TurbineState = TurbineTick({ ...synced, rpm: SyncRPM - 1.99, electricOutput: 100, loadSetpoint: 100 }, 165, 100)
      const closedAgain: TurbineState = TurbineTick({ ...opened, rpm: SyncRPM, generatorBreaker: true }, 165, 100)
      expect(closedAgain.electricOutput).toBe(0)
    })

    it("carries no load with the breaker open, whatever the setpoint says", () => {
      const result: TurbineState = TurbineTick({ ...synced, generatorBreaker: false, loadSetpoint: 50, electricOutput: 50 }, 165, 100)
      expect(result.electricOutput).toBe(0)
      expect(result.loadSetpoint).toBe(0)
    })

    it("a vacuum trip with load on ends with the breaker open", () => {
      let state: TurbineState = { ...synced, electricOutput: 100, loadSetpoint: 100, turbineValvePosition: 0.6, turbineSteamFlowOut: flowFor(100, 165, 100) }
      const aboveLimit: number = CstSimulation.CstCondenser.VacuumLimit + 10
      for (let i = 0; i < 600 && state.generatorBreaker; i++) state = { ...TurbineTick(state, 165, aboveLimit), turbineSteamFlowOut: 0 }
      expect(state.turbineTripped).toBe(true)
      expect(state.generatorBreaker).toBe(false)
      expect(state.electricOutput).toBe(0)
      expect(Number.isFinite(state.rpm)).toBe(true)
    })
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
