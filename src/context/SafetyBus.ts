/**
 * Vital bus and safety bus (#143, ADR 0055). The vital bus (the board's readouts, the annunciator, the controller controls) hangs on
 * the Auxiliary bus and has no battery. The safety bus (breaker control power, the reset coils) is carried by the UPS through the
 * manual UPS breaker. The UPS charge drains while the breaker is closed and the Auxiliary bus is dead, recharges while it is live;
 * at 0% the simulation ends.
 */
import { isBusLive } from "./AuxiliaryBus"
import { CstSimulation, CstUps } from "./const"
import PowerPlantState from "./PowerPlantState"

// Derived every tick, never stored: the vital bus is live with the Auxiliary bus
export const isVitalBusLive = (state: PowerPlantState): boolean => isBusLive(state)

// The safety bus is live only with the UPS breaker closed and charge left
export const isSafetyBusLive = ({ upsBreaker, upsCharge }: PowerPlantState): boolean => upsBreaker && upsCharge > 0

// The UPS charge after one tick, 0-100: one fixed rate each way, set by the bus at the start of the tick
export function upsChargeAfter(state: PowerPlantState): number {
  const { DeltaTime } = CstSimulation
  if (isBusLive(state)) return Math.min(100, state.upsCharge + (100 / CstUps.RechargeTime) * DeltaTime)
  if (state.upsBreaker) return Math.max(0, state.upsCharge - (100 / CstUps.NominalRuntime) * DeltaTime)
  return state.upsCharge
}
