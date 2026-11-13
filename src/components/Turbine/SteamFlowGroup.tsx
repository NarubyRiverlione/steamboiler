/** Steam Flow group of the Turbine page: the main steam valve with its lamp, and the bypass and turbine valves. */

import { CstSimulation } from "../../context/const"
import { isAboveMainSteamValveMinimum } from "../../utils/turbineCalculations"
import { Lamp } from "../board/Lamp"
import { TurnSwitch } from "../board/TurnSwitch"
import { ValveControl } from "../board/ValveControl"
import type { TurbineState } from "./types"

const {
  CstTurbine: { BypassValveStep, TurbineValveStep, MainSteamValveMinimumPressure },
} = CstSimulation

type SteamFlowGroupProps = {
  readonly turbine: TurbineState
  readonly boilerPressure: number
  readonly onToggleMainSteamValve: () => void
}

export function SteamFlowGroup({
  turbine,
  boilerPressure,
  onToggleMainSteamValve,
}: SteamFlowGroupProps) {
  return (
    <div className="board-group board-group-left">
      <h3 className="board-group-title">Steam Flow</h3>
      <div className="board-group-row" role="group" aria-label="Main steam valve">
        <TurnSwitch
          label="Main steam valve"
          offLabel="CLOSED"
          onLabel="OPEN"
          on={turbine.mainSteamValve}
          onToggle={onToggleMainSteamValve}
        />
        <Lamp
          lit={!isAboveMainSteamValveMinimum(boilerPressure)}
          label="Opening not possible"
          title={`Main Steam Valve can only be opened if pressure is greater then ${(MainSteamValveMinimumPressure / 10).toFixed(1)} Mpa - ${MainSteamValveMinimumPressure.toFixed(0)} bar`}
        />
      </div>
      <span className="board-readout-label">Main steam valve</span>
      <div className="board-group-cols">
        <ValveControl
          ValveId="Bypass valve"
          Label="Bypass valve"
          Value={`${turbine.bypassSteamFlowOut.toFixed(1)} kg/s`}
          ValueWidest="999.9 kg/s"
          Position={turbine.bypassValvePosition}
          Step={BypassValveStep}
        />
        <ValveControl
          ValveId="Turbine valve"
          Label="Turbine valve"
          Value={`${turbine.turbineSteamFlowOut.toFixed(1)} kg/s`}
          ValueWidest="999.9 kg/s"
          Position={turbine.turbineValvePosition}
          Step={TurbineValveStep}
        />
      </div>
    </div>
  )
}
