/** The headline plant values in the header, on every page: boiler pressure and generated output as plain LCD readouts. */

import { Display } from "../components/board/Display"
import usePowerPlant from "../context/PowerPlantContext"
import useEMA from "../utils/useEMA"

function PlantValues() {
  const {
    state: {
      Boiler: { pressure },
      Turbine: { electricOutput },
    },
  } = usePowerPlant()
  // Same smoothing as the Boiler page, so the header and the gauge agree
  const smoothPressure: number = useEMA(pressure, 0.01)

  return (
    <div className="board-header-values">
      <Display label="Boiler pressure" text={`${smoothPressure.toFixed(1)} bar`} widest="999.9 bar" />
      <Display label="Output" text={`${electricOutput.toFixed(1)} MW`} widest="999.9 MW" />
    </div>
  )
}

export default PlantValues
