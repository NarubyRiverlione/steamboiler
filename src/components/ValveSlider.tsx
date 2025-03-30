type ValveSliderProps = {
  Label: string
  Value?: string // flow rate
  Position: number // how much the valve is open/close
  Step: number
  cbAdjust: (step: number) => void
}

const ValveSlider = ({ Label, Value, Position, Step, cbAdjust }: ValveSliderProps) => {
  return (
    <>
      <div className="valve-status">
        <div className="valve-slider-readouts">
          <span className="valve-slider-label">{Label}</span>
          <div className="valve-slider-readout">
            {Value && <span className="valve-slider-value">{Value}</span>}
            <span className="valve-slider-value">{Position} % Open</span>
          </div>
        </div>
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
