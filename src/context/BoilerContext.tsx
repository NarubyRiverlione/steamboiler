import { createContext, ReactNode, useContext, useEffect, useReducer } from 'react';
import { getSteamData } from '../utils/steamTable';
import {
  BOILER_TOTAL_VOLUME,
  DRAINING_RATE,
  FILLING_RATE,
  NATURAL_COOLING_RATE,
  WATER_DENSITY,
  calculateGasEnergy,
  calculateSteamEnergyLoss,
  calculateSteamGeneration,
} from '../utils/boilerCalculations';

// Types
type BoilerState = {
  waterVolume: number; // liters
  temperature: number; // Celsius
  pressure: number; // bar
  gasFlow: number; // liters/second
  steamRate: number; // kg/second
  fillValveOpen: boolean;
  drainValveOpen: boolean;
  energy: number; // kJ
  energyDelta: number; // kJ/s
}

type BoilerAction =
  | { type: 'INCREASE_GAS_FLOW'; amount: number }
  | { type: 'DECREASE_GAS_FLOW'; amount: number }
  | { type: 'TOGGLE_FILL_VALVE' }
  | { type: 'TOGGLE_DRAIN_VALVE' }
  | { type: 'SIMULATE_TICK'; deltaTime: number };

type BoilerContextType = {
  state: BoilerState;
  increaseGasFlow: (amount: number) => void;
  decreaseGasFlow: (amount: number) => void;
  toggleFillValve: () => void;
  toggleDrainValve: () => void;
}

// Initial state
const initialState: BoilerState = {
  waterVolume: 50, // 50% filled
  temperature: 98, // Celsius
  pressure: 0.946, // bar (atmospheric pressure at 98°C)
  gasFlow: 0, // No gas flow initially
  steamRate: 0, // No steam generation initially
  fillValveOpen: false,
  drainValveOpen: false,
  energy: 50 * WATER_DENSITY * getSteamData(98).enthalpy / 1000, // Initial energy based on water volume and temperature
  energyDelta: 0,
};

// Reducer
function boilerReducer(state: BoilerState, action: BoilerAction): BoilerState {
  switch (action.type) {
    case 'INCREASE_GAS_FLOW':
      return {
        ...state,
        gasFlow: Math.min(10, state.gasFlow + action.amount), // Cap at 10 L/s
      };
    
    case 'DECREASE_GAS_FLOW':
      return {
        ...state,
        gasFlow: Math.max(0, state.gasFlow - action.amount),
      };
    
    case 'TOGGLE_FILL_VALVE':
      return {
        ...state,
        fillValveOpen: !state.fillValveOpen,
      };
    
    case 'TOGGLE_DRAIN_VALVE':
      return {
        ...state,
        drainValveOpen: !state.drainValveOpen,
      };
    
    case 'SIMULATE_TICK': {
      const { deltaTime } = action;
      let newWaterVolume = state.waterVolume;
      let energyChange = 0;
      
      // Handle filling and draining
      if (state.fillValveOpen) {
        const fillAmount = BOILER_TOTAL_VOLUME * FILLING_RATE * deltaTime;
        newWaterVolume = Math.min(BOILER_TOTAL_VOLUME, newWaterVolume + fillAmount);
        
        // Adding water doesn't change total energy, just adds mass
        // The temperature will naturally decrease as the same energy is distributed 
        // over a larger mass of water
      }
      
      if (state.drainValveOpen) {
        const drainAmount = BOILER_TOTAL_VOLUME * DRAINING_RATE * deltaTime;
        
        // Calculate the ratio of water being drained
        const originalVolume = state.waterVolume;
        newWaterVolume = Math.max(0, newWaterVolume - drainAmount);
        
        if (originalVolume > 0) {
          // Temperature doesn't change when draining (assuming uniform temperature)
          // But total energy is reduced proportionally
          const drainRatio = drainAmount / originalVolume;
          // Remove the same proportion of energy
          energyChange -= state.energy * drainRatio;
        }
      }
      
      // Water mass (kg)
      const waterMass = newWaterVolume * WATER_DENSITY / 1000;
      
      // Add energy from gas
      const gasEnergy = calculateGasEnergy(state.gasFlow) * deltaTime;
      energyChange += gasEnergy;
      
      // Natural cooling
      const coolingEnergyLoss = waterMass * 4.18 * NATURAL_COOLING_RATE * deltaTime;
      energyChange -= coolingEnergyLoss;
      
      // Calculate steam generation
      const steamRate = calculateSteamGeneration(waterMass, state.temperature, state.pressure);
      const steamEnergyLoss = calculateSteamEnergyLoss(steamRate) * deltaTime;
      energyChange -= steamEnergyLoss;
      
      // Update total energy
      const newEnergy = Math.max(0, state.energy + energyChange);
      
      // Calculate new temperature based on energy changes
      const specificHeat = 4.18; // kJ/kg°C
      let newTemperature;
      
      if (waterMass <= 0) {
        newTemperature = state.temperature;
      } else {
        // For temperature changes, consider only gas heating, cooling, and steam generation
        // When water amount changes (filling/draining), the temperature shouldn't be directly affected
        
        // Energy changes not related to water volume changes
        const nonVolumeEnergyChange = gasEnergy - coolingEnergyLoss - steamEnergyLoss;
        
        // Calculate temperature change from these energy changes
        const tempDelta = waterMass > 0 ? nonVolumeEnergyChange / (waterMass * specificHeat) : 0;
        
        // Apply the temperature change to current temperature
        const calculatedTemp = state.temperature + tempDelta;
        
        // Apply reasonable limits (minimum temperature is 20°C - room temperature)
        newTemperature = Math.max(20, calculatedTemp);
      }
      
      // Get new pressure from steam table
      const steamData = getSteamData(newTemperature);
      
      return {
        ...state,
        waterVolume: Number(newWaterVolume.toFixed(1)),
        temperature: Number(newTemperature.toFixed(1)),
        pressure: Number(steamData.pressure.toFixed(1)),
        steamRate: Number(steamRate.toFixed(1)),
        energy: Number(newEnergy.toFixed(1)),
        energyDelta: Number((energyChange / deltaTime).toFixed(1)),
      };
    }
    
    default:
      return state;
  }
}

// Context
const BoilerContext = createContext<BoilerContextType | undefined>(undefined);

// Provider
export function BoilerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(boilerReducer, initialState);
  
  // Simulation loop
  useEffect(() => {
    let lastTime = Date.now();
    
    const simulationInterval = setInterval(() => {
      const now = Date.now();
      const deltaTime = (now - lastTime) / 1000; // Convert to seconds
      lastTime = now;
      
      dispatch({ type: 'SIMULATE_TICK', deltaTime });
    }, 100); // Update 10 times per second
    
    return () => { clearInterval(simulationInterval); };
  }, []);
  
  // Actions
  const increaseGasFlow = (amount: number) => {
    dispatch({ type: 'INCREASE_GAS_FLOW', amount });
  };
  
  const decreaseGasFlow = (amount: number) => {
    dispatch({ type: 'DECREASE_GAS_FLOW', amount });
  };
  
  const toggleFillValve = () => {
    dispatch({ type: 'TOGGLE_FILL_VALVE' });
  };
  
  const toggleDrainValve = () => {
    dispatch({ type: 'TOGGLE_DRAIN_VALVE' });
  };
  
  return (
    <BoilerContext.Provider
      value={{
        state,
        increaseGasFlow,
        decreaseGasFlow,
        toggleFillValve,
        toggleDrainValve,
      }}
    >
      {children}
    </BoilerContext.Provider>
  );
}

// Hook
export function useBoiler() {
  const context = useContext(BoilerContext);
  
  if (context === undefined) {
    throw new Error('useBoiler must be used within a BoilerProvider');
  }
  
  return context;
}