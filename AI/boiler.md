Create in this react app a simulation of a steam boiler.

There should be a + and - button to simulate add or removing more or less heat as energy source to the boiler
The energy supplied should heat the water over time
Show the amount of energy supplied
By reducing the energy the boiler should naturally cool down at the rate of 1 degree every 10 seconds
Use the Antoine equation for the water temperature and pressure

Use degree Celsius for temperature unit and bar for pressure unit. Use Joules as energy unit
All readout should have be rounded to 1 decimal

There should be a unit test with jest for the energy to temperature and pressure calculation

The boiler should have a fill and drain valve for controlling the water content
This water valves should change the boiler content over time
Filling should be 0.5 % per second, draining 1% per second

The should be a gauge for the water level, temperature and pressure

There should be a pressure release valve to reduce the pressure

All valve are button that should there open or closed state
Add an indication how much each valve is open

The start pressure of the boiler should be 1 bar. The start temperature 90 degrees
Adjust the start heat supplied to keep the 90 degrees
The water content should be 50% at the start

show the change of energy of the boiler per second