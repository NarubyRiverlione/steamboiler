/** The Deaerator page on the board: temperature, pressure, saturation pressure, the level instrument, the safe-to-close lamp, the start-up vent control, the warning text (ADR 0038) and the boiler feed pump with its trip lamp (#112). */

import usePowerPlant from "../../context/PowerPlantContext"
import { CstDeaerator, CstSimulation } from "../../context/const"
import useEMA from "../../utils/useEMA"
import { Display } from "../board/Display"
import { Lamp } from "../board/Lamp"
import { LensButton } from "../board/LensButton"
import { LevelInstrument } from "../board/LevelInstrument"
import { PanelFrame } from "../board/PanelFrame"
import { RoundGauge, type GaugeZone } from "../board/RoundGauge"
import { ValveControl } from "../board/ValveControl"
import { warningText } from "./warningText"

const STEAM_SOURCE_MIN_FLOW = 0.5 // kg/s, about 1% of a valve: below it the source lamp stays off
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
        deltaWaterMass,
        startUpVentOpen,
        reliefValveOpen,
        safeToClose,
        warnVentClosedWithAir,
        warnVentOpenNoAir,
        feedPumpValvePosition,
        feedPumpTripped,
        extractionFlow,
        letDownFlow,
      },
    },
    toggleDeaeratorVent,
    adjustFeedPumpValvePosition,
  } = usePowerPlant()

  const level: number = waterVolume / CstDeaerator.TotalVolume
  const smoothWaterChange: number = useEMA(deltaWaterMass / CstSimulation.DeltaTime, 0.5)
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
              <Display
                label="Saturation pressure"
                text={`${saturationPressure.toFixed(2)} bar`}
                widest="9.99 bar"
              />
            </div>
          </div>
        </>
      }
      title="Deaerator"
    >
      <div className="board-condenser-top board-deaerator-top">
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
          <LevelInstrument label="Deaerator level" fraction={level} change={smoothWaterChange} />
        </div>

        <div className="board-group">
          <h3 className="board-group-title">Boiler Feed Pump</h3>
          <ValveControl
            Label="Feed pump"
            Pump
            Caption="Flow rate:"
            Position={feedPumpValvePosition}
            Value={`${(feedPumpValvePosition * CstSimulation.CstCondenser.CondensationPump_MaxFlowRate).toFixed(1)} l/s`}
            ValueWidest="9999.9 l/s"
            Step={CstDeaerator.FeedPump_Step}
            cbAdjust={adjustFeedPumpValvePosition}
          />
          <Lamp
            lit={feedPumpTripped}
            label="Feed pump trip"
            title="The deaerator level fell below low-low: open the pump again once the level is back"
          />
        </div>

        <div className="board-deaerator-side">
          <div className="board-group board-group-plain">
            <h3 className="board-group-title">Vents</h3>
            <div className="board-group-cols">
              <div className="board-instrument">
                <span className="board-readout-label">Start-up vent</span>
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
              <div className="board-instrument">
                <span className="board-readout-label">Relief valve</span>
                <Lamp lit={reliefValveOpen} label="Relief open" title="The 4 bar relief valve is lifted" />
              </div>
            </div>
            <p className="board-warning" role="status" aria-label="Deaerator warning">
              {warning}
            </p>
          </div>

          <div className="board-group board-group-plain board-steam-source">
            <h3 className="board-group-title">Steam source</h3>
            <div className="board-group-cols">
              <Lamp
                lit={letDownFlow > STEAM_SOURCE_MIN_FLOW}
                tone="ok"
                label="Boiler"
                title="The let-down valve takes steam from the boiler"
              />
              <Lamp
                lit={extractionFlow > STEAM_SOURCE_MIN_FLOW}
                tone="ok"
                label="Turbine"
                title="The extraction tap takes steam from the turbine"
              />
            </div>
          </div>
        </div>
      </div>
    </PanelFrame>
  )
}

export default Deaerator
