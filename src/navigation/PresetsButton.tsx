/** Header button "Presets" and its modal popup: pick a start state that replaces the whole plant state (#24). No confirmation; the popup is the choice. */

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { LensButton } from "../components/board/LensButton"
import usePowerPlant from "../context/PowerPlantContext"
import { START_PRESETS, presetState, type StartPreset } from "../context/startPresets"
import { useAnnunciator } from "./useAnnunciator"

const BOARD_KEYS: readonly string[] = ["Escape", "h", "Backspace", "PageUp", "PageDown"]

// Where Tab (or Shift+Tab) must jump to keep focus inside the popup: the opposite end from the focused edge, else null
function tabWrapTarget(targets: readonly HTMLElement[], active: Element | null, shift: boolean): HTMLElement | null {
  if (targets.length === 0) return null
  const edge: HTMLElement = shift ? targets[0] : targets[targets.length - 1]
  const opposite: HTMLElement = shift ? targets[targets.length - 1] : targets[0]
  return active === edge ? opposite : null
}

// Keeps Tab inside the popup: at the edge button the focus jumps to the opposite end
function wrapTab(event: KeyboardEvent<HTMLDivElement>, dialog: HTMLElement | null): void {
  const targets: HTMLElement[] = Array.from(dialog?.querySelectorAll<HTMLElement>("button") ?? [])
  const wrapTo: HTMLElement | null = tabWrapTarget(targets, document.activeElement, event.shiftKey)
  if (wrapTo === null) return
  event.preventDefault()
  wrapTo.focus()
}

function PresetsButton() {
  const { dispatch } = usePowerPlant()
  const { clearLatches } = useAnnunciator()
  const [isOpen, setOpen] = useState<boolean>(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)

  // Focus moves into the popup on open
  useEffect(() => {
    if (isOpen) dialogRef.current?.querySelector<HTMLElement>("button")?.focus()
  }, [isOpen])

  const openPopup = (): void => {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setOpen(true)
  }
  const close = (): void => {
    setOpen(false)
    returnFocus.current?.focus()
  }
  const choose = (preset: StartPreset): void => {
    dispatch({ type: "LOAD_STATE", payload: { state: presetState(preset) } })
    clearLatches()
    close()
  }

  // Escape closes; Tab wraps inside the popup
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    // The popup is modal: the board keys (Esc, h and Backspace to overview, Page Up/Down between parts) must not navigate behind it
    if (BOARD_KEYS.includes(event.key)) event.preventDefault()
    if (event.key === "Escape") {
      close()
      return
    }
    if (event.key === "Tab") wrapTab(event, dialogRef.current)
  }

  return (
    <>
      <LensButton onClick={openPopup}>Presets</LensButton>
      {isOpen && (
        <div className="board-presets-backdrop" data-testid="presets-backdrop" onClick={close}>
          <div
            ref={dialogRef}
            className="board-plate board-presets"
            role="dialog"
            aria-modal="true"
            aria-label="Presets"
            onKeyDown={onKeyDown}
            onClick={(event) => { event.stopPropagation() }}
          >
            <h2 className="board-presets-title">Presets</h2>
            <p className="board-presets-hint">Choosing one replaces the whole plant state.</p>
            <ul className="board-presets-list">
              {START_PRESETS.map((preset: StartPreset) => (
                <li key={preset.id}>
                  <button type="button" className="board-presets-choice" onClick={() => { choose(preset) }}>
                    <span className="board-presets-label">{preset.label}</span>
                    <span className="board-presets-desc">{preset.description}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button type="button" className="board-presets-close" onClick={close}>Close</button>
          </div>
        </div>
      )}
    </>
  )
}

export default PresetsButton
