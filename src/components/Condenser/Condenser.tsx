/** The Condenser page on the board: pressure and hotwell level gauges, vacuum and pump controls, status readouts. */

import usePowerPlant from "../../context/PowerPlantContext"
import { CstSimulation } from "../../context/const"
import formatSigned from "../../utils/formatSigned"
import { waterKgPerSecond } from "../../utils/flowUnits"
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
    RecirculationPump_IntakeTemperature,
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
  const smoothWaterChange: number = useEMA(deltaWaterMass / CstSimulation.DeltaTime, 0.5)

  return (
    <PanelFrame
      status={
        <>
          <h3 className="board-group-title board-section">Condenser Status</h3>
          <div className="board-readouts">
            <div className="board-readout">
              <span>Hotwell temperature</span>
              <Display
                label="Hotwell temperature"
                text={`${hotwellTemperature.toFixed(1)} °C`}
                widest="100.0 °C"
              />
            </div>
            <div className="board-readout">
              <span>Intake flow</span>
              <Display label="Intake flow" text={`${smoothIntake.toFixed(0)} kg/s`} widest="999 kg/s" />
            </div>
            <div className="board-readout">
              <span>Return flow</span>
              <Display label="Return flow" text={`${returnRate.toFixed(1)} kg`} widest="999.9 kg" />
            </div>
          </div>
        </>
      }
      title="Condenser"
    >
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
            <Display label="Pressure" text={`${pressure.toFixed(0)} mBar`} widest="1100 mBar" />
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
            <Display label="Hotwell level" text={hotwellLevel.toFixed(1)} widest="100.0" />
            <Display label="Hotwell level change" text={formatSigned(smoothWaterChange, 1, "kg/s")} widest="-999.9 kg/s" />
          </div>
        </div>

        <div className="board-group">
          <h3 className="board-group-title">Pressure Control</h3>
          <div className="board-group-cols">
            <div className="board-instrument">
              <span className="board-readout-label">Air Extraction Pump (CAR)</span>
              <LensButton
                pressed={isAirExtractionPumpEnabled}
                onClick={toggleAirExtractionPump}
                widest="START"
              >
                {isAirExtractionPumpEnabled ? "STOP" : "START"}
              </LensButton>
            </div>
            <div className="board-instrument">
              <span className="board-readout-label">Steam Jet Air Extraction (SJAE)</span>
              <LensButton pressed={isSjaeEnabled} onClick={toggleSjae} widest="DISABLE">
                {isSjaeEnabled ? "DISABLE" : "ENABLE"}
              </LensButton>
              <ValveControl
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
            Label="Recirculation pump"
            Caption="Flow rate:"
            Position={recirculationPumpValvePosition}
            Value={`${waterKgPerSecond(recirculationPumpValvePosition * RecirculationPump_MaxFlowRate, RecirculationPump_IntakeTemperature).toFixed(1)} kg/s`}
            ValueWidest="9999.9 kg/s"
            Step={RecirculationPump_Step}
            cbAdjust={adjustRecirculationPumpValvePosition}
          />
        </div>
        <div className="board-group">
          <h3 className="board-group-title">Condensation Pump</h3>
          <ValveControl
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
              Label="Makeup"
              Caption="Makeup:"
              Position={makeupValvePosition}
              Value={`${waterKgPerSecond(makeupValvePosition * Makeup_MaxFlowRate, hotwellTemperature).toFixed(1)} kg/s`}
              ValueWidest="9999.9 kg/s"
              Step={Makeup_Step}
              cbAdjust={adjustMakeupValvePosition}
            />
            <ValveControl
              Label="Reject"
              Caption="Reject:"
              Position={rejectValvePosition}
              Value={`${waterKgPerSecond(rejectValvePosition * Reject_MaxFlowRate, hotwellTemperature).toFixed(1)} kg/s`}
              ValueWidest="9999.9 kg/s"
              Step={Reject_Step}
              cbAdjust={adjustRejectValvePosition}
            />
          </div>
        </div>
      </div>
    </PanelFrame>
  )
}

export default Condenser
