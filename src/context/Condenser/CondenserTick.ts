import { CondenserState, CondenserAction, SET_VACUUM, SET_SJAE_ENABLED } from './CondenserTypes';
import { CstSimulation } from '../const';

/**
 * Simulates the condenser vacuum behavior over time
 * 
 * @param state Current condenser state
 * @param boilerSteamFlow Steam flow from the boiler (kg/s)
 * @param deltaTime Time elapsed since last tick (seconds)
 * @returns Action to update the condenser state
 */
export function simulateCondenserVacuum(
  state: CondenserState,
  boilerSteamFlow: number,
  deltaTime: number
): CondenserAction[] {
  const actions: CondenserAction[] = [];
  let newVacuum = state.vacuum;
  
  // Air Extraction Pump (CAR) behavior
  if (state.isAirExtractionPumpEnabled) {
    // Calculate vacuum increase based on time needed to reach max vacuum
    const maxVacuum = CstSimulation.Condenser.AirExtractionPump.MaxVacuum;
    const timeNeeded = CstSimulation.Condenser.AirExtractionPump.TimeNeeded;
    const vacuumIncreaseRate = Math.abs(maxVacuum) / timeNeeded; // mbar per second
    
    // Gradually increase vacuum (more negative pressure)
    newVacuum = Math.max(maxVacuum, state.vacuum - vacuumIncreaseRate * deltaTime);
  } else if (state.vacuum < 0) {
    // When pump is off, vacuum gradually decreases back to atmospheric pressure
    const vacuumDecayRate = CstSimulation.Condenser.AirExtractionPump.VacuumDecayRate;
    newVacuum = Math.min(0, state.vacuum + vacuumDecayRate * deltaTime);
  }
  
  // Steam Jet Air Extraction (SJAE) behavior
  if (state.isSjaeEnabled) {
    // Check if SJAE should be automatically disabled
    if (boilerSteamFlow <= 0) {
      // No steam flow, disable SJAE
      actions.push({ type: SET_SJAE_ENABLED, payload: false });
    } else {
      // Calculate max allowed vacuum for SJAE
      const maxAllowedVacuum = CstSimulation.Condenser.AirExtractionPump.MaxVacuum - 
                              CstSimulation.Condenser.SJAE.MaxPressureDifference;
      
      // Check if pressure is too high for SJAE
      if (state.vacuum > maxAllowedVacuum + CstSimulation.Condenser.SJAE.MaxPressureDifference) {
        // Pressure too high, disable SJAE
        actions.push({ type: SET_SJAE_ENABLED, payload: false });
      } else {
        // Calculate vacuum increase based on steam flow and valve position
        const baseVacuumIncreaseRate = CstSimulation.Condenser.SJAE.VacuumIncreaseRate;
        const valveEffect = state.sjaeValvePosition / 100; // 0-1 range
        const steamFlowEffect = Math.min(1, boilerSteamFlow / CstSimulation.MaxSteamRemovalRate);
        
        // Combine effects for final vacuum increase
        const vacuumIncreaseRate = baseVacuumIncreaseRate * valveEffect * steamFlowEffect;
        
        // Apply vacuum increase (limited by max allowed vacuum)
        newVacuum = Math.max(maxAllowedVacuum, newVacuum - vacuumIncreaseRate * deltaTime);
      }
    }
  } else if (state.vacuum < 0) {
    // When SJAE is off, vacuum gradually decreases faster than with just the pump off
    const vacuumDecayRate = CstSimulation.Condenser.AirExtractionPump.VacuumDecayRate * 1.5;
    newVacuum = Math.min(0, newVacuum + vacuumDecayRate * deltaTime);
  }
  
  // Add vacuum update action if vacuum has changed
  if (newVacuum !== state.vacuum) {
    actions.push({ type: SET_VACUUM, payload: newVacuum });
  }
  
  return actions;
}
