/** The Steam page on the board: the superheater with its steam temperature gauge, spray attemperator valve and Auto/Manual switch, and a placeholder for the reheater (#149, ADR 0044). */

import usePowerPlant from "../../context/PowerPlantContext"
import { CstSuperheater } from "../../context/const"
import { getBoilingPoint } from "../../utils/steamTable"
import { Display } from "../board/Display"
import { Lamp } from "../board/Lamp"
import { PanelFrame } from "../board/PanelFrame"
import { RoundGauge } from "../board/RoundGauge"
import { TurnSwitch } from "../board/TurnSwitch"
import { ValveControl } from "../board/ValveControl"
import { TEMPERATURE_MAX, TEMPERATURE_MIN, TEMPERATURE_ZONES } from "./temperatureZones"

const { AlarmTemperature } = CstSuperheater
const SPRAY_STEP = 5 // percent per arrow key press or wheel notch

function Steam() {
  const {
    state: {
      Boiler: { steamTemperature, superheaterHeat, sprayValvePosition, sprayFlow, attemperatorAuto, pressure },
    },
    setAttemperatorAuto,
  } = usePowerPlant()

  const superheat: number = Math.max(0, steamTemperature - getBoilingPoint(pressure))
  const high: boolean = steamTemperature >= AlarmTemperature

  return (
    <PanelFrame title="Steam">
      <div className="board-condenser-top">
        <div className="board-group">
          <h3 className="board-group-title">Superheater</h3>
          <div className="board-instrument">
            <span className="board-instrument-label">Steam temperature</span>
            <RoundGauge
              label="Steam temperature gauge"
              unit="°C"
              value={steamTemperature}
              min={TEMPERATURE_MIN}
              max={TEMPERATURE_MAX}
              major={50}
              minor={10}
              zones={TEMPERATURE_ZONES}
            />
            <Display label="Steam temperature" text={`${steamTemperature.toFixed(1)} °C`} widest="999.9 °C" alarm={high} />
          </div>

          <ValveControl
            ValveId="Spray valve"
            Label="Spray valve"
            Caption="Attemperator spray"
            Position={sprayValvePosition}
            Value={`${sprayFlow.toFixed(1)} kg/s`}
            ValueWidest="99.9 kg/s"
            Step={SPRAY_STEP}
            Disabled={attemperatorAuto ? "Attemperator in Auto" : undefined}
          />
          <div className="board-instrument">
            <TurnSwitch
              label="Attemperator"
              offLabel="MANUAL"
              onLabel="AUTO"
              tone="machine"
              on={attemperatorAuto}
              onToggle={() => {
                setAttemperatorAuto(!attemperatorAuto)
              }}
            />
            <span className="board-readout-label">Attemperator</span>
          </div>

          <div className="board-readouts">
            <div className="board-readout">
              <span>Superheat</span>
              <Display label="Superheat" text={`${superheat.toFixed(1)} K`} widest="999.9 K" />
            </div>
            <div className="board-readout">
              <span>Superheater duty</span>
              <Display label="Superheater duty" text={`${(superheaterHeat / 1000).toFixed(1)} MW`} widest="999.9 MW" />
            </div>
            <div className="board-readout">
              <span>Spray flow</span>
              <Display label="Spray flow" text={`${sprayFlow.toFixed(1)} kg/s`} widest="99.9 kg/s" />
            </div>
            <div className="board-readout">
              <span>Spray valve position</span>
              <Display
                label="Spray valve position"
                text={`${String(Math.round(sprayValvePosition * 100))} % Open`}
                widest="100 % Open"
              />
            </div>
          </div>
          <Lamp lit={high} label="Steam temperature high" title={`The steam is at or above ${String(AlarmTemperature)} °C`} />
        </div>

        <div className="board-group board-placeholder" aria-label="Reheater">
          <h3 className="board-group-title">Reheater</h3>
          <p>Not built yet (#150)</p>
        </div>
      </div>
    </PanelFrame>
  )
}

export default Steam
