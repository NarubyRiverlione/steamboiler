type ValveSliderProps = {
  Label: string
  Value?: number // flow rate
  Position: number // how much the valve is open/close
  Step: number
  cbAdjust: (step: number) => void
}

const ValveSlider = ({ Label, Value, Position, Step, cbAdjust }: ValveSliderProps) => {
  return (
    <>
      <div className="valve-status">
        <span className="label">{Label}</span>
        {Value && <span className="value">{Value} g/s</span>}
      </div>

      <div className="valve-slider">
        <button
          className="steam-valve-button"
          onClick={() => {
            cbAdjust(-Step)
          }}
        >
          Close
        </button>
        <div className="valve-slider-container">
          <div className="valve-position-indicator" style={{ width: `${Position.toString()}%` }}></div>
        </div>
        <button
          className="steam-valve-button"
          onClick={() => {
            cbAdjust(Step)
          }}
        >
          Open
        </button>
      </div>
    </>
  )
}

export default ValveSlider
