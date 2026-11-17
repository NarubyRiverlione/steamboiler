/** Auxiliary load (#140): the electric power the plant's own pumps and turbine auxiliaries draw. Metering only: nothing feeds back. */
import { CstAuxiliary } from "./const"
import PowerPlantState from "./PowerPlantState"

const flowDraw = (rated: number, valvePosition: number, tripped: boolean): number => (tripped ? 0 : rated * valvePosition)
const onOffDraw = (rated: number, on: boolean): number => (on ? rated : 0)

// MW drawn by the six consumers: flow pumps in proportion to the valve position, the others at rated power while on; 0 when stopped or tripped
export const auxiliaryLoadOf = ({ Deaerator, Condenser, Oil, Turbine }: PowerPlantState): number =>
  flowDraw(CstAuxiliary.FeedPump, Deaerator.feedPumpValvePosition, Deaerator.feedPumpTripped) +
  flowDraw(CstAuxiliary.CondensationPump, Condenser.condensationPumpValvePosition, Condenser.condensationPumpTripped) +
  flowDraw(CstAuxiliary.RecirculationPump, Condenser.recirculationPumpValvePosition, false) +
  onOffDraw(CstAuxiliary.AirExtractionPump, Condenser.isAirExtractionPumpEnabled && !Condenser.airPumpTripped) +
  onOffDraw(CstAuxiliary.LubeOilPump, Oil.pumpRunning) +
  onOffDraw(CstAuxiliary.TurningGearMotor, Turbine.turningGearEngaged)

// MW the plant delivers net of its own use; negative means import
export const netOutputOf = (state: PowerPlantState): number => state.Turbine.electricOutput - state.auxiliaryLoad
