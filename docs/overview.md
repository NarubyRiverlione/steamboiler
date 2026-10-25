# Overview

A physics-based simulator of a steam power plant: gas-fired boiler → turbine → condenser, closed water loop. The user operates the plant manually (valves, burner, pumps, breaker) and watches temperature, pressure, flow and electrical output respond in real time.

## Purpose

An educational tool for the thermodynamics of steam generation and power production without the risk or cost of a physical plant.

- **Engineering training**: a safe place to practise plant operation and start-up sequences
- **Visualisation**: makes temperature, pressure, volume and energy relationships tangible
- **Education**: students, educators, professionals refreshing their knowledge, curious learners

## UX goals

1. **Intuitive controls**: direct control over the key parameters (gas flow, valves, pumps, breaker)
2. **Real-time feedback**: visual and numerical response to every change
3. **Educational insight**: show the relationships between the physical quantities
4. **Realistic behaviour**: the simulation matches real-world intuition

## Key use cases

1. **Basic operation**: fill the boiler, heat it with gas, watch steam develop
2. **Parameter exploration**: vary gas flow and water level, observe temperature, pressure and steam rate
3. **Thermodynamic analysis**: boiling point versus pressure, energy distribution
4. **System control**: hold a condition (pressure, RPM, output) by adjusting inputs
5. **Full power-up**: vacuum, steam admission, spin-up to rated RPM, generator breaker

## Success criteria

- Correct thermodynamics, using an energy-balance approach throughout
- Clear visualisation of invisible processes
- Realistic response to inputs
- Numerical stability, even under extreme conditions

## Subsystems

| Subsystem | Doc |
|---|---|
| Boiler | [boiler.md](boiler.md) |
| Turbine and generator | [turbine.md](turbine.md) |
| Condenser | [condensor plan.md](condensor%20plan.md) |
