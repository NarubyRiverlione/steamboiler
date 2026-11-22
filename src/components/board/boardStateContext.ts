/** The board state as a context (#144), so a primitive such as Display can react without the part pages knowing about the buses. */

import { createContext, useContext } from "react"
import type { BoardState } from "../../navigation/boardState"

export const BoardStateContext = createContext<BoardState>("normal")

export const useBoardState = (): BoardState => useContext(BoardStateContext)
