/** The Condenser page on the board: pressure and hotwell level gauges, vacuum and pump controls, status readouts. */

import usePowerPlant from "../../context/PowerPlantContext"
import { CstSimulation } from "../../context/const"
import useEMA from "../../utils/useEMA"
import { Display } from "../board/Display"
import { Lamp } from "../board/Lamp"
import { LensButton } from "../board/LensButton"
import { LevelGauge } from "../board/LevelGauge"
import { PanelFrame } from "../board/PanelFrame"
import { RoundGauge, type GaugeZone } from "../board/RoundGauge"
import { ValveControl } from "../board/ValveControl"

const {
  CstCondenser: {
    TotalVolume,
    OptimalPressure,
    OptimalPressureBellWidth,
    VacuumLimit,
    SJAE_ValveStep,
    RecirculationPump_Step,
    CondensationPump_Step,
    RecirculationPump_MaxFlowRate,
    Makeup_Step,
    Makeup_MaxFlowRate,
    Reject_Step,
    Reject_MaxFlowRate,
  },
} = CstSimulation

const PRESSURE_MAX = 1100 // mbar, top of the dial: atmospheric (1013) is on the scale, the turbine trips at VacuumLimit
const HIGH_PRESSURE: number = OptimalPressure + OptimalPressureBellWidth
const LOW_PRESSURE: number = OptimalPressure - OptimalPressureBellWidth
const PRESSURE_ZONES: readonly GaugeZone[] = [
  { from: 0, to: LOW_PRESSURE, tone: "warn" },
  { from: LOW_PRESSURE, to: HIGH_PRESSURE, tone: "ok" },
  { from: HIGH_PRESSURE, to: VacuumLimit, tone: "warn" },
  { from: VacuumLimit, to: PRESSURE_MAX, tone: "alarm" },
]

function Condenser() {
  const {
    state: {
      Condenser: {
        isAirExtractionPumpEnabled,
        isSjaeEnabled,
        sjaeValvePosition,
        recirculationPumpValvePosition,
        condensationPumpValvePosition,
        makeupValvePosition,
        rejectValvePosition,
        deltaWaterMass,
        pressure, // mbar
        steamMass,
        hotwellWaterVolume,
        hotwellTemperature,
        returnRate,
        intakeFlowRate,
      },
    },
    toggleAirExtractionPump,
    toggleSjae,
    adjustSjaeValvePosition,
    adjustRecirculationPumpValvePosition,
    adjustCondensationPumpValvePosition,
    adjustMakeupValvePosition,
    adjustRejectValvePosition,
  } = usePowerPlant()

  const smoothIntake: number = useEMA(intakeFlowRate, 0.01)
  const hotwellLevel: number = useEMA(hotwellWaterVolume / TotalVolume, 0.1)
  const smoothDelta: number = useEMA(deltaWaterMass, 0.5)

  return (
    <PanelFrame title="Condenser">
      <div className="board-condenser-top">
        <div className="board-cluster">
          <div className="board-instrument">
            <span className="board-instrument-label">Pressure</span>
            <RoundGauge
              label="Pressure gauge"
              unit="mbar"
              value={pressure}
              min={0}
              max={PRESSURE_MAX}
              major={200}
              minor={100}
              zones={PRESSURE_ZONES}
            />
            <Display label="Pressure" text={`${pressure.toFixed(0)} mBar`} />
            <span className="board-readout-values">
              <Lamp
                lit={pressure > HIGH_PRESSURE}
                label="High"
                title={`Pressure above ${HIGH_PRESSURE.toFixed(0)} mBar`}
              />
              <Lamp
                lit={pressure < LOW_PRESSURE}
                label="Low"
                title={`Pressure below ${LOW_PRESSURE.toFixed(0)} mBar`}
              />
            </span>
          </div>

          <div className="board-instrument">
            <span className="board-instrument-label">Hotwell level</span>
            <LevelGauge label="Hotwell level gauge" value={hotwellLevel * 100} />
            <Display label="Hotwell level" text={hotwellLevel.toFixed(1)} />
            <Display label="Hotwell level change" text={`Δ ${smoothDelta.toFixed(1)}`} />
          </div>
        </div>

        <div className="board-group">
          <h3 className="board-group-title">Pressure Control</h3>
          <div className="board-group-cols">
            <div className="board-instrument">
              <span className="board-readout-label">Air Extraction Pump (CAR)</span>
              <LensButton pressed={isAirExtractionPumpEnabled} onClick={toggleAirExtractionPump}>
                {isAirExtractionPumpEnabled ? "STOP" : "START"}
              </LensButton>
            </div>
            <div className="board-instrument">
              <span className="board-readout-label">Steam Jet Air Extraction (SJAE)</span>
              <LensButton pressed={isSjaeEnabled} onClick={toggleSjae}>
                {isSjaeEnabled ? "DISABLE" : "ENABLE"}
              </LensButton>
              <ValveControl
                knob
                Label="SJAE valve"
                Caption="Position:"
                Position={sjaeValvePosition}
                Step={SJAE_ValveStep}
                cbAdjust={adjustSjaeValvePosition}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="board-condenser-bottom">
        <div className="board-group">
          <h3 className="board-group-title">Recirculation Pump</h3>
          <ValveControl
            knob
            Label="Recirculation pump"
            Caption="Flow rate:"
            Position={recirculationPumpValvePosition}
            Value={`${(recirculationPumpValvePosition * RecirculationPump_MaxFlowRate).toFixed(1)} l/s`}
            Step={RecirculationPump_Step}
            cbAdjust={adjustRecirculationPumpValvePosition}
          />
        </div>
        <div className="board-group">
          <h3 className="board-group-title">Condensation Pump</h3>
          <ValveControl
            knob
            Label="Condensation pump"
            Caption="Flow rate:"
            Position={condensationPumpValvePosition}
            Step={CondensationPump_Step}
            cbAdjust={adjustCondensationPumpValvePosition}
          />
        </div>
        <div className="board-group">
          <h3 className="board-group-title">Hotwell Makeup &amp; Reject</h3>
          <div className="board-group-cols">
            <ValveControl
              knob
              Label="Makeup"
              Caption="Makeup:"
              Position={makeupValvePosition}
              Value={`${(makeupValvePosition * Makeup_MaxFlowRate).toFixed(1)} l/s`}
              Step={Makeup_Step}
              cbAdjust={adjustMakeupValvePosition}
            />
            <ValveControl
              knob
              Label="Reject"
              Caption="Reject:"
              Position={rejectValvePosition}
              Value={`${(rejectValvePosition * Reject_MaxFlowRate).toFixed(1)} l/s`}
              Step={Reject_Step}
              cbAdjust={adjustRejectValvePosition}
            />
          </div>
        </div>
      </div>

      <h3 className="board-group-title board-section">Condenser Status</h3>
      <div className="board-readouts">
        <div className="board-readout">
          <span>Steam volume</span>
          <Display label="Steam volume" text={`${steamMass.toFixed(0)} l`} />
        </div>
        <div className="board-readout">
          <span>Hotwell temperature</span>
          <Display label="Hotwell temperature" text={`${hotwellTemperature.toFixed(1)} °C`} />
        </div>
        <div className="board-readout">
          <span>Intake flow</span>
          <Display label="Intake flow" text={`${smoothIntake.toFixed(0)} kg/s`} />
        </div>
        <div className="board-readout">
          <span>Return flow</span>
          <Display label="Return flow" text={`${returnRate.toFixed(1)} kg`} />
        </div>
      </div>
    </PanelFrame>
  )
}

export default Condenser
