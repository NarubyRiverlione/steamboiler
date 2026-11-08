/** The guarded generator breaker: a hazard housing around a dark button, lit when closed, blocked while out of sync. */

type BreakerSwitchProps = {
  readonly closed: boolean
  readonly blocked: boolean
  readonly onToggle: () => void
}

export function BreakerSwitch({ closed, blocked, onToggle }: BreakerSwitchProps) {
  return (
    <div className="board-hazard">
      <button
        type="button"
        className={closed ? "board-guard board-guard-closed" : "board-guard"}
        aria-pressed={closed}
        disabled={blocked}
        onClick={onToggle}
      >
        {closed ? "Breaker Closed" : "Breaker Open"}
      </button>
    </div>
  )
}
