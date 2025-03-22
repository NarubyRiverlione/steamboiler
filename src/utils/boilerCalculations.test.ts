import { calculatePressure, calculateTemperature } from "./boilerCalculations";

describe("Boiler Calculations", () => {
  test("calculateTemperature returns correct temperature", () => {
    const waterMass = 50; // 50kg of water
    const energyFor90C = waterMass * 4186 * 90;
    expect(calculateTemperature(energyFor90C, waterMass)).toBeCloseTo(90, 1);

    // Test cooling of 1°C
    const energyLoss = waterMass * 4186;
    const newEnergy = energyFor90C - energyLoss;
    expect(calculateTemperature(newEnergy, waterMass)).toBeCloseTo(89, 1);
  });

  test("calculatePressure returns expected pressure", () => {
    expect(calculatePressure(90)).toBeCloseTo(0.701, 3);
    expect(calculatePressure(100)).toBeCloseTo(1.013, 3);
  });
});
