/** The Deaerator page on the board: temperature, pressure, saturation pressure, level, the safe-to-close lamp, the start-up vent control, the warning text (ADR 0038) and the boiler feed pump with its trip lamp (#112). */

import usePowerPlant from "../../context/PowerPlantContext"
import { CstDeaerator, CstSimulation } from "../../context/const"
import { Display } from "../board/Display"
import { Lamp } from "../board/Lamp"
import { LensButton } from "../board/LensButton"
import { LevelGauge } from "../board/LevelGauge"
import { PanelFrame } from "../board/PanelFrame"
import { RoundGauge, type GaugeZone } from "../board/RoundGauge"
import { ValveControl } from "../board/ValveControl"
import { warningText } from "./warningText"

const PRESSURE_MAX = 5 // bar, top of the dial: the relief valve lifts at 4
const PRESSURE_ZONES: readonly GaugeZone[] = [
  { from: 0, to: CstDeaerator.Pressure * 1.1, tone: "ok" },
  { from: CstDeaerator.Pressure * 1.1, to: CstDeaerator.ReliefPressure, tone: "warn" },
  { from: CstDeaerator.ReliefPressure, to: PRESSURE_MAX, tone: "alarm" },
]

function Deaerator() {
  const {
    state: {
      Deaerator: {
        temperature,
        pressure,
        saturationPressure,
        waterVolume,
        startUpVentOpen,
        reliefValveOpen,
        safeToClose,
        warnVentClosedWithAir,
        warnVentOpenNoAir,
        feedPumpValvePosition,
        feedPumpTripped,
      },
    },
    toggleDeaeratorVent,
    adjustFeedPumpValvePosition,
  } = usePowerPlant()

  const level: number = (waterVolume / CstDeaerator.TotalVolume) * 100
  const warning: string = warningText(warnVentClosedWithAir, warnVentOpenNoAir)

  return (
    <PanelFrame
      status={
        <>
          <h3 className="board-group-title board-section">Deaerator Status</h3>
          <div className="board-readouts">
            <div className="board-readout">
              <span>Temperature</span>
              <Display label="Temperature" text={`${temperature.toFixed(1)} °C`} widest="999.9 °C" />
            </div>
            <div className="board-readout">
              <span>Saturation pressure</span>
              <Display label="Saturation pressure" text={`${saturationPressure.toFixed(2)} bar`} widest="9.99 bar" />
            </div>
            <div className="board-readout">
              <span>Level</span>
              <Display label="Level" text={`${level.toFixed(1)} %`} widest="100.0 %" />
            </div>
            <span className="board-readout-values">
              <Lamp lit={reliefValveOpen} label="Relief open" title="The 4 bar relief valve is lifted" />
            </span>
          </div>
        </>
      }
      title="Deaerator"
    >
      <div className="board-condenser-top">
        <div className="board-cluster">
          <div className="board-instrument">
            <span className="board-instrument-label">Pressure</span>
            <RoundGauge
              label="Pressure gauge"
              unit="bar"
              value={pressure}
              min={0}
              max={PRESSURE_MAX}
              major={1}
              minor={0.5}
              zones={PRESSURE_ZONES}
            />
            <Display label="Pressure" text={`${pressure.toFixed(2)} bar`} widest="9.99 bar" />
          </div>
          <div className="board-instrument">
            <span className="board-instrument-label">Level</span>
            <LevelGauge label="Deaerator level gauge" value={level} />
          </div>
        </div>

        <div className="board-group">
          <h3 className="board-group-title">Start-up Vent</h3>
          <div className="board-group-cols">
            <div className="board-instrument">
              <span className="board-readout-label">Vent to atmosphere</span>
              <LensButton pressed={startUpVentOpen} onClick={toggleDeaeratorVent} widest="CLOSE">
                {startUpVentOpen ? "CLOSE" : "OPEN"}
              </LensButton>
              <Lamp
                lit={safeToClose}
                tone="ok"
                label="Safe to close"
                title="The air is out: the start-up vent can be closed"
              />
            </div>
          </div>
          <p className="board-warning" role="status" aria-label="Deaerator warning">
            {warning}
          </p>
        </div>

        <div className="board-group">
          <h3 className="board-group-title">Boiler Feed Pump</h3>
          <ValveControl
            Label="Feed pump"
            Caption="Flow rate:"
            Position={feedPumpValvePosition}
            Value={`${(feedPumpValvePosition * CstSimulation.CstCondenser.CondensationPump_MaxFlowRate).toFixed(1)} l/s`}
            ValueWidest="9999.9 l/s"
            Step={CstDeaerator.FeedPump_Step}
            cbAdjust={adjustFeedPumpValvePosition}
          />
          <Lamp lit={feedPumpTripped} label="Feed pump trip" title="The deaerator level fell below low-low: open the pump again once the level is back" />
        </div>
      </div>
    </PanelFrame>
  )
}

export default Deaerator
