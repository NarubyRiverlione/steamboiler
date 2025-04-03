type ReadoutProps = {
  title: string
  value: number
  unit: string
  colored?: boolean
  fixed?: number
  delta?: number
  deltaFixed?: number
}
const Readout = ({ title, value, unit, colored = false, fixed = 0, delta, deltaFixed = 0 }: ReadoutProps) => (
  <div className="readout-container">
    <div className="readout-item">
      <span className="label">{title}</span>

      {!colored && (
        <span className="value">
          {value.toFixed(fixed)} {unit}
        </span>
      )}
      {/* show positive or negative values in separate color */}
      {colored && (
        <span className={`value ${value > 0 ? "positive" : value < 0 ? "negative" : ""}`}>
          {value > 0 ? "+" : ""}
          {value.toFixed(fixed)} {unit}
        </span>
      )}
    </div>

    {delta !== undefined && (
      <div className="readout-right">
        <span className="value">{`Δ ${delta.toFixed(deltaFixed)} ${unit}`}</span>
      </div>
    )}
  </div>
)

export default Readout
