import { ReactNode, useReducer, useEffect } from "react"
import boilerReducer from "./BoilerReducer"
import { BoilerContext, initialState } from "./BoilerContext"

// Provider
function BoilerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(boilerReducer, initialState)

  // Simulation loop
  useEffect(() => {
    let lastTime = Date.now()

    const simulationInterval = setInterval(() => {
      const now = Date.now()
      const deltaTime = (now - lastTime) / 1000 // Convert to seconds
      lastTime = now

      dispatch({ type: "SIMULATE_TICK", deltaTime })
    }, 100) // Update 10 times per second

    return () => {
      clearInterval(simulationInterval)
    }
  }, [])

  // Actions
  const increaseGasFlow = (amount: number) => {
    dispatch({ type: "INCREASE_GAS_FLOW", amount })
  }

  const decreaseGasFlow = (amount: number) => {
    dispatch({ type: "DECREASE_GAS_FLOW", amount })
  }

  const toggleFillValve = () => {
    dispatch({ type: "TOGGLE_FILL_VALVE" })
  }

  const toggleDrainValve = () => {
    dispatch({ type: "TOGGLE_DRAIN_VALVE" })
  }

  return (
    <BoilerContext.Provider
      value={{
        state,
        increaseGasFlow,
        decreaseGasFlow,
        toggleFillValve,
        toggleDrainValve,
      }}
    >
      {children}
    </BoilerContext.Provider>
  )
}

export default BoilerProvider
