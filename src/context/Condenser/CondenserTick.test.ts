 
 
import { describe, it, expect, vi, test, afterEach, beforeEach } from "vitest"
import { CondenserTick } from "./CondenserTick"
import { CstSimulation } from "../const"
import { initialPowerPlantState } from "../PowerPlantReducer"
import { BoilerRemoveSteam } from "../Boiler/BoilerTick"
import { BoilerState, CondenserState } from "../PowerPlantState"

const initialState: CondenserState = {
  steamMass: 0,
  hotwellWaterVolume: CstSimulation.CstCondenser.HotwellStartVolume,
  condensationPumpValvePosition: 0, // no feedwater pull-out
  recirculationPumpValvePosition: 1,
  intakeFlowRate: 0,
  pressure: CstSimulation.CstCondenser.OptimalPressure,
  deltaWaterVolume: 0,
  returnRate: 0,
  coolingRate: 0,
  isAirExtractionPumpEnabled: false,
  sjaeValvePosition: 0,
  isSjaeEnabled: true,
}

describe("CondenserTick", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Test with various turbine valve positions
  const testCases = [0, 1, 5, 10, 50, 100]

  testCases.forEach((turbineValvePosition) => {
    it(`Convert steam to water with a turbine valve at ${String(turbineValvePosition)}%`, () => {
      // open turbine valve
      const boilerStateTurbineValve: BoilerState = {
        ...initialPowerPlantState.Boiler,
        turbineValvePosition,
        mainSteamValve: true,
        steamMass: 50, // kg
      }
      // get turbine steam intake from turbine valve position
      const boilerSteamRemovedState = BoilerRemoveSteam(boilerStateTurbineValve, "TURBINE")
      const { turbineSteamFlowOut } = boilerSteamRemovedState
      const expectedSteamFlow =
        (turbineValvePosition / 100) * CstSimulation.CstBoiler.MaxSteamRemovalRate * CstSimulation.DeltaTime

      // expect complete conversion of steam to water
      const expectedWaterDelta = turbineSteamFlowOut * CstSimulation.DeltaTime

      // it(`should add ${String(expectedWaterDelta)} kg/s water when turbine valve is at ${String(turbineValvePosition)}% = flow is ${String(turbineSteamFlowOut)} kg/s`, () => {
      expect(turbineSteamFlowOut).toBeCloseTo(expectedSteamFlow)
      const boilerPressure = 100 // bar, must be above MSV opening
      const state = { ...initialState }
      // For simplicity, use turbine steam as the sole input.
      const steamFromTurbine = {
        flow: turbineSteamFlowOut,
        temp: CstSimulation.CstTurbine.steamOutflowTemperature,
        pressure: CstSimulation.CstTurbine.steamOutflowPressure,
      }
      const steamFromBypass = { flow: 0, temp: 300 }

      const newState = CondenserTick(state, boilerPressure, steamFromBypass, steamFromTurbine)
      expect(newState).not.toBeInstanceOf(Error)
      expect(newState.isSjaeEnabled).toBeTruthy()
      expect(newState.intakeFlowRate).toBe(steamFromTurbine.flow)
      expect(newState.deltaWaterVolume).toBeCloseTo(expectedWaterDelta)
    })
  })
  const testTicks = 100
  it(`Convert for ${String(testTicks)} Ticks steam to water with a turbine valve at 100% and condensation pump not running`, () => {
    const turbineValvePosition = 100
    // open turbine valve
    const boilerStateTurbineValve: BoilerState = {
      ...initialPowerPlantState.Boiler,
      turbineValvePosition,
      mainSteamValve: true,
      steamMass: 50, // kg
    }
    // get turbine steam intake from turbine valve position
    const boilerSteamRemovedState = BoilerRemoveSteam(boilerStateTurbineValve, "TURBINE")
    const { turbineSteamFlowOut } = boilerSteamRemovedState
    const expectedSteamFlow =
      (turbineValvePosition / 100) * CstSimulation.CstBoiler.MaxSteamRemovalRate * CstSimulation.DeltaTime

    // expect complete conversion of steam to water
    const expectedWaterDelta = turbineSteamFlowOut * CstSimulation.DeltaTime

    // it(`should add ${String(expectedWaterDelta)} kg/s water when turbine valve is at ${String(turbineValvePosition)}% = flow is ${String(turbineSteamFlowOut)} kg/s`, () => {
    expect(turbineSteamFlowOut).toBeCloseTo(expectedSteamFlow)
    const boilerPressure = 100 // bar, must be above MSV opening
    let state = { ...initialState }
    // For simplicity, use turbine steam as the sole input.
    const steamFromTurbine = {
      flow: turbineSteamFlowOut,
      temp: CstSimulation.CstTurbine.steamOutflowTemperature,
      pressure: CstSimulation.CstTurbine.steamOutflowPressure,
    }
    const steamFromBypass = { flow: 0, temp: 300 }

    let testCounter = 0
    const testTick = () => {
      const simulationInterval = setInterval(() => {
        testCounter++
        state = CondenserTick(state, boilerPressure, steamFromBypass, steamFromTurbine)

        expect(state).not.toBeInstanceOf(Error)
        expect(state.isSjaeEnabled).toBeTruthy()
        expect(state.intakeFlowRate).toBe(steamFromTurbine.flow)
        expect(state.deltaWaterVolume).toBeCloseTo(expectedWaterDelta)
        expect(state.hotwellWaterVolume).toBe(
          CstSimulation.CstCondenser.HotwellStartVolume + expectedWaterDelta * testCounter,
        )
        if (testCounter >= testTicks) clearInterval(simulationInterval)
      }, CstSimulation.DeltaTime * 1000) // DeltaTime is in sec
    }
    testTick()
    vi.runAllTimers()
  })
  it(`Convert for ${String(testTicks)} Ticks steam to water with a turbine valve at 100% and condensation pump 100% running`, () => {
    const turbineValvePosition = 100
    // open turbine valve
    const boilerStateTurbineValve: BoilerState = {
      ...initialPowerPlantState.Boiler,
      turbineValvePosition,
      mainSteamValve: true,
      steamMass: 50, // kg
    }
    // get turbine steam intake from turbine valve position
    const boilerSteamRemovedState = BoilerRemoveSteam(boilerStateTurbineValve, "TURBINE")
    const { turbineSteamFlowOut } = boilerSteamRemovedState
    // expect complete conversion of steam to water
    const expectedWaterDelta = turbineSteamFlowOut * CstSimulation.DeltaTime

    const boilerPressure = 100 // bar, must be above MSV opening
    let state = { ...initialState }
    // For simplicity, use turbine steam as the sole input.
    const steamFromTurbine = {
      flow: turbineSteamFlowOut,
      temp: CstSimulation.CstTurbine.steamOutflowTemperature,
      pressure: CstSimulation.CstTurbine.steamOutflowPressure,
    }
    const steamFromBypass = { flow: 0, temp: 300 }

    // condensate pump at 100 %
    state.condensationPumpValvePosition = 1
    const expectedCondensationFlow = CstSimulation.CstCondenser.CondensationPump_MaxFlowRate

    let testCounter = 0
    const testTick = () => {
      const simulationInterval = setInterval(() => {
        testCounter++
        state = CondenserTick(state, boilerPressure, steamFromBypass, steamFromTurbine)

        expect(state.returnRate).toBe(expectedCondensationFlow)

        expect(state.hotwellWaterVolume).toBe(
          CstSimulation.CstCondenser.HotwellStartVolume +
            expectedWaterDelta * testCounter -
            state.returnRate * testCounter,
        )
        if (testCounter >= testTicks) clearInterval(simulationInterval)
      }, CstSimulation.DeltaTime * 1000) // DeltaTime is in sec
    }
    testTick()
    vi.runAllTimers()
  })
})
