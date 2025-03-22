import { useState, useEffect, useRef } from "react";
import {
  calculatePressure,
  calculateTemperature,
} from "../utils/boilerCalculations";

export const Boiler = () => {
  // Calculate initial heat needed to maintain 90°C (compensate for cooling loss)
  const waterMass = 50; // 50% of 100kg
  const coolingLossPerInterval = (0.1 * waterMass * 4186) / 10; // Energy loss per 100ms
  const initialHeatInput = coolingLossPerInterval * 10; // J/s needed to maintain temp

  // Boiler state
  const [waterLevel, setWaterLevel] = useState(50);
  const [energy, setEnergy] = useState(18837000);
  const [temperature, setTemperature] = useState(90);
  const [pressure, setPressure] = useState(1);
  const [heatInput, setHeatInput] = useState(initialHeatInput);
  const [energyChangeRate, setEnergyChangeRate] = useState(0);

  // Track previous energy for rate calculation
  const lastEnergy = useRef(energy);

  // Valve states
  const [fillValve, setFillValve] = useState(false);
  const [drainValve, setDrainValve] = useState(false);
  const [pressureValve, setPressureValve] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      let newWaterLevel = waterLevel;
      if (fillValve) newWaterLevel += 0.05; // Adjusted for 100ms interval
      if (drainValve) newWaterLevel -= 0.1; // Adjusted for 100ms interval
      newWaterLevel = Math.max(0, Math.min(100, newWaterLevel));

      const waterMass = (newWaterLevel / 100) * 100;
      const coolingLoss = (0.1 * waterMass * 4186) / 10; // Cooling energy for 100ms

      const newEnergy = energy + heatInput / 10 - coolingLoss;

      // Calculate energy change rate (J/s)
      setEnergyChangeRate((newEnergy - lastEnergy.current) * 10);
      lastEnergy.current = newEnergy;

      setEnergy(Math.max(0, newEnergy));
      setWaterLevel(newWaterLevel);

      const newTemp = calculateTemperature(newEnergy, waterMass);
      setTemperature(newTemp);

      let newPressure = calculatePressure(newTemp);
      if (pressureValve) newPressure = Math.max(1, newPressure * 0.99);
      setPressure(newPressure);
    }, 100);

    return () => clearInterval(interval);
  }, [energy, waterLevel, fillValve, drainValve, pressureValve, heatInput]);

  return (
    <div className="boiler">
      <div className="gauges">
        <div>Water Level: {waterLevel.toFixed(1)}%</div>
        <div>Temperature: {temperature.toFixed(1)}°C</div>
        <div>Pressure: {pressure.toFixed(1)} bar</div>
        <div>Energy: {Math.round(energy).toLocaleString()} J</div>
        <div>Heat Input: {heatInput.toLocaleString()} J/s</div>
        <div>Energy Change: {energyChangeRate.toFixed(1)} J/s</div>
      </div>

      <div className="controls">
        <button onClick={() => setHeatInput(Math.min(heatInput + 1000))}>
          + Heat
        </button>
        <button onClick={() => setHeatInput(Math.max(heatInput - 1000, 0))}>
          - Heat
        </button>
      </div>

      <div className="valves">
        <button onClick={() => setFillValve(!fillValve)}>
          Fill Valve ({fillValve ? "Open 0.5%/s" : "Closed"})
        </button>
        <button onClick={() => setDrainValve(!drainValve)}>
          Drain Valve ({drainValve ? "Open 1.0%/s" : "Closed"})
        </button>
        <button onClick={() => setPressureValve(!pressureValve)}>
          Pressure Release ({pressureValve ? "Open 10%/s" : "Closed"})
        </button>
      </div>
    </div>
  );
};
