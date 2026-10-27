import { Scenario } from "../scenario"
import { startupCold } from "./startup-cold"

export const scenarios: Record<string, Scenario> = {
  [startupCold.name]: startupCold,
}
