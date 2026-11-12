/**
 * The heating rate as the board and the report read it: kelvin per hour with one decimal, so a rate just over the
 * limit reads over it (#103).
 */
export const heatingRateText = (heatingRate: number): string => `${(heatingRate * 3600).toFixed(1)} K/h`
