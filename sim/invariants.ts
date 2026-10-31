import { CstSimulation } from "../src/context/const"
import PowerPlantState from "../src/context/PowerPlantState"
import { Sample } from "./scenario"

// A physical rule that must hold at every sample of every scenario; check returns the violations.
export type Invariant = { name: string; check: (samples: Sample[]) => string[] }

const { CstBoiler, CstCondenser } = CstSimulation
const MaxReported = 5 // violations listed per invariant, enough to see the trend
const Tolerance = 1e-9 // float noise allowed on "never rises"
const MassCreatedLimit = 0.001 // fraction of start mass
const MassLostFixed = 0.001 // fraction of start mass, allowed even with no steam out
const MassLostPerSteamOut = 0.02 // fraction of the steam that left the boiler
export const SteamStopWithin = 120 // seconds after gas reaches 0

const at = (time: number) => `t=${String(time)} s`

// One violation message per sample where the condition fails, capped at MaxReported.
const everySample =
  (fails: (state: PowerPlantState) => string | undefined) =>
  (samples: Sample[]): string[] =>
    samples
      .flatMap(({ time, state }) => {
        const message = fails(state)
        return message === undefined ? [] : [`${at(time)}: ${message}`]
      })
      .slice(0, MaxReported)

const within = (label: string, value: number, max: number) =>
  value >= 0 && value <= max ? undefined : `${label} ${String(value)} outside 0..${String(max)}`

// 1 L = 1 kg throughout, as in the ticket
export const totalWater = ({ Boiler, Condenser }: PowerPlantState) =>
  Boiler.waterVolume + Boiler.steamMass + Condenser.steamMass + Condenser.hotwellWaterVolume

// Total water with the boundary flows undone: makeup came in, reject and drain went out on purpose
export const loopWater = (state: PowerPlantState) =>
  totalWater(state) - state.Condenser.makeupTotal + state.Condenser.rejectTotal + state.Boiler.drainedTotal

// Steam out of the boiler between samples, taking each sample's flow as constant until the next
function steamOutSoFar(samples: Sample[]): number[] {
  let total = 0
  return samples.map(({ state }, i) => {
    const current = total
    const next = samples[i + 1] as Sample | undefined
    if (next) {
      const flow = state.Turbine.turbineSteamFlowOut + state.Turbine.bypassSteamFlowOut
      total += flow * (next.time - samples[i].time)
    }
    return current
  })
}

function waterNeverCreated(samples: Sample[]): string[] {
  const start = loopWater(samples[0].state)
  const steamOut = steamOutSoFar(samples)
  return samples
    .flatMap(({ time, state }, i) => {
      const mass = loopWater(state)
      const maxLoss = start * MassLostFixed + steamOut[i] * MassLostPerSteamOut
      if (mass > start * (1 + MassCreatedLimit))
        return [`${at(time)}: water ${mass.toFixed(0)} kg created from ${start.toFixed(0)} kg`]
      if (start - mass > maxLoss)
        return [`${at(time)}: water lost ${(start - mass).toFixed(0)} kg > allowed ${maxLoss.toFixed(0)} kg`]
      return []
    })
    .slice(0, MaxReported)
}

// Consecutive sample pairs while gas is off, with the time gas went to 0
function gasOffPairs(samples: Sample[]): { prev: Sample; curr: Sample; gasOffSince: number }[] {
  const pairs: { prev: Sample; curr: Sample; gasOffSince: number }[] = []
  let gasOffSince: number | undefined
  for (let i = 1; i < samples.length; i++) {
    const [prev, curr] = [samples[i - 1], samples[i]]
    if (prev.state.Boiler.gasFlow > 0 || curr.state.Boiler.gasFlow > 0) gasOffSince = undefined
    else {
      gasOffSince ??= prev.time
      pairs.push({ prev, curr, gasOffSince })
    }
  }
  return pairs
}

function cooldownNeverHeats(samples: Sample[]): string[] {
  return gasOffPairs(samples)
    .flatMap(({ prev, curr }) => {
      const [p, c] = [prev.state.Boiler, curr.state.Boiler]
      if (c.temperature > p.temperature + Tolerance)
        return [`${at(curr.time)}: temperature rose ${String(p.temperature)} → ${String(c.temperature)} °C`]
      if (c.pressure > p.pressure + Tolerance)
        return [`${at(curr.time)}: pressure rose ${String(p.pressure)} → ${String(c.pressure)} bar`]
      return []
    })
    .slice(0, MaxReported)
}

function cooldownSteamStops(samples: Sample[]): string[] {
  return gasOffPairs(samples)
    .filter(({ curr, gasOffSince }) => curr.time - gasOffSince >= SteamStopWithin)
    .flatMap(({ curr }) =>
      curr.state.Boiler.deltaSteamMass > Tolerance
        ? [`${at(curr.time)}: still generating ${String(curr.state.Boiler.deltaSteamMass)} kg/s`]
        : [],
    )
    .slice(0, MaxReported)
}

export const invariants: Invariant[] = [
  {
    name: "no NaN or Infinity",
    // Per part: Boiler and Condenser share field names such as pressure
    check: everySample((state) => {
      const bad = Object.entries(state)
        .flatMap(([part, fields]) => Object.entries(fields).map(([field, value]) => [`${part}.${field}`, value]))
        .find(([, value]) => typeof value === "number" && !Number.isFinite(value))
      return bad && `${String(bad[0])} is ${String(bad[1])}`
    }),
  },
  {
    name: "pressure within design pressure",
    check: everySample(({ Boiler }) =>
      Boiler.pressure <= CstBoiler.DesignPressure
        ? undefined
        : `pressure ${String(Boiler.pressure)} bar > ${String(CstBoiler.DesignPressure)}`,
    ),
  },
  {
    name: "temperature within design temperature",
    check: everySample(({ Boiler }) =>
      Boiler.temperature <= CstBoiler.DesignTemperature
        ? undefined
        : `temperature ${String(Boiler.temperature)} °C > ${String(CstBoiler.DesignTemperature)}`,
    ),
  },
  {
    name: "boiler water within capacity",
    check: everySample(({ Boiler }) => within("boiler water", Boiler.waterVolume, CstBoiler.TotalVolume)),
  },
  {
    name: "hotwell within capacity",
    check: everySample(({ Condenser }) =>
      within("hotwell", Condenser.hotwellWaterVolume, CstCondenser.TotalVolume),
    ),
  },
  {
    // A sample holds no pre-pump hotwell volume; "never more than the hotwell holds" is a CondenserTick test
    name: "condensation pump return within pump capacity",
    check: everySample(({ Condenser }) =>
      within("return", Condenser.returnRate, CstCondenser.CondensationPump_MaxFlowRate * CstSimulation.DeltaTime),
    ),
  },
  { name: "water is never created or lost", check: waterNeverCreated },
  { name: "natural cooldown never heats", check: cooldownNeverHeats },
  { name: "natural cooldown stops steam generation", check: cooldownSteamStops },
]
