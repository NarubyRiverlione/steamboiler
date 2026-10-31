# Boiler pressure follows saturation; playability never alters the physics

Boiler pressure is the saturation pressure of the water temperature, never below atmospheric: `P = max(1.013 bar, Psat(T))`. Steam mass no longer feeds into pressure, and the steam-volume expansion factors, the damping factor and any ideal-gas term are removed. The plant is modelled at utility scale (README, Major Dimensions) with realistic state and property physics. To keep the simulator pleasant to run, playability comes from how the utilities are sized, plus the few deliberate departures listed in the README register (currently the reduced boiler volume and the scaled heating-rate limit), never from altering the pressure law or the steam table.

## Considered options

- **Steam-volume scaling with expansion factors (previous model):** gave 100 to 300+ bar in normal states and runaway to `Infinity`; the constants contradicted each other.
- **Ideal-gas steam plus saturation:** only meaningful with non-condensable gas in the drum, which is not modelled.
- **Saturation only (chosen):** a drum holds water and steam in equilibrium, so pressure is a function of temperature. Pressure drops under steam draw because the draw removes latent heat and cools the water.

## Consequences

- Correct pressure at 165 to 180 bar depends on the steam table being right at high pressure (#22).
- Overfill (no steam space left) is not handled by the pressure law; the water level is clamped and #34 owns the solid-water case.
- Over-pressure is not capped by the pressure law; the relief valve (#9) and burner protection (#33) own it.
- How fast pressure moves under draw depends on thermal mass; #12 uses water only and #13 adds metal mass and heat loss.
