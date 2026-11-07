/** The Boiler page on the board: pressure and drum level gauges, gas and drain controls, status readouts. */

import { useState, type SyntheticEvent } from "react"
import usePowerPlant from "../../context/PowerPlantContext"
import { CstSimulation } from "../../context/const"
import useEMA from "../../utils/useEMA"
import { Display } from "../board/Display"
import { Lamp } from "../board/Lamp"
import { LensButton } from "../board/LensButton"
import { LevelGauge } from "../board/LevelGauge"
import { PanelFrame } from "../board/PanelFrame"
import { RoundGauge, type GaugeZone } from "../board/RoundGauge"

const {
  CstBoiler: {
    TotalVolume,
    ReliefOpenPressure,
    ReliefClosePressure,
    HeatingRateLimit,
    BurnerLowLowLevel,
    GasChangeRateFast,
    GasChangeRateSlow,
  },
  CstTurbine: { ValveRatingPressure },
} = CstSimulation

const PRESSURE_MAX = 200 // bar, top of the dial (design pressure 180)
const PRESSURE_ZONES: readonly GaugeZone[] = [
  { from: 0, to: ValveRatingPressure, tone: "ok" },
  { from: ValveRatingPressure, to: ReliefOpenPressure, tone: "warn" },
  { from: ReliefOpenPressure, to: PRESSURE_MAX, tone: "alarm" },
]
const LEVEL_ZONES: readonly GaugeZone[] = [{ from: 0, to: BurnerLowLowLevel * 100, tone: "alarm" }]
const LEVEL_TICKS: readonly number[] = [0, BurnerLowLowLevel * 100, 50, 100]

function Boiler() {
  const {
    state: {
      Boiler: {
        gasFlow,
        waterVolume,
        temperature,
        pressure,
        energyDelta,
        steamMass,
        deltaSteamMass,
        energy,
        reliefValveOpen,
        ventedTotal,
        burnerTripped,
        heatingRate,
        heatingRateOverLimit,
        drainValveOpen,
      },
      Turbine: { bypassSteamFlowOut, turbineSteamFlowOut },
    },
    increaseGasFlow,
    decreaseGasFlow,
    toggleDrainValve,
  } = usePowerPlant()

  const smoothPressure: number = useEMA(pressure, 0.01)
  const smoothEnergyDelta: number = useEMA(energyDelta / 1e3, 0.01)
  const [advanced, setAdvanced] = useState<boolean>(false)
  const energyText = `${smoothEnergyDelta > 0 ? "+" : ""}${smoothEnergyDelta.toFixed(0)} MJ/s`

  return (
    <PanelFrame title="Boiler">
      <div className="board-boiler-main">
        <div className="board-instrument">
          <span className="board-instrument-label">Pressure</span>
          <RoundGauge
            label="Pressure gauge"
            unit="bar"
            value={smoothPressure}
            min={0}
            max={PRESSURE_MAX}
            major={40}
            minor={10}
            zones={PRESSURE_ZONES}
          />
          <Display label="Pressure" text={`${smoothPressure.toFixed(1)} bar`} />
        </div>

        <div className="board-instrument">
          <h3 className="board-group-title">Gas Flow Control</h3>
          <Display label="Gas flow" text={`${gasFlow.toFixed(0)} l/s`} />
          <div className="board-lens-row">
            <LensButton
              small
              onClick={() => {
                increaseGasFlow(GasChangeRateFast)
              }}
            >
              + {GasChangeRateFast} L/s
            </LensButton>
            <LensButton
              small
              onClick={() => {
                increaseGasFlow(GasChangeRateSlow)
              }}
            >
              + {GasChangeRateSlow} L/s
            </LensButton>
          </div>
          <div className="board-lens-row">
            <LensButton
              small
              onClick={() => {
                decreaseGasFlow(GasChangeRateSlow)
              }}
            >
              - {GasChangeRateSlow} L/s
            </LensButton>
            <LensButton
              small
              onClick={() => {
                decreaseGasFlow(GasChangeRateFast)
              }}
            >
              - {GasChangeRateFast} L/s
            </LensButton>
          </div>
        </div>

        <div className="board-instrument">
          <span className="board-instrument-label">Water volume</span>
          <LevelGauge
            label="Drum level gauge"
            value={(waterVolume / TotalVolume) * 100}
            zones={LEVEL_ZONES}
            ticks={LEVEL_TICKS}
          />
          <Display
            label="Water volume"
            text={`${waterVolume.toFixed(0)} l ${(waterVolume / TotalVolume).toFixed(2)}`}
          />
          <h3 className="board-group-title">Water Valve Control</h3>
          <span className="board-readout-label">Drain Valve</span>
          <LensButton pressed={drainValveOpen} onClick={toggleDrainValve}>
            {drainValveOpen ? "Open" : "Closed"}
          </LensButton>
        </div>
      </div>

      <h3 className="board-group-title board-section">Boiler Status</h3>
      <div className="board-readouts">
        <div className="board-readout">
          <span>Temperature</span>
          <Display label="Temperature" text={`${temperature.toFixed(1)} °C`} />
        </div>
        <div className="board-readout">
          <span>Energy Change</span>
          <Display label="Energy change" text={energyText} />
        </div>
        <div className="board-readout">
          <span>Heating rate</span>
          <span className="board-readout-values">
            <Lamp
              lit={heatingRateOverLimit}
              label="Over limit"
              title={`Alarm above ${String(HeatingRateLimit * 60)} K/min`}
            />
            <Display
              label="Heating rate"
              text={`${(heatingRate * 60).toFixed(1)} K/min`}
              alarm={heatingRateOverLimit}
            />
          </span>
        </div>
        <div className="board-readout">
          <span>Relief valve</span>
          <span className="board-readout-values">
            <Lamp
              lit={reliefValveOpen}
              label="Open"
              title={`Opens at ${String(ReliefOpenPressure)} bar, closes at ${String(ReliefClosePressure)} bar`}
            />
            <Display label="Vented" text={`${(ventedTotal / 1e3).toFixed(1)} t vented`} />
          </span>
        </div>
        <div className="board-readout">
          <span>Burner trip</span>
          <Lamp
            lit={burnerTripped}
            label="Tripped"
            title={`Gas shut off below ${String(BurnerLowLowLevel * 100)}% water, raise the gas to restart`}
          />
        </div>
      </div>

      <details
        className="board-advanced board-section"
        open={advanced}
        onToggle={(e: SyntheticEvent<HTMLDetailsElement>) => {
          setAdvanced(e.currentTarget.open)
        }}
      >
        <summary>Advanced</summary>
        <div className="board-readouts">
          <div className="board-readout">
            <span>Steam Mass</span>
            <span className="board-readout-values">
              <Display label="Steam mass" text={`${steamMass.toFixed(1)} kg`} />
              <Display label="Steam mass change" text={`Δ ${deltaSteamMass.toFixed(2)} kg`} />
            </span>
          </div>
          <div className="board-readout">
            <span>Energy</span>
            <Display label="Energy" text={`${(energy / 1e3).toFixed(1)} MJ`} />
          </div>
          <div className="board-readout">
            <span>Steam Removal</span>
            <Display
              label="Steam removal"
              text={`${(bypassSteamFlowOut + turbineSteamFlowOut).toFixed(1)} kg/s`}
            />
          </div>
        </div>
      </details>
    </PanelFrame>
  )
}

export default Boiler
