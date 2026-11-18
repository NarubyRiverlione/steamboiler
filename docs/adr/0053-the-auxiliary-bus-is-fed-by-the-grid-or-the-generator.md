# The auxiliary bus is fed by the grid or the generator

**Status: accepted.** Decided in #141, M2 of [ADR 0046](0046-from-island-to-town-grid-in-milestones.md). Builds on the auxiliary load of #140; amends nothing in [ADR 0027](0027-generator-load-is-a-resisting-torque.md), whose gross load and torque stay as they are.

The pumps need power. The **Auxiliary bus** is fed by a **Grid supply breaker** (new, `gridSupplyBreaker` in `PowerPlantState`), by the **Generator breaker**, or both. The bus is **live** when either is closed; this is derived each tick (`isBusLive`), never stored. With both open it is a **Dead bus**.

## Decisions

- **The grid supply breaker starts closed** in every scenario and in a new game, so the golden and edge runs do not change (the snapshots only gain the field). A dark-start scenario (`dark-start`) starts it open.
- **Closing is always allowed** (stiff grid, no sync check). Two reducer actions, `CLOSE_GRID_SUPPLY_BREAKER` and `OPEN_GRID_SUPPLY_BREAKER`.
- **The generator carries the bus** whenever its breaker is closed; a closed grid supply breaker is then the backup tie. Gross load stays the shaft load: no new torque, the auxiliary load only gates the pumps and reads in net output (ADR 0027, #140).
- **Opening the grid supply breaker** is refused (with a reason, in the style of `loadSetpointRefusal`) unless the generator breaker is closed and the **actual** electric output is at least the auxiliary load. The setpoint is not tested: the load follows it at the load rate.
- **The load setpoint floor:** while the grid supply breaker is open a setpoint below the auxiliary load is refused with a reason. There is no other floor: #139's 10 MW basic load was closed as not planned.
- **A dead bus stops every pump:** the feed, condensation, recirculation and air extraction pumps and the lube oil pump deliver nothing, the turning gear motor stops and the gear drops out (like the low-oil dropout of [ADR 0051](0051-turning-gear-holds-the-stopped-rotor-and-blocks-the-valve.md); it stays out and is engaged again by hand), and the auxiliary load is 0. The stored valve positions, the oil pump switch, the air pump switch and the latched trip flags are untouched: `PowerPlantTick` hands the sub-ticks a plant with the pumps stopped and puts the operator's positions back afterwards. The turning gear cannot be engaged on a dead bus.
- **No special blackout trip.** The existing protections act: low water (the burner trip), and the low lube oil trip of [ADR 0050](0050-lube-oil-pressure-permissive-and-trip.md) on a rolling turbine. There is no emergency DC oil pump until #159. Same stance as ADR 0027: failures need no special logic. The generator breaker auto-opens when the speed leaves the ±2 rpm window (ADR 0027), which is how a dead bus arises with the grid supply breaker open.
- **Resume without a reset:** when the bus is fed again the pumps run at their operator-set positions, and the lube oil pump runs if it is switched on. A lost supply is not a protective trip, unlike [ADR 0043](0043-trip-reset.md); latched trips still need their reset.

## Considered options

- **A net load setpoint** (the operator sets the net output, the generator adds the auxiliary load): rejected. It changes what the setpoint means, breaks the gross torque model of ADR 0027 and hides the auxiliary load the operator should see. The setpoint stays gross and net output stays a reading.
- **A blackout trip:** rejected, see above: the existing protections are enough and a new trip needs its own reset rules.
- **Resetting the pumps to zero on a dead bus:** rejected. A dead bus is not a trip; the operator's positions are kept and the plant resumes when the bus is fed.

## Consequences

- `PowerPlantState` gains `gridSupplyBreaker`; snapshots were regenerated for the field. `auxiliaryLoadOf` returns 0 on a dead bus.
- The app has no breaker switch yet (#142); until then the grid supply breaker stays closed in the app.
- The onsite diesel generator is out of scope and moves to its own ticket, blocked by this one; ADR 0046 no longer lists it in M2. Transformers and excitation stay in [real-plant-gaps.md](../plant/real-plant-gaps.md).
