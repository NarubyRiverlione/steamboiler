// Antoine equation constants for water
const A = 8.07131;
const B = 1730.63;
const C = 233.426;

export const calculatePressure = (temperature: number): number => {
  // Antoine equation: log10(P) = A - (B / (C + T))
  // where P is in mmHg and T is in Celsius
  const pressureMMHg = 10 ** (A - B / (C + temperature));
  // Convert mmHg to bar
  return pressureMMHg * 0.00133322;
};

export const calculateTemperature = (
  energy: number,
  waterMass: number
): number => {
  // Specific heat capacity of water = 4186 J/(kg·°C)
  const specificHeat = 4186;
  return energy / (waterMass * specificHeat);
};
