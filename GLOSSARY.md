# Steam Power Plant

A simulated steam power plant: a gas-fired drum boiler drives a turbine and generator, and a condenser returns the steam as water to the boiler.

## Language

### Limits

**Design pressure**:
The highest pressure the boiler may ever reach: 180 bar.
_Avoid_: Max pressure, pressure limit

**Design temperature**:
The highest boiler water temperature: the saturation temperature at design pressure (about 357 °C).
_Avoid_: Max temperature

### Turbine and generator

**Sync speed**:
The turbine speed at which the generator matches the 50 Hz grid: 3000 rpm.
_Avoid_: Max RPM, rated speed

### Operation

**Ambient temperature**:
The temperature of the plant's surroundings: 20 °C. Natural cooling stops here.
_Avoid_: Room temperature, minimum temperature

**Cold state**:
The plant at rest: all water at ambient temperature, atmospheric pressure, every pump, valve and the gas off. The UI and the cold scenarios start here.
_Avoid_: Cold start (that is the operation of bringing the plant up from the cold state), warm start

**Snapshot**:
A saved full plant state that a scenario can start from instead of replaying the operation leading up to it.
_Avoid_: Preset (reserved for the UI choices of #24), save game

**Makeup**:
Demineralised water fed into the condenser hotwell from outside the loop, to top up losses. Never into the boiler.
_Avoid_: Fill, top-up valve

**Reject**:
Hotwell water sent out of the loop to storage when the hotwell is too full.
_Avoid_: Dump, overflow

**Return**:
Hotwell water pumped into the boiler by the condensation pump. Limited by what the hotwell holds and the room left in the boiler; whatever cannot be returned stays in the hotwell.
_Avoid_: Feedwater, refill

**Natural cooldown**:
The plant left alone with gas off and all valves closed, cooling down on its own.
_Avoid_: Shutdown, trip
