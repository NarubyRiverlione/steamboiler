/** Board keyboard: Page Down or Right and Page Up or Left cycle the parts, Esc returns to the overview. A field or knob in use keeps its keys. */

import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { OVERVIEW_PATH, neighbourPath } from "./plantParts"

const OWN_KEYS = "input, textarea, select, [contenteditable], [role='slider'], [role='spinbutton']"

// A focused button or link keeps the arrows (Close and Open on the pages not yet migrated), not Esc
const OWN_ARROWS = "button, a[href]"

const STEPS: Readonly<Partial<Record<string, 1 | -1>>> = {
  PageDown: 1,
  ArrowRight: 1,
  PageUp: -1,
  ArrowLeft: -1,
}

function keepsKeys(target: EventTarget | null, key: string): boolean {
  if (!(target instanceof Element)) return false
  if (target.closest(OWN_KEYS) !== null) return true
  return key.startsWith("Arrow") && target.closest(OWN_ARROWS) !== null
}

// The path a key goes to from the current path; undefined for a key the board does not use
function targetPath(key: string, pathname: string): string | undefined {
  if (key === "Escape") return OVERVIEW_PATH
  const step: 1 | -1 | undefined = STEPS[key]
  return step === undefined ? undefined : neighbourPath(pathname, step)
}

// A modifier or a handled event leaves the key alone
function isPlain(event: KeyboardEvent): boolean {
  return !(event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey)
}

export function useBoardKeys(): void {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!isPlain(event) || keepsKeys(event.target, event.key)) return
      const path: string | undefined = targetPath(event.key, pathname)
      if (path === undefined) return
      void navigate(path)
      event.preventDefault()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [navigate, pathname])
}
