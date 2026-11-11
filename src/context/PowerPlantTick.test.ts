import { describe, expect, test } from "vitest"
import { CstDeaerator, CstHeater, CstPhysics, CstSimulation } from "./const"
import { getWaterSpecificVolume } from "../utils/steamTable"
import { calculateSteamInventory } from "../utils/boilerCalculations"
import PowerPlantState from "./PowerPlantState"
import PowerPlantTick from "./PowerPlantTick"
import { makeInitialState } from "./PowerPlantReducer"
import { makeHotDeaerator } from "./Deaerator/DeaeratorTick"

const { CstBoiler } = CstSimulation
const cold = makeInitialState()
const { AmbientTemperature } = CstPhysics
const litresPerKg: number = getWaterSpecificVolume(AmbientTemperature)

// A plant at ambient holding this much water (litres) in the boiler and hotwell, the condensation pump full open
const pumping = (boilerLitres: number, hotwellLitres = cold.Condenser.hotwellWaterVolume): PowerPlantState => ({
  ...cold,
  Boiler: {
    ...cold.Boiler,
    waterMass: boilerLitres / litresPerKg,
    waterVolume: boilerLitres,
    steamMass: calculateSteamInventory(AmbientTemperature, boilerLitres), // in equilibrium with the steam space
  },
  Condenser: {
    ...cold.Condenser,
    hotwellWaterMass: hotwellLitres / litresPerKg,
    hotwellWaterVolume: hotwellLitres,
    condensationPumpValvePosition: 1,
  },
})

describe("PowerPlantTick economizer (ADR 0029)", () => {
  // Full gas on a boiler at 350 °C, a hot deaerator at its working level and the feed pump at this position: the economizer
  // takes the flow the feed pump gives this tick, at the temperature of the deaerator, and the boiler reports what it did
  const hot = (pump: number): PowerPlantState => {
    const start = pumping(50_000)
    return {
      ...start,
      Boiler: { ...start.Boiler, temperature: 350, gasFlow: CstBoiler.MaxGasFlow },
      Deaerator: { ...makeHotDeaerator(CstDeaerator.TotalVolume / 2), feedPumpValvePosition: pump },
    }
  }

  test("heats the feedwater of the tick with the flue gas and reports the stack", () => {
    const next = PowerPlantTick(hot(1))
    // the feed pump gives 300 l/s: the more water, the cooler the stack and the better the boiler
    const small = PowerPlantTick(hot(0.2))
    expect(next.Boiler.returnTemperatureOut).toBeGreaterThan(next.Deaerator.temperature + 30)
    expect(next.Boiler.stackTemperature).toBeLessThan(small.Boiler.stackTemperature)
    expect(next.Boiler.boilerEfficiency).toBeGreaterThan(small.Boiler.boilerEfficiency)
  })

  test("with the feed pump shut nothing is recovered", () => {
    const next = PowerPlantTick(hot(0))
    expect(next.Deaerator.outflowMass).toBe(0)
    expect(next.Boiler.returnTemperatureOut).toBeCloseTo(next.Deaerator.temperature, 6)
    expect(next.Boiler.boilerEfficiency).toBeCloseTo(0.79, 1)
  })
})

describe("PowerPlantTick return", () => {
  // The condensation pump full open from a hotwell with this much water (litres) into a deaerator holding this much
  const returning = (deaeratorLitres: number, hotwellLitres = 10_000): PowerPlantState => {
    const start = pumping(50_000, hotwellLitres)
    return { ...start, Deaerator: makeHotDeaerator(deaeratorLitres) }
  }

  test("the deaerator receives the return in the same tick the hotwell gives it", () => {
    // full pump: 300 l/s for one 0.1 s tick = 30 L = 29.946 kg at 20 °C
    const start = returning(CstDeaerator.TotalVolume / 2)
    const next = PowerPlantTick(start)
    expect(next.Condenser.returnRate).toBeCloseTo(30 / litresPerKg, 6)
    expect(next.Condenser.hotwellWaterMass).toBeCloseTo(start.Condenser.hotwellWaterMass - 30 / litresPerKg, 6)
    expect(next.Deaerator.waterMass).toBeGreaterThan(start.Deaerator.waterMass + 29)
    expect(next.Boiler.waterMass).toBeCloseTo(start.Boiler.waterMass, 6) // the feed pump is shut: nothing reaches the boiler
  })

  test("a full deaerator takes no return, the water stays in the hotwell", () => {
    const start = returning(CstDeaerator.TotalVolume)
    const next = PowerPlantTick(start)
    expect(next.Condenser.returnRate).toBe(0)
    expect(next.Condenser.hotwellWaterMass).toBe(start.Condenser.hotwellWaterMass)
  })

  test("an empty hotwell returns nothing", () => {
    const next = PowerPlantTick(returning(CstDeaerator.TotalVolume / 2, 0))
    expect(next.Condenser.returnRate).toBe(0)
  })
})

describe("PowerPlantTick boiler feed pump (#112)", () => {
  // The feed pump full open from a hot deaerator at its working level into a boiler holding this much water (litres)
  const feeding = (boilerLitres: number, boilerTemperature = AmbientTemperature): PowerPlantState => {
    const start = pumping(boilerLitres)
    return {
      ...start,
      Boiler: {
        ...start.Boiler,
        temperature: boilerTemperature,
        waterMass: boilerLitres / getWaterSpecificVolume(boilerTemperature),
        steamMass: calculateSteamInventory(boilerTemperature, boilerLitres),
      },
      Condenser: { ...start.Condenser, condensationPumpValvePosition: 0 },
      Deaerator: { ...makeHotDeaerator(CstDeaerator.TotalVolume / 2), feedPumpValvePosition: 1 },
    }
  }

  test("takes water from the deaerator and delivers it to the boiler, at the deaerator temperature", () => {
    const start = feeding(50_000)
    const next = PowerPlantTick(start)
    expect(next.Deaerator.outflowMass).toBeGreaterThan(0)
    expect(next.Deaerator.waterMass).toBeCloseTo(start.Deaerator.waterMass - next.Deaerator.outflowMass, 1)
    expect(next.Boiler.waterMass).toBeCloseTo(start.Boiler.waterMass + next.Deaerator.outflowMass, 2)
  })

  test("a full boiler takes nothing, the water stays in the deaerator", () => {
    const next = PowerPlantTick(feeding(CstBoiler.TotalVolume))
    expect(next.Deaerator.outflowMass).toBe(0)
    expect(next.Boiler.waterVolume).toBeCloseTo(CstBoiler.TotalVolume, 2)
  })

  test("a nearly full boiler is filled to capacity, not past it", () => {
    const next = PowerPlantTick(feeding(CstBoiler.TotalVolume - 5))
    expect(next.Deaerator.outflowMass).toBeCloseTo(5 / litresPerKg, 6)
    expect(next.Boiler.waterVolume).toBeCloseTo(CstBoiler.TotalVolume, 0) // hot feedwater takes a little more room in a cold boiler
  })

  test("a hot boiler has less room: the same free volume takes fewer kg", () => {
    const next = PowerPlantTick(feeding(CstBoiler.TotalVolume - 5, 300))
    expect(next.Deaerator.outflowMass).toBeCloseTo(5 / getWaterSpecificVolume(300), 4)
  })

  test("trips below the low-low level and delivers nothing", () => {
    const start = feeding(50_000)
    const low: PowerPlantState = { ...start, Deaerator: { ...makeHotDeaerator(CstDeaerator.TotalVolume * (CstDeaerator.LowLowLevel - 0.01)), feedPumpValvePosition: 1 } }
    const next = PowerPlantTick(low)
    expect(next.Deaerator.feedPumpTripped).toBe(true)
    expect(next.Deaerator.feedPumpValvePosition).toBe(0)
    expect(next.Deaerator.outflowMass).toBe(0)
  })
})

describe("PowerPlantTick dry boiler", () => {
  test("makes no steam from water that is not there", () => {
    const dry: PowerPlantState = {
      ...cold,
      Boiler: { ...cold.Boiler, waterMass: 0, waterVolume: 0, steamMass: 0, temperature: 100, gasFlow: CstBoiler.MaxGasFlow },
    }
    const next = PowerPlantTick(dry)
    expect(next.Boiler.deltaSteamMass).toBe(0)
    expect(next.Boiler.steamMass).toBe(0)
    expect(next.Boiler.waterMass).toBe(0)
  })
})

describe("PowerPlantTick turbine exhaust", () => {
  test("the condenser receives the steam through the turbine valve in the same tick", () => {
    // 5% of 200 kg/s at working pressure for one 0.1 s tick = 1 kg; recirculation off so none of it condenses
    const turbineOpen: PowerPlantState = {
      ...cold,
      Boiler: { ...cold.Boiler, pressure: 165, steamMass: 1_000 },
      Turbine: { ...cold.Turbine, mainSteamValve: true, turbineValvePosition: 0.05, turbineSteamFlowOut: 0 },
      Condenser: { ...cold.Condenser, recirculationPumpValvePosition: 0 },
    }
    const next = PowerPlantTick(turbineOpen)
    expect(next.Turbine.turbineSteamFlowOut).toBeCloseTo(10, 9)
    expect(next.Condenser.intakeFlowRate).toBeCloseTo(10, 9)
  })

  // 1 kg as above; at sync speed 165 bar to 100 mbar leaves about two-thirds vapour, the moisture goes to the hotwell.
  // The cooling water runs, so the pressure is where the exchanger takes the heat of what is left to condense
  const exhaustAt = (rpm: number): PowerPlantState => ({
    ...cold,
    Boiler: { ...cold.Boiler, steamMass: 1_000, pressure: 165 },
    Turbine: { ...cold.Turbine, mainSteamValve: true, turbineValvePosition: 0.05, turbineSteamFlowOut: 0, rpm },
    Condenser: { ...cold.Condenser, airMass: 0.05, pressure: 100, recirculationPumpValvePosition: 0.02 },
  })

  test("the exhaust splits by its quality: all of it reaches the hotwell, and its moisture costs the cooling water nothing", () => {
    const sync = PowerPlantTick(exhaustAt(CstSimulation.CstTurbine.SyncRPM))
    expect(sync.Condenser.intakeFlowRate).toBeCloseTo(10, 9)
    expect(sync.Condenser.condensationRate).toBeCloseTo(10, 2)
    expect(sync.Condenser.ventedTotal).toBeCloseTo(0, 3)
    // Dry steam of the same flow loads the cooling water more, so the pressure is higher
    expect(sync.Condenser.pressure).toBeLessThan(PowerPlantTick(exhaustAt(0)).Condenser.pressure)
  })

  test("during run-up the exhaust is drier than at sync speed: more heat, a higher pressure", () => {
    const runUp = PowerPlantTick(exhaustAt(1500)).Condenser.pressure
    expect(runUp).toBeGreaterThan(PowerPlantTick(exhaustAt(CstSimulation.CstTurbine.SyncRPM)).Condenser.pressure)
    expect(runUp).toBeLessThanOrEqual(PowerPlantTick(exhaustAt(0)).Condenser.pressure)
  })

  test("at standstill the exhaust behaves like bypass steam: same enthalpy, the same pressure", () => {
    // The shaft takes no work: 165 bar saturated vapour comes out at its own enthalpy
    const standstill = PowerPlantTick(exhaustAt(0))
    const bypass = PowerPlantTick({
      ...exhaustAt(0),
      Turbine: { ...exhaustAt(0).Turbine, turbineValvePosition: 0, bypassValvePosition: 0.05 },
    })
    expect(standstill.Condenser.pressure).toBeCloseTo(bypass.Condenser.pressure, 6)
  })
})

describe("PowerPlantTick relief valve", () => {
  // At 178 bar with the main steam valve closed, as after a heat-up with everything shut
  const atLift: PowerPlantState = {
    ...cold,
    Boiler: { ...cold.Boiler, temperature: 356, pressure: 178, steamMass: 8000, waterMass: 37_600 / getWaterSpecificVolume(356), waterVolume: 37_600 },
  }

  test("vents to the atmosphere with the main steam valve closed", () => {
    const next = PowerPlantTick(atLift)
    expect(next.Boiler.reliefValveOpen).toBe(true)
    expect(next.Boiler.ventedTotal).toBeGreaterThan(0)
    expect(next.Boiler.reliefLifts).toBe(1)
  })

  test("vented steam never reaches the condenser", () => {
    const next = PowerPlantTick(atLift)
    expect(next.Condenser.intakeFlowRate).toBe(0)
    expect(next.Condenser.ventedTotal).toBe(0)
  })
})

describe("PowerPlantTick turbine trip", () => {
  const running = (condenserPressure: number): PowerPlantState => ({
    ...cold,
    Boiler: { ...cold.Boiler, pressure: 50 },
    Condenser: { ...cold.Condenser, pressure: condenserPressure },
    Turbine: { ...cold.Turbine, mainSteamValve: true, turbineValvePosition: 0.3 },
  })

  test("the turbine trips on the condenser pressure going into the tick", () => {
    const next = PowerPlantTick(running(CstSimulation.CstCondenser.VacuumLimit + 1))
    expect(next.Turbine.turbineValvePosition).toBe(0)
    expect(next.Turbine.turbineTripped).toBe(true)
  })

  test("under vacuum the turbine keeps its valve", () => {
    const next = PowerPlantTick(running(CstSimulation.CstCondenser.VacuumLimit))
    expect(next.Turbine.turbineValvePosition).toBe(0.3)
    expect(next.Turbine.turbineTripped).toBe(false)
  })
})

describe("PowerPlantTick burner trip", () => {
  // A burning plant holding this much water (litres) in the boiler
  const burning = (boilerLitres: number): PowerPlantState => {
    const plant: PowerPlantState = pumping(boilerLitres, 0)
    return { ...plant, Boiler: { ...plant.Boiler, gasFlow: CstBoiler.MaxGasFlow } }
  }
  const litresAtLevel = (level: number): number => CstBoiler.TotalVolume * level

  test("the gas goes to 0 and the trip is set when the water is below the burner low-low level", () => {
    const next = PowerPlantTick(burning(litresAtLevel(CstBoiler.BurnerLowLowLevel) - 1))
    expect(next.Boiler.gasFlow).toBe(0)
    expect(next.Boiler.burnerTripped).toBe(true)
  })

  test("the gas keeps burning at the burner low-low level", () => {
    const next = PowerPlantTick(burning(litresAtLevel(CstBoiler.BurnerLowLowLevel)))
    expect(next.Boiler.gasFlow).toBe(CstBoiler.MaxGasFlow)
    expect(next.Boiler.burnerTripped).toBe(false)
  })

  test("after a trip the gas stays 0 and the flag stays set, also once the water is back above the level", () => {
    let state: PowerPlantState = PowerPlantTick(burning(litresAtLevel(CstBoiler.BurnerLowLowLevel) - 1))
    state = { ...state, Boiler: { ...state.Boiler, waterVolume: litresAtLevel(CstBoiler.BurnerLowLowLevel) + 1000 } }
    for (let i = 0; i < 10; i++) state = PowerPlantTick(state)
    expect(state.Boiler.gasFlow).toBe(0)
    expect(state.Boiler.burnerTripped).toBe(true)
  })

  test("a drained boiler trips the burner", () => {
    const nearLow: PowerPlantState = burning(litresAtLevel(CstBoiler.BurnerLowLowLevel) + 100)
    let state: PowerPlantState = { ...nearLow, Boiler: { ...nearLow.Boiler, drainValveOpen: true } }
    for (let i = 0; i < 100 && !state.Boiler.burnerTripped; i++) state = PowerPlantTick(state)
    expect(state.Boiler.burnerTripped).toBe(true)
    expect(state.Boiler.gasFlow).toBe(0)
  })
})

describe("PowerPlantTick low-pressure closure", () => {
  const min = CstSimulation.CstTurbine.MainSteamValveMinimumPressure
  // Under vacuum, so a trip here can only come from the closure and not from the vacuum limit
  const open = (pressure: number, turbine: Partial<PowerPlantState["Turbine"]>): PowerPlantState => ({
    ...cold,
    Boiler: { ...cold.Boiler, pressure, steamMass: 1_000 },
    Condenser: {
      ...cold.Condenser,
      pressure: CstSimulation.CstCondenser.VacuumLimit,
      recirculationPumpValvePosition: 0,
    },
    Turbine: { ...cold.Turbine, mainSteamValve: true, ...turbine },
  })

  test("at the limit the main steam valve closes on that tick and no steam leaves in it", () => {
    const next = PowerPlantTick(open(min, { bypassValvePosition: 1, turbineValvePosition: 0.5 }))
    expect(next.Turbine.mainSteamValve).toBe(false)
    expect(next.Turbine.bypassSteamFlowOut).toBe(0)
    expect(next.Turbine.turbineSteamFlowOut).toBe(0)
    expect(next.Condenser.intakeFlowRate).toBe(0)
  })

  test("above the limit the valve stays open and steam flows", () => {
    const next = PowerPlantTick(open(min + 0.01, { bypassValvePosition: 1 }))
    expect(next.Turbine.mainSteamValve).toBe(true)
    expect(next.Turbine.bypassSteamFlowOut).toBeGreaterThan(10)
  })

  test("with the turbine valve open the closure is a turbine trip", () => {
    const next = PowerPlantTick(open(min, { turbineValvePosition: 0.5, speedMode: "hold", pidIntegralError: 3 }))
    expect(next.Turbine.turbineValvePosition).toBe(0)
    expect(next.Turbine.speedMode).toBe("free")
    expect(next.Turbine.pidIntegralError).toBe(0)
    expect(next.Turbine.turbineTripped).toBe(true)
  })

  test("the trip indicator stays set on the ticks after the closure", () => {
    const next = PowerPlantTick(PowerPlantTick(open(min, { turbineValvePosition: 0.5, speedMode: "hold" })))
    expect(next.Turbine.turbineTripped).toBe(true)
    expect(next.Turbine.mainSteamValve).toBe(false)
  })

  test("with the turbine valve shut only the main steam valve closes", () => {
    const next = PowerPlantTick(open(min, { bypassValvePosition: 0.3, speedMode: "rampUp" }))
    expect(next.Turbine.mainSteamValve).toBe(false)
    expect(next.Turbine.turbineTripped).toBe(false)
    expect(next.Turbine.speedMode).toBe("rampUp")
    expect(next.Turbine.bypassValvePosition).toBe(0.3)
  })

  test("a closed valve at low pressure sets no trip", () => {
    const next = PowerPlantTick(open(min, { mainSteamValve: false, turbineValvePosition: 0.5, speedMode: "hold" }))
    expect(next.Turbine.turbineTripped).toBe(false)
    expect(next.Turbine.turbineValvePosition).toBe(0.5)
  })

  test("boiler loss, reported flow and condenser intake match at a pressure below the rating", () => {
    const state = open(100, { bypassValvePosition: 0.5, turbineValvePosition: 0.25 })
    const next = PowerPlantTick({ ...state, Boiler: { ...state.Boiler, temperature: 311 } })
    const flow = next.Turbine.bypassSteamFlowOut + next.Turbine.turbineSteamFlowOut
    expect(flow).toBeCloseTo(0.75 * 109, 0)
    expect(next.Condenser.intakeFlowRate).toBeCloseTo(flow, 9)
  })
})

describe("PowerPlantTick extraction heater (ADR 0031)", () => {
  const { RatedSteamFlow, SyncRPM } = CstSimulation.CstTurbine
  // A hot plant at sync speed with the turbine passing about the rated flow and a Return flowing from a warm hotwell
  // The deaerator is hot at its 3 bar setpoint and passes the Return plus about 40 kg/s of steam and drain on to the heater
  const running = (turbineFlow: number, returnRate: number): PowerPlantState => ({
    ...cold,
    Deaerator: {
      ...makeHotDeaerator(75_000),
      waterMass: 70_000,
      tapDemand: 35,
      outflowMass: returnRate > 0 ? (returnRate + 40) * CstSimulation.DeltaTime : 0,
      feedPumpValvePosition: returnRate > 0 ? 0.65 : 0, // about 180 kg/s at 134 °C
    },
    Boiler: {
      ...cold.Boiler,
      temperature: 350,
      pressure: 165,
      steamMass: 5_000,
      waterMass: 40_000,
      waterVolume: 50_000 * 0.8,
      gasFlow: 0,
    },
    Turbine: {
      ...cold.Turbine,
      mainSteamValve: true,
      turbineValvePosition: turbineFlow / 200,
      turbineSteamFlowOut: turbineFlow,
      rpm: SyncRPM,
    },
    Condenser: {
      ...cold.Condenser,
      pressure: 31,
      hotwellTemperature: 25,
      hotwellWaterMass: 30_000,
      hotwellWaterVolume: 30_000,
      returnRate: returnRate * CstSimulation.DeltaTime,
      recirculationPumpValvePosition: 1,
      condensationPumpValvePosition: 0.5,
    },
  })

  test("a plant at rest extracts nothing and sends the hotwell temperature to the economizer", () => {
    const next = PowerPlantTick(cold)
    expect(next.Heater.extractionFlow).toBe(0)
    expect(next.Heater.returnTemperature).toBe(next.Condenser.hotwellTemperature)
  })

  test("with no Return there is no extraction, even with the turbine running", () => {
    expect(PowerPlantTick(running(RatedSteamFlow, 0)).Heater.extractionFlow).toBe(0)
  })

  test("with the turbine stopped there is no extraction, even with a Return", () => {
    expect(PowerPlantTick(running(0, 100)).Heater.extractionFlow).toBe(0)
  })

  test("at the rated flow the heater takes steam, the tap is at its rated pressure and the Return is heated to about 150 °C", () => {
    const next = PowerPlantTick(running(RatedSteamFlow, 140))
    // the heater only takes the water on from the deaerator (about 134 °C) to its own saturation
    expect(next.Heater.extractionFlow).toBeGreaterThan(5)
    expect(next.Heater.tapPressure).toBeCloseTo(CstHeater.TapPressureAtRated, 1)
    expect(next.Heater.heaterPressure).toBeCloseTo(next.Heater.tapPressure * (1 - CstHeater.LineDrop), 6)
    expect(next.Heater.returnTemperature).toBeGreaterThan(138)
    expect(next.Heater.returnTemperature).toBeLessThan(152)
  })

  test("water is conserved across the turbine, heater and Return in one tick", () => {
    const start = running(RatedSteamFlow, 140)
    const next = PowerPlantTick(start)
    const water = (s: PowerPlantState): number =>
      s.Boiler.waterMass + s.Boiler.steamMass + s.Condenser.hotwellWaterMass + s.Deaerator.waterMass + s.Condenser.ventedTotal + s.Deaerator.ventedTotal
    expect(water(next) - water(start)).toBeCloseTo(
      next.Condenser.makeupTotal - start.Condenser.makeupTotal - (next.Condenser.rejectTotal - start.Condenser.rejectTotal),
      6,
    )
  })

  test("the heater drain cascades into the deaerator and the boiler gets the deaerator outflow", () => {
    const start = running(RatedSteamFlow, 140)
    const next = PowerPlantTick(start)
    const steamLeft: number =
      (next.Turbine.turbineSteamFlowOut + next.Turbine.bypassSteamFlowOut + next.Deaerator.letDownFlow) * CstSimulation.DeltaTime
    // flash exchanges water and steam inside the boiler, so test through the whole plant balance of water in the boiler
    const gained: number =
      next.Boiler.waterMass + next.Boiler.steamMass - (start.Boiler.waterMass + start.Boiler.steamMass) + steamLeft
    expect(gained).toBeCloseTo(next.Deaerator.outflowMass, 6)
    const steam: number = (next.Deaerator.extractionFlow + next.Deaerator.letDownFlow) * CstSimulation.DeltaTime
    const drain: number = next.Heater.extractionFlow * CstSimulation.DeltaTime
    expect(next.Deaerator.waterMass + next.Deaerator.outflowMass).toBeCloseTo(
      start.Deaerator.waterMass + next.Condenser.returnRate + drain + steam - (next.Deaerator.ventedTotal - start.Deaerator.ventedTotal),
      6,
    )
  })

  test("the deaerator tap takes steam from the turbine, so the condenser gets less", () => {
    const next = PowerPlantTick(running(RatedSteamFlow, 140))
    expect(next.Deaerator.extractionFlow).toBeGreaterThan(20)
    expect(next.Condenser.intakeFlowRate).toBeCloseTo(
      next.Turbine.turbineSteamFlowOut - next.Heater.extractionFlow - next.Deaerator.extractionFlow,
      9,
    )
  })

  test("with the turbine stopped the let-down valve holds the deaerator from the boiler", () => {
    const next = PowerPlantTick(running(0, 100))
    expect(next.Deaerator.extractionFlow).toBe(0)
    expect(next.Deaerator.letDownFlow).toBeGreaterThan(0)
    expect(next.Deaerator.pressure).toBeCloseTo(CstDeaerator.Pressure, 1)
  })

  test("tap pressure and the Return temperature fall as the turbine flow falls", () => {
    const full = PowerPlantTick(running(RatedSteamFlow, 140))
    const half = PowerPlantTick(running(RatedSteamFlow / 2, 70))
    expect(half.Heater.tapPressure).toBeLessThan(full.Heater.tapPressure)
    expect(half.Heater.returnTemperature).toBeLessThan(full.Heater.returnTemperature)
    expect(half.Heater.returnTemperature).toBeGreaterThanOrEqual(half.Deaerator.temperature)
  })
})
