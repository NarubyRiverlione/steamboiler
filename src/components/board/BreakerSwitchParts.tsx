/** The drawn parts of a breaker switch (#172): the nameplate, the position flag, the rocker handle and the flip cover (down over the well, lifted over the nameplate and flag). */

type NameplateProps = { readonly plate: string; readonly rating: string }

export function Nameplate({ plate, rating }: NameplateProps) {
  return (
    <div className="board-breaker-nameplate">
      <b>{plate}</b>
      <small>{rating}</small>
    </div>
  )
}

type FlagProps = { readonly on: boolean; readonly refused: boolean }

// The big position flag: green O OPEN, red I CLOSED, dimmed while the breaker refuses to close
export function PositionFlag({ on, refused }: FlagProps) {
  const classes: string = [
    "board-breaker-flag",
    on ? "board-breaker-flag-closed" : "board-breaker-flag-open",
    refused ? "board-breaker-flag-refused" : "",
  ]
    .filter((c: string) => c !== "")
    .join(" ")
  return (
    <div className={classes} aria-hidden="true" data-position={on ? "closed" : "open"}>
      <span className="board-breaker-flag-big">{on ? "I" : "O"}</span>
      <span className="board-breaker-flag-small">{on ? "CLOSED" : "OPEN"}</span>
    </div>
  )
}

// The rocker: the half that is pressed in is the position; its legend is lit
export function Rocker({ on }: { readonly on: boolean }) {
  return (
    <div className={`board-breaker-rocker ${on ? "board-breaker-rocker-on" : "board-breaker-rocker-off"}`}>
      <span className="board-breaker-grip board-breaker-grip-up" />
      <span className="board-breaker-grip board-breaker-grip-down" />
      <span className="board-breaker-leg board-breaker-leg-up">I</span>
      <span className="board-breaker-leg board-breaker-leg-down">O</span>
    </div>
  )
}

// The smoked cover over the well while it is down
export function CoverDown() {
  return <div className="board-breaker-cover" aria-hidden="true" />
}

// The cover swung up on its hinge at the top of the well: translucent over the nameplate and the flag; a click drops it (the keyboard uses Escape)
export function CoverLifted({ onClick }: { readonly onClick: () => void }) {
  return <div className="board-breaker-cover-lifted" aria-hidden="true" onClick={onClick} />
}
