/**
 * Signed LCD text for a rate or change: "+" for a rise, "-" for a fall, no sign when the value rounds to zero.
 */
function formatSigned(value: number, decimals: number, unit: string): string {
  const rounded: number = Number(value.toFixed(decimals)) + 0 // + 0 turns -0 into 0
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(decimals)} ${unit}`
}

export default formatSigned
