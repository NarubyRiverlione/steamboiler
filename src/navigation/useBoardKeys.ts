/** Board keyboard: Page Down or Right and Page Up or Left cycle the parts, Esc returns to the overview. A field or knob in use keeps its keys. */

import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { OVERVIEW_PATH, neighbourPath } from "./plantParts"

const OWN_KEYS = "input, textarea, select, [contenteditable], [role='slider'], [role='spinbutton']"

function keepsKeys(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(OWN_KEYS) !== null
}

export function useBoardKeys(): void {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || keepsKeys(event.target))
        return
      if (event.key === "PageDown" || event.key === "ArrowRight") void navigate(neighbourPath(pathname, 1))
      else if (event.key === "PageUp" || event.key === "ArrowLeft") void navigate(neighbourPath(pathname, -1))
      else if (event.key === "Escape") void navigate(OVERVIEW_PATH)
      else return
      event.preventDefault()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [navigate, pathname])
}
