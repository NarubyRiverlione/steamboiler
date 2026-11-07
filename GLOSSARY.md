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
_Avoid_: Trip (a turbine trip closes the turbine valve; a burner trip shuts the gas), pop

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
The steam flow the plant is rated for, the full-gas steam flow: 171 kg/s. A design figure: the sim can pass more at 165 bar (see the departures in `design-basis.md`).
_Avoid_: Nominal flow

**Valve capacity**:
The steam flow through the turbine valve or the bypass when fully open at working pressure: 200 kg/s each. The flow falls with boiler pressure. A valve limit, not a steady flow.
_Avoid_: Max steam removal, rated steam flow

**Electric output**:
The power the generator delivers to the grid, in MW: the load it carries. It is an input to the shaft, not a result of the steam flow, and is 0 MW with the breaker open or at the no-load flow.
_Avoid_: Power, electricity, MW readout

**Load**:
The electric power the generator carries, a resisting torque on the shaft. More load slows the shaft, so the Hold mode opens the valve and takes more steam.
_Avoid_: Demand, consumption, shaft load, generator torque

**Load setpoint**:
The load the operator asks for, in MW, from 0 up to the load setpoint limit, above the rated output. Only settable with the breaker closed. The load moves toward it at the load rate.
_Avoid_: Net demand, demand, target load

**Load rate**:
The rate at which the load moves toward the load setpoint: 3% of the rated output per minute, up and down. When the breaker opens the load is lost at once, whatever the load rate.
_Avoid_: Ramp rate (that is the run-up rate), load ramp

**Vacuum limit**:
The highest condenser pressure at which the turbine valve may be open or be opened. Above it the exhaust steam has nowhere to go, so the turbine is not allowed to take steam.
_Avoid_: Bell curve, optimal pressure, vacuum permissive

**Free mode**:
The speed mode in which the operator moves the turbine valve by hand and no controller acts on it.
_Avoid_: Manual mode

**Ramp up**:
The speed mode for every start: the turbine valve moves automatically so the turbine climbs to the selected run-up point at the run-up rate. On arrival it engages hold mode at that point. It only goes up.
_Avoid_: Run-up mode, auto start

**Hold mode**:
The speed mode that keeps the turbine at the selected run-up point by moving the turbine valve. It engages only within ±5 rpm of that point, and never takes the turbine to a new speed. It is also the mode that adds steam when electrical load is added to the shaft.
_Avoid_: Autopilot, speed hold, cruise

**Run-up point**:
One of the fixed speeds the operator can select: 500, 1500, 2500 or 3000 rpm (sync speed). Ramp up climbs to it and hold mode keeps it.
_Avoid_: Setpoint (on its own), soak point

**Run-up rate**:
The rate, in rpm per minute, at which Ramp up moves its speed reference toward the selected run-up point. The turbine is brought up gradually to protect the rotor, not as fast as the steam would take it.
_Avoid_: Acceleration, ramp rate, spin-up

**No-load flow**:
The steam flow that holds the turbine at sync speed with the breaker open: it only covers the turbine's own losses (windage and bearings).
_Avoid_: Idle flow, minimum flow

**Turbine trip**:
The automatic, full closing of the turbine valve when condenser pressure rises above the vacuum limit, or when the main steam valve closes on low pressure with the turbine valve open. It also returns the speed mode to Free; the turbine only takes steam again when the operator reopens the valve.
_Avoid_: Trip (on its own); for the operator's planned stop see Shutdown

**Exhaust quality**:
The share of the turbine exhaust that is still vapour, by mass. The rest is exhaust moisture, already liquid when it reaches the condenser.
_Avoid_: Dryness, wetness

### Flue gas

**Flue gas**:
The exhaust of the burner, on its way through the boiler and the economizer to the chimney.
_Avoid_: Exhaust (that is the turbine's), smoke

**Economizer**:
The heat exchanger where flue gas heats the Return on its way to the boiler. With no Return it recovers nothing.
_Avoid_: Feedwater heater, preheater

**Stack temperature**:
The flue gas temperature where it leaves for the chimney.
_Avoid_: Exit temperature, chimney temperature

**Boiler efficiency**:
The share of the fuel's lower heating value that ends up in the water, counting the boiler and the economizer together.
_Avoid_: Burner efficiency, gas efficiency

**Extraction steam**:
Steam taken from the turbine partway through its expansion.
_Avoid_: Bleed steam, tap steam

**Extraction heater**:
The heat exchanger where extraction steam heats the Return on its way to the economizer.
_Avoid_: Feedwater heater, preheater

**Heater drain**:
The condensed extraction steam, pumped forward into the Return after the extraction heater.
_Avoid_: Drain (that is the boiler's)

**Cooling water**:
The water that takes the condenser's heat, drawn in by the recirculation pump.
_Avoid_: Recirculation water, circulating water

**Cooling water rise**:
How much the cooling water warms up across the condenser.
_Avoid_: Temperature rise, delta T

**Terminal temperature difference**:
How far the cooling water leaves below the saturation temperature of the condenser.
_Avoid_: TTD, approach

### Operation

**Ambient temperature**:
The temperature of the plant's surroundings: 20 °C. Heat loss stops here.
_Avoid_: Room temperature, minimum temperature

**Cold state**:
The plant at rest: all water at ambient temperature, atmospheric pressure, every pump, valve and the gas off. The UI and the cold scenarios start here.
_Avoid_: Cold start (that is the operation of bringing the plant up from the cold state), warm start

**Pressure hold**:
The phase after the boiler has been brought up to working pressure, in which the operator keeps it there by matching the steam the boiler generates to the steam leaving it, with the gas.
_Avoid_: Pressure control, steady state (that is the outcome, not the operation)

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
Hotwell water pumped through the economizer into the boiler by the condensation pump. Limited by what the hotwell holds and the room left in the boiler; whatever cannot be returned stays in the hotwell.
_Avoid_: Feedwater, refill

**Hotwell level**:
How full the hotwell is, as the water volume over the hotwell's total volume. Measured on volume, not mass, as a real level gauge does.
_Avoid_: Hotwell fill, hotwell mass

**Normal level**:
The hotwell level the loop is run at: 70%, inside the working band.
_Avoid_: Target level, setpoint (on its own)

**Working band**:
The hotwell levels the operator keeps without acting: 55% to 75%. Makeup opens below it and reject above it, in proportion to the distance; both are shut inside it.
_Avoid_: Deadband, control band

**Hotwell level alarm**:
A warning when the hotwell level falls below 25% or rises above 85%. Nothing is limited or tripped automatically.
_Avoid_: Level trip, low-low, high-high (those are protections)

**Low-low level**:
The hotwell level below which the condensation pump would cavitate: 10%. Reaching it causes a condensation pump trip.
_Avoid_: Empty, dry hotwell

**Condensation pump trip**:
The automatic, full closing of the condensation pump valve when the hotwell level falls below the low-low level. The pump only runs again when the operator reopens it, and that is refused while the level is still below low-low.
_Avoid_: Pump stop, start inhibit

**High-high level**:
The hotwell level above which the hotwell may overfill: 95%. Reaching it causes a makeup block.
_Avoid_: Full, overflow

**Makeup block**:
The protection at the high-high level: makeup closes and cannot be opened, and reject is forced fully open, until the hotwell level is back below the high alarm (85%).
_Avoid_: Makeup trip, overfill clamp

**Burner low-low level**:
The boiler water level below which the burner trips: 20% of the boiler volume.
_Avoid_: Empty, dry boiler

**Burner trip**:
The automatic shutting of the gas to 0 when the boiler water level falls below the burner low-low level. The gas only comes back when the operator raises it, and that is refused while the level is still below low-low.
_Avoid_: Gas limit, burner stop, trip (on its own)

**Heat loss**:
Heat the boiler gives off to its surroundings, proportional to how far the water is above ambient temperature.
_Avoid_: Cooling rate, natural cooling (that is the resulting behaviour, see Natural cooldown)

**Heating-rate limit**:
The fastest the boiler water temperature may rise without over-stressing the drum: 0.4 K/s (24 K/min), a time-compressed version of the real limit of about 100 K/h. Going over it raises an alarm; nothing is limited or tripped automatically.
_Avoid_: Ramp limit, max heat-up rate

**Natural cooldown**:
The plant left alone with gas off and all valves closed, cooling down on its own. It is the state a Shutdown ends in.
_Avoid_: Shutdown (that is the operator procedure leading to it), trip

**Shutdown**:
The operator's planned stop, the way the plant is meant to be taken out of service: gas off, breaker open, speed mode to Free with the turbine valve closed, then the main steam valve and the bypass valve closed. Nothing trips; it ends in the Natural cooldown.
_Avoid_: Trip, cooldown (that is the state that follows)
