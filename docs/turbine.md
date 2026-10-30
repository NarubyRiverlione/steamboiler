# Turbine and generator

The turbine is built in phases. Steam from the boiler passes the turbine valve, spins the turbine, and the generator turns that into electricity.

| Phase | Scope | Status |
|---|---|---|
| 1 | Black box: steam flow → electricity at a fixed ratio | ✅ |
| 2 | Turbine exhaust feeds the condenser, with energy loss | ✅ |
| 3 | RPM physics, set point, free/hold mode with PID | ✅ |
| 4 | Generator breaker | in progress (uncommitted on branch `turbine-4`) |
| 5 | Synchronisation and synchroscope | planned |

## Phase 1: black-box

- Typical steam-to-electricity efficiency ratio in `CstTurbine` (`const.ts`)
- `Turbine` directories in `context/` and `components/`, mirroring the condenser files
- Turbine reducer wired into the PowerPlant provider and context; a 'Turbine' routing tab
- Readout shows produced electricity in MW

## Phase 2: condenser coupling

- Steam leaving the turbine has reduced energy: `outputTemp` and `outputPressure`, via a dedicated heuristic or empirical loss calculation
- The condenser takes its steam from the turbine instead of the bypass valve, and keeps the reduced `OptimalPressure` requirement for that path
- The bypass valve gets its own condenser intake without the pressure requirement
- Both intakes are used in the condenser calculations (see [condensor plan.md](condensor%20plan.md))

## Phase 3: RPM and control

- RPM readout, RPM set point slider, and a free/hold toggle in the turbine control panel
- Hold mode adjusts the turbine valve automatically to keep the set point

**RPM physics** follow Newton's laws for rotation, so RPM changes gradually. Constants in `CstTurbine`:

| Constant | Value | Role |
|---|---|---|
| MomentOfInertia | 25000 kg·m² | resistance to speed change (large industrial turbine) |
| FrictionFactor | 0.02 | friction rises with RPM and gives a natural equilibrium |
| TorqueFactor | 0.05 | converts steam flow and pressure to torque |

**PID controller** (hold mode): Kp = 0.001 (current error), Ki = 0.0001 (accumulated error, removes steady-state error), Kd = 0.0005 (error rate, damping). Its memory (`pidIntegralError`, `pidPreviousError`) lives in `TurbineState`, so a tick depends on its input state alone; it carries over when hold mode is toggled.

**Electricity** is only generated with the breaker closed at sync speed (3000 RPM ±2), as the generator must match the 50 Hz grid. `MaxRPM` (3300) is the overspeed limit and caps the RPM setpoint; the setpoint defaults to sync speed.

Calculations: `src/utils/turbineCalculations.ts`; tick: `src/context/Turbine/TurbineTick.ts`.

## Phase 4: generator breaker

- The breaker can only be closed at sync speed: 3000 RPM ±2 (`SyncRPM` ± `BreakerRPMMargin`, 50 Hz grid)
- Electricity is only produced while the breaker is closed
- If the steam flow cannot hold sync speed with the breaker closed, the breaker opens automatically
- With the breaker closed, more steam flow gives more electricity while RPM stays at sync speed
- UI: `GeneratorBreakerControl.tsx`

## Phase 5: synchronisation

- Add a net demand in MW to the readout (constant in `CstTurbine`)
- Calculate the generator phase from turbine speed
- Add a synchroscope to the turbine controls showing the phase difference between generator and grid

## Known issue

One test fails in `TurbineTick.test.ts` (`electricOutput` expectation). Fix it before relying on the suite as a regression guard.
