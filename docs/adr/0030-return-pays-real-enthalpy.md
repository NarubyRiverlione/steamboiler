# The Return pays its real enthalpy, and rated steam flow follows what full gas makes

The Return no longer arrives free. It enters the boiler at the saturated liquid enthalpy of its temperature after the economizer, and that heat goes into the boiler energy and the one lumped temperature. The rule works both ways, so Return hotter than a cold boiler warms it. Rated steam flow then becomes what full gas actually makes at 165 bar, 161 kg/s and about 123 MWe (hand calculation gave 164 kg/s and 125 MWe; measured in #74), and `MaxGasFlow` stays at 420 MW of fuel. Decided in #74.

A burner sized for a 200 MWe class unit giving about 125 MWe is deliberate. A real unit of this size gets much of its feedwater heat from extraction steam, and this plant has no extraction heaters yet. The shortfall comes from them, not from the burner, so #88 is where the figure rises again.

## Considered options

- **A fixed specific heat for the Return:** rejected. The specific heat near 350 °C is more than double its value at low temperature, so the cost would come out wrong.
- **Keep 171 kg/s as the turbine's design flow:** rejected. The boiler could not reach it until #88, and rated steam flow would stop meaning the full-gas flow.
- **Raise `MaxGasFlow` to about 440 MW to reach 171 kg/s:** rejected. The sizing check found 420 MW right for this class of unit, and resizing the burner to hide missing heaters goes against the realism rule.
- **Define rated below full gas for a firing margin:** rejected. It needs a margin with no source. `turbine-load` tries rated output first; if the plant cannot hold it, the scenario targets a lower load, recorded as an operator setting.
- **Resize the pumps, the hotwell and the turbine valve:** rejected. They still cover 164 kg/s, and #88 moves the flow again.

## Consequences

- `RatedSteamFlow` stays a named constant, set from a headless run with the Return matching the steam flow, because the economizer output depends on that flow. A test pins it. The turbine figures derived from it follow.
- The relief valve's worst case becomes **no Return**: all the boiler heat goes into steam, about 457 kg/s at 178 bar ([ADR 0005](0005-relief-valve-vents-to-atmosphere.md)). Under [ADR 0029](0029-boiler-efficiency-from-flue-gas-heat-balance.md) it was full Return, as long as the Return was free.
- Stopping the Return at full gas now frees about 185 MW for steaming, so pressure rises. Starting full flow at once cools the boiler by roughly 0.5 K/s. If pressure leaves its band, the scenario operator feeds more smoothly; the plant does not change.
- In `max-output` the gas becomes the limit, not the turbine valve: full gas is reached at about 130 MW, and the plant only goes on to 142 MW on the boiler's stored heat.
- The scenario operator's boiler level hold became feedforward (the pump follows the steam, the level trims it), because the bang-bang hold of before swung the Return and the pressure once the Return cost heat. `turbine-load` shuts the bypass, whose 10 kg/s wasted heat that rated output cannot afford, and still carries rated output (123 MW, gas about 94%).
- Pump work is ignored, about 16 kJ/kg or 1% of the Return's cost.
- The 125 MWe still uses the 100 mbar rated enthalpy drop. [ADR 0032](0032-limited-condenser-and-stream-enthalpy.md) moves it to the design vacuum, about 139 MWe.
