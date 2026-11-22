/** Auxiliary load (#140): the electric power the plant's own pumps and turbine auxiliaries draw. Metering only: nothing feeds back. */
import { CstAuxiliary } from "./const"
import { isBusLive } from "./AuxiliaryBus"
import PowerPlantState from "./PowerPlantState"

const flowDraw = (rated: number, valvePosition: number, tripped: boolean): number => (tripped ? 0 : rated * valvePosition)
const onOffDraw = (rated: number, on: boolean): number => (on ? rated : 0)

// MW drawn by each of the six consumers, largest rated first (feed, recirculation, condensation, air extraction, lube oil, turning gear): flow pumps in
// proportion to the valve position, the others at rated power while on; 0 when stopped or tripped, and all 0 on a dead bus (#141)
export const consumerDraws = (state: PowerPlantState): readonly number[] => (isBusLive(state) ? pumpDraws(state) : [0, 0, 0, 0, 0, 0])

// The auxiliary load is the sum of the consumer draws, so the two always agree
export const auxiliaryLoadOf = (state: PowerPlantState): number => consumerDraws(state).reduce((total: number, draw: number) => total + draw, 0)

const pumpDraws = ({ Deaerator, Condenser, Oil, Turbine }: PowerPlantState): readonly number[] => [
  flowDraw(CstAuxiliary.FeedPump, Deaerator.feedPumpValvePosition, Deaerator.feedPumpTripped),
  flowDraw(CstAuxiliary.RecirculationPump, Condenser.recirculationPumpValvePosition, false),
  flowDraw(CstAuxiliary.CondensationPump, Condenser.condensationPumpValvePosition, Condenser.condensationPumpTripped),
  onOffDraw(CstAuxiliary.AirExtractionPump, Condenser.isAirExtractionPumpEnabled && !Condenser.airPumpTripped),
  onOffDraw(CstAuxiliary.LubeOilPump, Oil.pumpRunning),
  onOffDraw(CstAuxiliary.TurningGearMotor, Turbine.turningGearEngaged),
]

// MW the plant delivers net of its own use; negative means import
export const netOutputOf = (state: PowerPlantState): number => state.Turbine.electricOutput - state.auxiliaryLoad
