# Condenser pressure

## readout

- add a readout for the vacuum in the condenser in mBar

## air extraction pump (CAR)

- add a toggle to start/stop the air extraction pump
- the pump should create a gradually a vacuum defined
- define in CstSimulator.Condenser.AirExtractionPump.MaxVacuum the target vacuum in mbar
- define the time it take in CstSimulator.Condenser.AirExtractionPump.TimeNeeded
- stopping the CAR should remove the vacuum gradually

## steam jec air extraction (SJAE)

the SJAE reduce the pressure in the condenser

- add a toggle to enable/disable the SJAE
- disable the SJAE automatically if :
  - there is not steam flow in the Master Steam Valve
  - the pressure in the condenser if above +10 mbar of theCstSimulator.Condenser.AirExtractionPump.MaxVacuum
- add a open & close button to adjust the SJA valve position in 10% increments
- if the SJAE is disabled the valve position is ignored
- without SJAE enabled the pressure should gradually climb
- with a enabled SJAE create a vacuum over time based on the steam flow and SJAE valve position
