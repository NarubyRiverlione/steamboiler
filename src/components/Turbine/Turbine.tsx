/** The Turbine page on the board: RPM dial with the sync LED, steam valves, speed mode, run-up point, generator breaker, load, status readouts. */

import { useState } from "react"
import usePowerPlant from "../../context/PowerPlantContext"
import { CstSimulation } from "../../context/const"
import type { SpeedMode } from "../../context/PowerPlantState"
import {
  isAboveMainSteamValveMinimum,
  isAtSyncSpeed,
  loadSetpointRefusal,
  runUpPointRefusal,
  speedModeRefusal,
} from "../../utils/turbineCalculations"
import useEMA from "../../utils/useEMA"
import { Display } from "../board/Display"
import { Lamp } from "../board/Lamp"
import { LensButton } from "../board/LensButton"
import { PanelFrame } from "../board/PanelFrame"
import { RoundGauge, type GaugeZone } from "../board/RoundGauge"
import { ValveControl } from "../board/ValveControl"

const {
  CstTurbine: {
    BypassValveStep,
    TurbineValveStep,
    MainSteamValveMinimumPressure,
    SyncRPM,
    MaxRPM,
    BreakerRPMMargin,
    RunUpPoints,
    LoadSetpointLimit,
  },
} = CstSimulation

const MIN_SYNC: number = SyncRPM - BreakerRPMMargin
const MAX_SYNC: number = SyncRPM + BreakerRPMMargin
const RPM_WARN: number = SyncRPM * 1.05 // dial turns orange above this
const RPM_ZONES: readonly GaugeZone[] = [
  { from: 0, to: RPM_WARN, tone: "ok" },
  { from: RPM_WARN, to: MaxRPM, tone: "warn" },
]
const MODES: readonly { mode: SpeedMode; label: string }[] = [
  { mode: "free", label: "Free" },
  { mode: "rampUp", label: "Ramp up" },
  { mode: "hold", label: "Hold" },
]
const MODE_LABELS: Record<SpeedMode, string> = { free: "FREE", rampUp: "RAMP UP", hold: "HOLD" }

function Turbine() {
  const {
    state: {
      Boiler: { pressure },
      Turbine,
    },
    toggleMainSteamValve,
    adjustBypassValve,
    adjustTurbineValve,
    setSpeedMode,
    selectRunUpPoint,
    toggleGeneratorBreaker,
    setLoadSetpoint,
  } = usePowerPlant()
  const {
    mainSteamValve,
    bypassValvePosition,
    bypassSteamFlowOut,
    turbineValvePosition,
    turbineSteamFlowOut,
    electricOutput,
    loadSetpoint,
    rpm,
    runUpPoint,
    speedMode,
    generatorBreaker,
    turbineTripped,
  } = Turbine

  const [draft, setDraft] = useState<string>("")
  const smoothFlow: number = useEMA(turbineSteamFlowOut, 0.05)
  const inSync: boolean = isAtSyncSpeed(rpm)
  const loadRefusal: string | undefined = loadSetpointRefusal(Turbine)

  // The field shows the setpoint while it is not being typed in
  const applyLoad = (): void => {
    const value = Number(draft)
    if (draft !== "" && Number.isFinite(value)) setLoadSetpoint(value)
    setDraft("")
  }

  return (
    <PanelFrame title="Turbine">
      <div className="board-boiler-main">
        <div className="board-instrument">
          <span className="board-instrument-label">Speed</span>
          <RoundGauge
            label="Speed gauge"
            unit="RPM"
            value={rpm}
            min={0}
            max={MaxRPM}
            major={500}
            minor={100}
            zones={RPM_ZONES}
          />
          <Display label="Turbine speed" text={`${rpm.toFixed(0)} RPM`} />
          <Lamp
            lit={inSync}
            label="In sync band"
            title={`Breaker can be closed between ${MIN_SYNC.toFixed(0)} and ${MAX_SYNC.toFixed(0)} RPM`}
          />
        </div>

        <div className="board-instrument">
          <h3 className="board-group-title">Speed Control</h3>
          <span className="board-readout-label">Speed mode</span>
          <div className="board-lens-row">
            {MODES.map(({ mode, label }) => {
              const refusal: string | undefined = speedModeRefusal(Turbine, mode)
              return (
                <LensButton
                  key={mode}
                  pressed={speedMode === mode}
                  disabled={refusal !== undefined}
                  title={refusal}
                  onClick={() => {
                    setSpeedMode(mode)
                  }}
                >
                  {label}
                </LensButton>
              )
            })}
          </div>
          <span className="board-readout-label">Run-up point</span>
          <div className="board-lens-row">
            {RunUpPoints.map((point: number) => {
              const refusal: string | undefined = runUpPointRefusal(Turbine, point)
              return (
                <LensButton
                  key={point}
                  small
                  pressed={runUpPoint === point}
                  disabled={refusal !== undefined}
                  title={refusal}
                  onClick={() => {
                    selectRunUpPoint(point)
                  }}
                >
                  {point} rpm
                </LensButton>
              )
            })}
          </div>
        </div>

        <div className="board-instrument">
          <h3 className="board-group-title">Generator</h3>
          <span className="board-readout-label">Generator breaker</span>
          <LensButton
            pressed={generatorBreaker}
            disabled={!generatorBreaker && !inSync}
            onClick={toggleGeneratorBreaker}
          >
            {generatorBreaker ? "BREAKER CLOSED" : "BREAKER OPEN"}
          </LensButton>
          {!generatorBreaker && !inSync && (
            <p className="board-note">
              Breaker can only be closed when RPM is between {MIN_SYNC.toFixed(0)} and {MAX_SYNC.toFixed(0)}.
              Current RPM: {rpm.toFixed(0)}
            </p>
          )}
          <label className="board-readout-label" htmlFor="turbine-load-setpoint">
            Load setpoint (MW)
          </label>
          <input
            id="turbine-load-setpoint"
            className="board-input"
            type="number"
            min={0}
            max={LoadSetpointLimit}
            step={1}
            value={draft === "" ? loadSetpoint.toFixed(1) : draft}
            disabled={loadRefusal !== undefined}
            title={loadRefusal}
            onChange={(event) => {
              setDraft(event.target.value)
            }}
            onBlur={applyLoad}
            onKeyDown={(event) => {
              if (event.key === "Enter") applyLoad()
            }}
          />
          {loadRefusal !== undefined && <p className="board-note">{loadRefusal}</p>}
        </div>
      </div>

      <h3 className="board-group-title board-section">Steam Flow</h3>
      <div className="board-valves">
        <div className="board-instrument">
          <span className="board-readout-label">Main steam valve</span>
          <LensButton pressed={mainSteamValve} onClick={toggleMainSteamValve}>
            {mainSteamValve ? "MSV OPEN" : "MSV CLOSED"}
          </LensButton>
          <Lamp
            lit={!isAboveMainSteamValveMinimum(pressure)}
            label="Opening not possible"
            title={`Main Steam Valve can only be opened if pressure is greater then ${(MainSteamValveMinimumPressure / 10).toFixed(1)} Mpa - ${MainSteamValveMinimumPressure.toFixed(0)} bar`}
          />
        </div>
        <div>
          <ValveControl
            Label="Bypass valve"
            Value={`${bypassSteamFlowOut.toFixed(1)} kg/s`}
            Position={bypassValvePosition}
            Step={BypassValveStep}
            cbAdjust={adjustBypassValve}
          />
          <ValveControl
            Label="Turbine valve"
            Position={turbineValvePosition}
            Step={TurbineValveStep}
            cbAdjust={adjustTurbineValve}
          />
        </div>
      </div>

      <h3 className="board-group-title board-section">Turbine Status</h3>
      <div className="board-readouts">
        <div className="board-readout">
          <span>Steam flow</span>
          <Display label="Steam flow" text={`${smoothFlow.toFixed(1)} kg/s`} />
        </div>
        <div className="board-readout">
          <span>Generator load</span>
          <Display label="Generator load" text={`${electricOutput.toFixed(1)} MW`} />
        </div>
        <div className="board-readout">
          <span>Load setpoint</span>
          <Display label="Load setpoint" text={`${loadSetpoint.toFixed(1)} MW`} />
        </div>
        <div className="board-readout">
          <span>Run-up point</span>
          <Display label="Run-up point" text={`${runUpPoint.toFixed(0)} RPM`} />
        </div>
        <div className="board-readout">
          <span>Mode</span>
          <Display label="Speed mode" text={MODE_LABELS[speedMode]} />
        </div>
        <div className="board-readout">
          <span>Breaker</span>
          <Display label="Breaker" text={generatorBreaker ? "CLOSED" : "OPEN"} />
        </div>
        <div className="board-readout">
          <span>Turbine trip</span>
          <Lamp
            lit={turbineTripped}
            label="Turbine trip"
            title="Turbine tripped: condenser pressure rose above the vacuum limit, or the main steam valve closed on low boiler pressure"
          />
        </div>
      </div>
    </PanelFrame>
  )
}

export default Turbine
