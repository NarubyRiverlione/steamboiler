# The scenarios hold working pressure with gas, not with the steam valve

Once a boiler is at working pressure it holds it by matching the steam it generates to the steam leaving it. A real plant at fixed load does this with the burner: the turbine (or bypass) takes the steam the load needs, and the fuel follows. The `bypass-loop` first held 165 bar by moving the bypass, which hunted between 55% and 100% and lifted the relief valve; `startup-cold` held nothing and ran past design temperature. Decided in #43.

Both scenarios now run two phases (GLOSSARY.md, "Pressure hold"). **Build pressure** differs per scenario. In `turbine-runup` the main steam valve opens at 780 s and the turbine valve is cracked to 5% with gas at `StartGas`, so less steam leaves than is generated and pressure rises. In `bypass-loop` the main steam valve stays shut during heat-up ([ADR 0018](0018-cold-fill-at-35-percent.md)) and opens at working pressure, with gas brought down to `StartGas`. **Pressure hold**: from 165 ± 2 bar gas is the throttle (`sim/scenarios/pressure-hold.ts`, shared by both operators), moving against the pressure trend inside the band. The steam valve sits at a fixed load opening: the bypass at 10% (20 kg/s), the turbine valve at 9.1% (18.2 kg/s, steam × pressure = 3003 rpm).

## Considered options

- **Hold with the bypass (the first #43 design):** the valve is a fast actuator on a slow process (the water and 100 t of steel have to change temperature), so it hunts, and it cannot carry the turbine's load later.
- **Hold with the turbine valve and hold mode:** that is the speed governor and the breaker margin of #18; out of scope here.
- **Gas with no floor:** the overshoot after the build phase drives gas to 0 for two minutes, which reads as a cooling plant to the cooldown invariant. A burner cannot modulate to zero and stay lit anyway.
- **Gas hold with a minimum firing rate, a fixed valve opening (chosen).**

## Consequences

- The turbine speed has a time constant of about 2600 s, so `startup-cold` runs 14000 s to reach 3000 ± 50 rpm in its last 600 s; `bypass-loop` runs 7200 s because its level cycle settles after about 6600 s.
- `startup-cold` needs the loop operator's level, cooling and hotwell holds in the hold phase: 18 kg/s leaving dries the boiler at about 7500 s otherwise.
- The minimum firing rate (100 L/s) is in the register of `docs/plant/design-basis.md`.
- Rounding adds up per tick, so the water-created invariant limit grows with run time (`docs/dev/headless-runner.md`, Water drift).
