/** Click and key handlers of a turn switch (#124), from the rules in switchInput.ts. */

import type { KeyboardEvent } from "react"
import { keyAction, pressAction, type SwitchAction, type SwitchGuard } from "./switchInput"

type SwitchInputOptions = {
  readonly disabled: boolean
  readonly guard: SwitchGuard | undefined
  readonly onToggle: () => void
}

type SwitchHandlers = {
  readonly onClick: () => void
  readonly onKeyDown: (e: KeyboardEvent<SVGSVGElement>) => void
}

export function useSwitchInput({ disabled, guard, onToggle }: SwitchInputOptions): SwitchHandlers {
  const lifted: boolean = guard?.lifted === true
  const covered: boolean = guard !== undefined && !lifted
  const run = (action: SwitchAction): void => {
    if (action === "toggle") onToggle()
    if (action === "cover") guard?.onToggleCover()
  }
  return {
    onClick: () => {
      run(pressAction(covered, disabled))
    },
    onKeyDown: (e: KeyboardEvent<SVGSVGElement>) => {
      const action: SwitchAction | "ignore" = keyAction(e.key, covered, lifted, disabled)
      if (action === "ignore") return
      e.preventDefault()
      run(action)
    },
  }
}
