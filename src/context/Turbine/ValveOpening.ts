/**
 * Refusal to open the turbine valve: the operator and the PID alike may not take more steam when the turbine is tripped or at
 * the overspeed limit (ADR 0040), below the lube oil permissive (ADR 0050) or on a stopped rotor off the turning gear (ADR 0051).
 * Closing is never refused; the vacuum limit is checked apart (ADR 0003).
 */
import { isAtOverspeed } from "../../utils/turbineCalculations"
import { isAtOilPermissive } from "../Oil/OilTick"
import { OilState, TurbineState } from "../PowerPlantState"
import { rotorTurns } from "./TurningGear"

export const isOpeningRefused = (turbine: TurbineState, oil: OilState): boolean =>
  turbine.turbineTripped || isAtOverspeed(turbine.rpm) || !isAtOilPermissive(oil) || !rotorTurns(turbine)
