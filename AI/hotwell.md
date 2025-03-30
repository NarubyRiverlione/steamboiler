# hotwell

steam flow from the boiler (boilerState.steamFlowOut) fills the hotwell

- add a relative readout for the hotwell level. at start this is 0, become positive when level raises, negative when is falls

# condenser

## level

when the condenser pressure is between 40 and 70 mbar the condenser drains the hotwell.

- add a readout for the flowrate of the hotwell to the condenser

## recirculation pump

- Add a realistic flow rate for a recirculation pump that provides cooling to the condenser
- add a 'valve slider' component for the control of the recirculation pump

## condensation

- add a realistic calculation of turning steam into liquid with the provided cooling of the recirculation pump
- add readouts to show the volume of steam(vapor) and liquid
