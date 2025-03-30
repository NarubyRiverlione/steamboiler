# Technical Context

## Technology Stack

The Steam Boiler Simulation is built using the following technologies:

### Frontend Framework

- **React**: Core UI library
- **TypeScript**: For type-safe code
- **Vite**: Build tool and development server

### State Management

- **React Context API**: For state management
- **useReducer Hook**: For state transitions and simulation logic

### Styling

- **CSS**: Custom styling with CSS files

### Condenser

- **Condenser.tsx**: Component for condensing steam back into water.
- **CondenserReducer.ts**: Manages the condenser's state.
- **CondenserTypes.ts**: Defines the types used by the condenser.

## Project Structure

```
steamboiler-web/
├── public/               # Static assets
├── src/
│   ├── components/       # UI components
│   │   ├── simulator.css # Shared simulator styling
│   │   ├── Boiler/       # Boiler components
│   │   │   ├── Boiler.tsx             # Main boiler component
│   │   │   ├── BoilerControlPanel.tsx # Control panel for boiler
│   │   │   ├── BoilerGasControl.tsx   # Gas control for boiler
│   │   │   ├── BoilerReadouts.tsx     # Readouts for boiler
│   │   │   ├── BoilerSteamValveControl.tsx # Steam valve control
│   │   │   ├── BoilerVisual.tsx       # Visual representation of boiler
│   │   │   └── BoilerWaterControl.tsx # Water control for boiler
│   │   └── Condenser/    # Condenser components
│   │       ├── Condenser.tsx          # Main condenser component
│   │       ├── CondenserControlPanel.tsx # Control panel for condenser
│   │       ├── CondenserReadouts.tsx  # Readouts for condenser
│   │       └── CondenserVisual.tsx    # Visual representation of condenser
│   ├── context/          # State management
│   │   ├── PowerPlantProvider.tsx # Context provider for the whole power plant
│   │   ├── PowerPlantContext.tsx  # Context for the whole power plant
│   │   ├── const.ts             # Constants
│   │   ├── Boiler/      # Boiler state management
│   │   │   ├── BoilerReducer.ts # Reducer with simulation logic
│   │   │   ├── BoilerTick.ts    # Tick logic for boiler
│   │   │   └── BoilerTypes.ts   # TypeScript types for boiler
│   │   └── Condenser/   # Condenser state management
│   │       ├── CondenserReducer.ts # Reducer for condenser
│   │       └── CondenserTypes.ts   # Types for condenser
│   ├── utils/            # Utility functions
│   │   ├── boilerCalculations.ts # Physics calculations
│   │   ├── condenserCalculation.ts # Condenser calculations
│   │   └── steamTable.ts         # Steam property data
│   ├── App.tsx           # Main application component
│   ├── App.css           # Application styling
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── vite.config.ts        # Vite configuration
```

## Key Dependencies

The project has minimal external dependencies, focusing on core React and TypeScript functionality:

- **React**: UI library
- **React DOM**: React renderer for the web
- **TypeScript**: Static typing

## Development Environment

### Build System

- **Vite**: Modern build tool that provides fast development server and optimized production builds
- **TypeScript**: Configured with appropriate settings for React development

### Scripts

- **dev**: Starts the development server
- **build**: Creates a production build
- **preview**: Serves the production build locally for testing

## Technical Constraints

### Browser Compatibility

- The application targets modern browsers with good support for ES6+ features
- No explicit polyfills are included for older browsers

### Performance Considerations

- The simulation runs at 10 updates per second (100ms interval)
- Calculations are optimized to balance accuracy with performance
- Numerical methods use simplifications where appropriate to ensure stability

### Data Storage

- All state is maintained in memory during the session
- No persistence layer is implemented
- No backend or API dependencies

## Steam Table Implementation

The simulation relies on accurate thermodynamic data for water and steam properties:

- **Temperature Range**: 80°C to 300°C
- **Properties Tracked**:
  - Pressure (bar)
  - Specific Volume (m³/kg)
  - Enthalpy (kJ/kg)
  - Specific Heat (kJ/kg°C)
  - Latent Heat (kJ/kg)

For temperatures below 80°C, linear approximations are used for water properties.

## Calculation Methods

### Interpolation

Linear interpolation is used to calculate properties between data points in the steam table:

```typescript
// Interpolate between the two points
const ratio = (clampedTemp - lower.temperature) / (upper.temperature - lower.temperature)

return {
  temperature: clampedTemp,
  pressure: lower.pressure + ratio * (upper.pressure - lower.pressure),
  specificVolume: lower.specificVolume + ratio * (upper.specificVolume - lower.specificVolume),
  enthalpy: lower.enthalpy + ratio * (upper.enthalpy - lower.enthalpy),
  specificHeat: lower.specificHeat + ratio * (upper.specificHeat - lower.specificHeat),
  latentHeat: lower.latentHeat + ratio * (upper.latentHeat - lower.latentHeat),
}
```

### Extrapolation

For values outside the steam table range, appropriate extrapolation methods are used:

- **Antoine Equation**: For boiling points at low pressures
- **Power Law**: For boiling points at high pressures
- **Linear Extrapolation**: For latent heat at low temperatures

### code style

- preferable use deconstruction of constants
- preferable use a separate function instead of the reassigning a value to a 'let'
