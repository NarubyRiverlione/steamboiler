import { describe, it, expect } from "vitest"
import TurbineTick from "./TurbineTick"
import { TurbineState } from "../PowerPlantState"

import { CstSimulation } from "../const"

describe("TurbineTick", () => {
  const initialState: TurbineState = { electricOutput: 0 }
  const valvePositions = [0, 0.25, 0.5, 0.75, 1]
  valvePositions.forEach((position) => {
    const steamFlow = position * CstSimulation.CstBoiler.MaxSteamRemovalRate
    const expectPower = CstSimulation.CstTurbine.steamToElectricityEfficiency * steamFlow
    it(`should create ${String(expectPower)} MW based on ${String(position * 100)}% turbine Valve Position`, () => {
      const newState = TurbineTick(initialState, position)
      expect(newState.electricOutput).toBe(expectPower)
    })
  })
})
