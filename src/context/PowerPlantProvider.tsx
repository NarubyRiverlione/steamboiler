import { ReactNode, useReducer, useEffect, useRef, useCallback } from "react"
import { CstSimulation } from "./const.ts"
import { PowerPlantContext } from "./PowerPlantContext.tsx"
import PowerPlantAction from "./PowerPlantActions.ts"
import { PlaybackSpeed, WallClock, simulatedSeconds, startWallClock, ticksDue } from "./Playback.ts"
import { makeInitialSimulation, simulationReducer } from "./SimulationReducer.ts"
import { SpeedMode } from "./PowerPlantState.ts"

// Provider
function PowerPlantProvider({ children }: { children: ReactNode }) {
  const [simulation, simulationDispatch] = useReducer(simulationReducer, undefined, () => makeInitialSimulation())
  const state = simulation.plant
  const dispatch = simulationDispatch as (action: PowerPlantAction) => void

  // Simulation loop: ticks due from the elapsed wall time, one batched update per interval (ADR 0034).
  // The speed is read through a ref so a speed change does not restart the timer or lose the carried fraction.
  const speedRef = useRef<PlaybackSpeed>(simulation.speed)
  useEffect(() => {
    speedRef.current = simulation.speed
  }, [simulation.speed])
  useEffect(() => {
    let wallClock: WallClock = startWallClock(performance.now())
    const simulationInterval = setInterval(() => {
      const due = ticksDue(wallClock, performance.now(), speedRef.current, document.hidden)
      wallClock = due.clock
      if (due.ticks > 0) simulationDispatch({ type: "SIMULATE_TICKS", count: due.ticks })
    }, CstSimulation.UpdateInterval)

    // Browsers throttle timers in a hidden tab: restart the wall clock on every visibility change so nothing is caught up
    const onVisibilityChange = () => {
      wallClock = startWallClock(performance.now())
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      clearInterval(simulationInterval)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [])

  const setPlaybackSpeed = useCallback((speed: PlaybackSpeed) => {
    simulationDispatch({ type: "SET_PLAYBACK_SPEED", speed })
  }, [])

  //#region  Boiler action creators
  const setGasRate = (gasRateCommand: number) => {
    dispatch({ type: "SET_GAS_RATE", payload: { gasRateCommand } })
  }
  const toggleDrainValve = () => {
    dispatch({ type: "TOGGLE_DRAIN_VALVE" })
  }
  //#endregion

  //#region Superheater action creators
  const setAttemperatorAuto = (attemperatorAuto: boolean) => {
    dispatch({ type: "SET_ATTEMPERATOR_AUTO", payload: { attemperatorAuto } })
  }
  const adjustSprayValve = (amount: number) => {
    dispatch({ type: "SET_SPRAY_VALVE_POSITION", payload: { sprayValvePosition: amount } })
  }
  //#endregion

  //#region Turbine action creators
  const adjustBypassValve = (position: number) => {
    dispatch({ type: "ADJUST_STEAM_BYPASS_VALVE", payload: { bypassValvePosition: position } })
  }
  const toggleMainSteamValve = () => {
    dispatch({ type: "TOGGLE_MAIN_STEAM_VALVE" })
  }
  const adjustTurbineValve = (position: number) => {
    dispatch({ type: "ADJUST_STEAM_TURBINE_VALVE", payload: { turbineValvePosition: position } })
  }
  const setSpeedMode = (speedMode: SpeedMode) => {
    dispatch({ type: "SET_SPEED_MODE", payload: { speedMode } })
  }
  const selectRunUpPoint = (runUpPoint: number) => {
    dispatch({ type: "SELECT_RUN_UP_POINT", payload: { runUpPoint } })
  }

  const toggleGeneratorBreaker = () => {
    dispatch({ type: "TOGGLE_GENERATOR_BREAKER" })
  }
  const setLoadSetpoint = (loadSetpoint: number) => {
    dispatch({ type: "SET_LOAD_SETPOINT", payload: { loadSetpoint } })
  }
  //#endregion

  //#region Condenser action creators
  const toggleAirExtractionPump = () => {
    dispatch({
      type: "SET_AIR_EXTRACTION_PUMP_ENABLED",
      payload: { isAirExtractionPumpEnabled: !state.Condenser.isAirExtractionPumpEnabled },
    })
  }
  const toggleDeaeratorVent = () => {
    dispatch({ type: "TOGGLE_DEAERATOR_VENT" })
  }
  const toggleSjae = () => {
    dispatch({
      type: "SET_SJAE_ENABLED",
      payload: { isSjaeEnabled: !state.Condenser.isSjaeEnabled },
    })
  }
  const adjustSjaeValvePosition = (position: number) => {
    dispatch({
      type: "SET_SJAE_VALVE_POSITION",
      payload: { sjaeValvePosition: position },
    })
  }
  const adjustRecirculationPumpValvePosition = (position: number) => {
    dispatch({
      type: "SET_RECIRCULATION_PUMP_VALVE_POSITION",
      payload: { recirculationPumpValvePosition: position },
    })
  }
  const adjustCondensationPumpValvePosition = (position: number) => {
    dispatch({
      type: "SET_CONDENSATION_PUMP_VALVE_POSITION",
      payload: { condensationPumpValvePosition: position },
    })
  }
  const adjustFeedPumpValvePosition = (position: number) => {
    dispatch({ type: "SET_FEED_PUMP_VALVE_POSITION", payload: { feedPumpValvePosition: position } })
  }
  const adjustMakeupValvePosition = (position: number) => {
    dispatch({ type: "SET_MAKEUP_VALVE_POSITION", payload: { makeupValvePosition: position } })
  }
  const adjustRejectValvePosition = (position: number) => {
    dispatch({ type: "SET_REJECT_VALVE_POSITION", payload: { rejectValvePosition: position } })
  }
  //#endregion

  return (
    <PowerPlantContext.Provider
      value={{
        state,
        dispatch,
        // time control
        playbackSpeed: simulation.speed,
        simulatedSeconds: simulatedSeconds(simulation.ticks),
        setPlaybackSpeed,
        // boiler actions
        setGasRate,
        toggleDrainValve,
        // superheater actions
        setAttemperatorAuto,
        adjustSprayValve,
        // turbine rpm control actions
        adjustBypassValve,
        toggleMainSteamValve,
        adjustTurbineValve,
        setSpeedMode,
        selectRunUpPoint,
        setLoadSetpoint,
        toggleGeneratorBreaker,
        // deaerator actions
        toggleDeaeratorVent,
        adjustFeedPumpValvePosition,
        // condenser actions
        toggleAirExtractionPump,
        toggleSjae,
        adjustSjaeValvePosition,
        adjustRecirculationPumpValvePosition,
        adjustCondensationPumpValvePosition,
        adjustMakeupValvePosition,
        adjustRejectValvePosition,
      }}
    >
      {children}
    </PowerPlantContext.Provider>
  )
}
export default PowerPlantProvider
