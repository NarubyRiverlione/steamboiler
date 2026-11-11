/** The Boiler page on the board: pressure and drum level gauges, gas and drain controls, status readouts. */

import { useState, type SyntheticEvent } from "react"
import usePowerPlant from "../../context/PowerPlantContext"
import { CstSimulation } from "../../context/const"
import formatSigned from "../../utils/formatSigned"
import { gasKgPerSecond } from "../../utils/flowUnits"
import useEMA from "../../utils/useEMA"
import { Display } from "../board/Display"
import { Lamp } from "../board/Lamp"
import { LensButton } from "../board/LensButton"
import { Knob } from "../board/Knob"
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
    GasRateDeadZone,
  },
  CstTurbine: { ValveRatingPressure },
} = CstSimulation

// One width for the heating rate and vented LCDs (the longer, "999.9 t vented"), so their ends line up
const STACKED_LCD_WIDEST = "999.9 t vented"
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
        gasRateCommand,
        waterVolume,
        deltaWaterMass,
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
        stackTemperature,
        boilerEfficiency,
      },
      Turbine: { bypassSteamFlowOut, turbineSteamFlowOut },
    },
    setGasRate,
    toggleDrainValve,
  } = usePowerPlant()

  const smoothPressure: number = useEMA(pressure, 0.01)
  const smoothEnergyDelta: number = useEMA(energyDelta / 1e3, 0.01)
  const smoothWaterChange: number = useEMA(deltaWaterMass / CstSimulation.DeltaTime, 0.01)
  const [advanced, setAdvanced] = useState<boolean>(false)
  const gasTrend: string =
    gasRateCommand > GasRateDeadZone
      ? "▲ RISING"
      : gasRateCommand < -GasRateDeadZone
        ? "▼ FALLING"
        : "HOLDING"
  const energyText = `${smoothEnergyDelta > 0 ? "+" : ""}${smoothEnergyDelta.toFixed(0)} MJ/s`

  return (
    <PanelFrame
      status={
        <>
          <h3 className="board-group-title board-section">Boiler Status</h3>
          <div className="board-readouts board-readouts-cols">
            <div className="board-readout-col">
              <div className="board-readout">
                <span>Temperature</span>
                <Display label="Temperature" text={`${temperature.toFixed(1)} °C`} widest="999.9 °C" />
              </div>
              <div className="board-readout">
                <span>Energy Change</span>
                <Display label="Energy change" text={energyText} widest="-999999 MJ/s" />
              </div>
            </div>
            <div className="board-readout-col">
              <div className="board-readout">
                <span>Stack temperature</span>
                <Display
                  label="Stack temperature"
                  text={`${stackTemperature.toFixed(0)} °C`}
                  widest="999 °C"
                />
              </div>
              <div className="board-readout">
                <span>Boiler efficiency</span>
                <Display
                  label="Boiler efficiency"
                  text={`${(boilerEfficiency * 100).toFixed(1)} %`}
                  widest="100.0 %"
                />
              </div>
              <div className="board-readout">
                <span>Burner trip</span>
                <Lamp
                  lit={burnerTripped}
                  label="Tripped"
                  title={`Gas shut off below ${String(BurnerLowLowLevel * 100)}% water, turn the gas knob up to restart`}
                />
              </div>
            </div>
            <div className="board-readout-col">
              <div className="board-readout board-readout-stacked">
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
                    widest={STACKED_LCD_WIDEST}
                  />
                </span>
              </div>
              <div className="board-readout board-readout-stacked">
                <span>Relief valve</span>
                <span className="board-readout-values">
                  <Lamp
                    lit={reliefValveOpen}
                    label="Open"
                    title={`Opens at ${String(ReliefOpenPressure)} bar, closes at ${String(ReliefClosePressure)} bar`}
                  />
                  <Display
                    label="Vented"
                    text={`${(ventedTotal / 1e3).toFixed(1)} t vented`}
                    widest={STACKED_LCD_WIDEST}
                  />
                </span>
              </div>
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
                  <Display label="Steam mass" text={`${steamMass.toFixed(1)} kg`} widest="99999.9 kg" />
                  <Display
                    label="Steam mass change"
                    text={`Δ ${deltaSteamMass.toFixed(2)} kg`}
                    widest="Δ -999.99 kg"
                  />
                </span>
              </div>
              <div className="board-readout">
                <span>Energy</span>
                <Display label="Energy" text={`${(energy / 1e3).toFixed(1)} MJ`} widest="999999.9 MJ" />
              </div>
              <div className="board-readout">
                <span>Steam Removal</span>
                <Display
                  label="Steam removal"
                  text={`${(bypassSteamFlowOut + turbineSteamFlowOut).toFixed(1)} kg/s`}
                  widest="999.9 kg/s"
                />
              </div>
            </div>
          </details>
        </>
      }
      title="Boiler"
    >
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
          <Display label="Pressure" text={`${smoothPressure.toFixed(1)} bar`} widest="999.9 bar" />
        </div>

        <div className="board-instrument board-group">
          <h3 className="board-group-title">Gas Flow Control</h3>
          <Knob
            mode="centre-zero"
            label="Gas knob"
            value={gasRateCommand}
            deadZone={GasRateDeadZone}
            onChange={setGasRate}
          />
          <Display label="Gas flow" text={`${gasKgPerSecond(gasFlow).toFixed(1)} kg/s`} widest="999.9 kg/s" />
          <span className="board-rate-indicator" role="status" aria-label="Gas trend">
            {gasTrend}
          </span>
        </div>

        <div className="board-cluster">
          <div className="board-instrument">
            <span className="board-instrument-label">Drum level</span>
            <LevelGauge
              label="Drum level gauge"
              value={(waterVolume / TotalVolume) * 100}
              zones={LEVEL_ZONES}
              ticks={LEVEL_TICKS}
            />
            <Display label="Drum water change" text={formatSigned(smoothWaterChange, 1, "kg/s")} widest="-999.9 kg/s" />
          </div>
          <div className="board-group">
            <h3 className="board-group-title">Water Valve Control</h3>
            <span className="board-readout-label">Drain Valve</span>
            <LensButton pressed={drainValveOpen} onClick={toggleDrainValve} widest="Closed">
              {drainValveOpen ? "Open" : "Closed"}
            </LensButton>
          </div>
        </div>
      </div>
    </PanelFrame>
  )
}

export default Boiler
