/** Steam Flow group of the Turbine page: the main steam valve with its lamp, and the bypass and turbine valves. */

import { CstSimulation } from "../../context/const"
import { isAboveMainSteamValveMinimum } from "../../utils/turbineCalculations"
import { Lamp } from "../board/Lamp"
import { LensButton } from "../board/LensButton"
import { ValveControl } from "../board/ValveControl"
import type { TurbineState } from "./types"

const {
  CstTurbine: { BypassValveStep, TurbineValveStep, MainSteamValveMinimumPressure },
} = CstSimulation

type SteamFlowGroupProps = {
  readonly turbine: TurbineState
  readonly boilerPressure: number
  readonly onToggleMainSteamValve: () => void
  readonly onAdjustBypass: (step: number) => void
  readonly onAdjustTurbine: (step: number) => void
}

export function SteamFlowGroup({
  turbine,
  boilerPressure,
  onToggleMainSteamValve,
  onAdjustBypass,
  onAdjustTurbine,
}: SteamFlowGroupProps) {
  return (
    <div className="board-group board-group-left">
      <h3 className="board-group-title">Steam Flow</h3>
      <span className="board-readout-label">Main steam valve</span>
      <div className="board-group-row" role="group" aria-label="Main steam valve">
        <LensButton pressed={turbine.mainSteamValve} onClick={onToggleMainSteamValve} widest="Closed">
          {turbine.mainSteamValve ? "Open" : "Closed"}
        </LensButton>
        <Lamp
          lit={!isAboveMainSteamValveMinimum(boilerPressure)}
          label="Opening not possible"
          title={`Main Steam Valve can only be opened if pressure is greater then ${(MainSteamValveMinimumPressure / 10).toFixed(1)} Mpa - ${MainSteamValveMinimumPressure.toFixed(0)} bar`}
        />
      </div>
      <div className="board-group-cols">
        <ValveControl
          Label="Bypass valve"
          Value={`${turbine.bypassSteamFlowOut.toFixed(1)} kg/s`}
          ValueWidest="999.9 kg/s"
          Position={turbine.bypassValvePosition}
          Step={BypassValveStep}
          cbAdjust={onAdjustBypass}
        />
        <ValveControl
          Label="Turbine valve"
          Value={`${turbine.turbineSteamFlowOut.toFixed(1)} kg/s`}
          ValueWidest="999.9 kg/s"
          Position={turbine.turbineValvePosition}
          Step={TurbineValveStep}
          cbAdjust={onAdjustTurbine}
        />
      </div>
    </div>
  )
}
