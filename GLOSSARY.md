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

**Natural cooldown**:
The plant left alone with gas off and all valves closed, cooling down on its own.
_Avoid_: Shutdown, trip
