/** Connects the ValveRampProvider to the plant: the actual position and the adjust action of every valve knob, by ValveId (#127). */

import type { ReactNode } from "react"
import usePowerPlant from "../../context/PowerPlantContext"
import { ValveRampProvider, type ValveHandle } from "./ValveRampProvider"
import type { ValveId } from "./valveRampContext"

export function PlantValveRamp({ children }: { readonly children: ReactNode }) {
  const plant = usePowerPlant()
  const { Boiler, Turbine, Condenser, Deaerator } = plant.state
  const valves: Readonly<Partial<Record<ValveId, ValveHandle>>> = {
    "Bypass valve": { actual: Turbine.bypassValvePosition, adjust: plant.adjustBypassValve },
    "Turbine valve": { actual: Turbine.turbineValvePosition, adjust: plant.adjustTurbineValve },
    "SJAE valve": { actual: Condenser.sjaeValvePosition, adjust: plant.adjustSjaeValvePosition },
    "Recirculation pump": {
      actual: Condenser.recirculationPumpValvePosition,
      adjust: plant.adjustRecirculationPumpValvePosition,
    },
    "Condensation pump": {
      actual: Condenser.condensationPumpValvePosition,
      adjust: plant.adjustCondensationPumpValvePosition,
    },
    Makeup: { actual: Condenser.makeupValvePosition, adjust: plant.adjustMakeupValvePosition },
    Reject: { actual: Condenser.rejectValvePosition, adjust: plant.adjustRejectValvePosition },
    "Spray valve": { actual: Boiler.sprayValvePosition, adjust: plant.adjustSprayValve },
    "Feed pump": { actual: Deaerator.feedPumpValvePosition, adjust: plant.adjustFeedPumpValvePosition },
  }
  return <ValveRampProvider valves={valves}>{children}</ValveRampProvider>
}
