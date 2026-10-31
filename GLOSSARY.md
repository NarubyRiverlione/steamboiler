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

**Working pressure**:
The pressure the boiler normally runs at when producing steam: 165 bar. Below the design pressure.
_Avoid_: Operating pressure, normal pressure

**Saturation pressure**:
The pressure at which the boiler water boils at its current temperature. In the boiler, pressure follows it (never below atmospheric).
_Avoid_: Boiling pressure, vapour pressure

**Saturation temperature**:
The temperature at which water boils at a given pressure. Condensate leaves the condenser at the saturation temperature of the condenser pressure (about 41 °C at 80 mbar).
_Avoid_: Boiling temperature

**Relief valve**:
The boiler's automatic safety valve. It opens fully at 178 bar and closes again at 171 bar, passes at least all the steam the boiler can make at full gas, and cannot be operated by hand.
_Avoid_: Safety valve, pressure cap, blow-off

**Lift**:
One opening of the relief valve, from opening to closing.
_Avoid_: Trip (a turbine trip closes the turbine valve; a burner trip is #33), pop

**Blowdown**:
The pressure drop between the relief valve opening and closing: 7 bar, about 4% of the opening pressure.
_Avoid_: Hysteresis, deadband

**Vent**:
Steam released by the relief valve to the atmosphere. It leaves the loop and is counted in the mass balance.
_Avoid_: Leak, bleed

### Turbine and generator

**Sync speed**:
The turbine speed at which the generator matches the 50 Hz grid: 3000 rpm.
_Avoid_: Max RPM, rated speed

**Rated steam flow**:
The steam flow through the turbine with the turbine valve fully open: 200 kg/s.
_Avoid_: Max steam removal, nominal flow

**Electric output**:
The power the generator delivers to the grid, in MW. Only produced with the breaker closed at sync speed; it follows from the steam flow and from the energy the turbine takes out of each kilogram, which depends on boiler pressure and condenser pressure.
_Avoid_: Power, electricity, MW readout

**Vacuum limit**:
The highest condenser pressure at which the turbine valve may be open or be opened. Above it the exhaust steam has nowhere to go, so the turbine is not allowed to take steam.
_Avoid_: Bell curve, optimal pressure, vacuum permissive

**Turbine trip**:
The automatic, full closing of the turbine valve when condenser pressure rises above the vacuum limit. It also switches hold mode off; the turbine only takes steam again when the operator reopens the valve.
_Avoid_: Trip (on its own), shutdown

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

**Heat loss**:
Heat the boiler gives off to its surroundings, proportional to how far the water is above ambient temperature.
_Avoid_: Cooling rate, natural cooling (that is the resulting behaviour, see Natural cooldown)

**Heating-rate limit**:
The fastest the boiler water temperature may rise without over-stressing the drum: 0.4 K/s (24 K/min), a time-compressed version of the real limit of about 100 K/h. Going over it raises an alarm; nothing is limited or tripped automatically.
_Avoid_: Ramp limit, max heat-up rate

**Natural cooldown**:
The plant left alone with gas off and all valves closed, cooling down on its own.
_Avoid_: Shutdown, trip
