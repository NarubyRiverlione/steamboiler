The turbine feature will be added in phases

# phase 1: black-box approach

In this phase a simplified approach will be used.
The steam flow from the turbine valve will be converted to electrical energy with a fixed ratio.

- Add a typical steam to electricity efficiency ration into CstTurbine in the const.ts file.
- add a Turbine directory in context directory, with the same files as the condenser
- update the powerplant provider & context to use the turbine reducer
- add a UI routing tab 'Turbine' with the turbine component inside the componentView, just like the Condenser component
- add a Turbine directory in components, with the same files as like condenser
- the turbineReadout should show the produced electricity in MW

# phase 2: condenser adjustments

- reduce the energy from the received steam by a realistic value via adjusting the temperature and pressure. Name this calculated values outputTemp and outputPressure.
- consider modeling the energy loss with realistic physical heuristics or empirical formulas. This could be encapsulated in a dedicated calculation module.
- change the current steam intake into the condenser to take from the turbine instead of the bypass valve. Keep the requirement of reduced OptimalPressure as it is now for this intake path.
- add an intake path to the condenser so steam from the bypass valve is directly intake, without the need of reduced OptimalPressure
- both intakes from the turbine & bypass should be added and used in the condenser calculations

# phase 3: rpm & rollup

- add a rpm value to the turbine and show it as readout
- add calculation for the rpm based on the steam flow from the turbine valve & boiler pressure. the rpm should change gradely, in according of the Newton's laws of motion
- add in the turbineControl a ValueSlider to adjust the rpm set point
- add a toggle button for free or hold mode
- hold mode should adjust the turbine valve automatically to keep the rpm of the turbine at the set point

# phase 4: generator breaker

- add a generation breaker the only can be trow when the turbine is at 3600 rpm
- electricity should only be produced when the generator breaker is closed
- if with a closed breaker there isn't enough steam to keep the rpm at 3600 then the breaker should automatically open. Same with over speed.  plan for a small tolerance window around 3600

# phase 5: synchronization

- add a net demand in MW in the readout. Use a const in CstTurbine
- calculate the phase of the generator based on the turbine speed
- add a synchroscope UI in the turbineControls. this show the difference phase between the generator and the net
