# Performance Enhancements for Steam Boiler Simulation

This document outlines potential performance optimizations and monitoring approaches for the Steam Boiler Simulation. These enhancements are designed to maintain the 100ms simulation update interval while ensuring smooth performance.

## 1. Performance Monitoring Component

Add a simple performance monitor component that tracks frame rates and simulation timing:

```tsx
// src/components/PerformanceMonitor.tsx
import { useState, useEffect } from 'react';
import './PerformanceMonitor.css';

interface PerformanceMetrics {
  fps: number;
  tickTime: number;
  renderTime: number;
}

const PerformanceMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    tickTime: 0,
    renderTime: 0
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let tickTimes: number[] = [];
    let renderTimes: number[] = [];
    
    // Track simulation tick time (add to PowerPlantProvider)
    window.addEventListener('simulation-tick', (e: any) => {
      tickTimes.push(e.detail.duration);
      if (tickTimes.length > 30) tickTimes.shift();
    });
    
    // Track render time
    const measureRender = () => {
      const startRender = performance.now();
      
      requestAnimationFrame(() => {
        const endRender = performance.now();
        renderTimes.push(endRender - startRender);
        if (renderTimes.length > 30) renderTimes.shift();
        measureRender();
      });
    };
    
    measureRender();
    
    // Update metrics once per second
    const interval = setInterval(() => {
      const now = performance.now();
      const elapsed = now - lastTime;
      const currentFps = frameCount / (elapsed / 1000);
      
      const avgTickTime = tickTimes.length > 0 
        ? tickTimes.reduce((sum, time) => sum + time, 0) / tickTimes.length 
        : 0;
        
      const avgRenderTime = renderTimes.length > 0
        ? renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length
        : 0;
      
      setMetrics({
        fps: Math.round(currentFps),
        tickTime: Math.round(avgTickTime * 100) / 100,
        renderTime: Math.round(avgRenderTime * 100) / 100
      });
      
      frameCount = 0;
      lastTime = now;
    }, 1000);
    
    // Count frames
    const countFrame = () => {
      frameCount++;
      requestAnimationFrame(countFrame);
    };
    
    countFrame();
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('simulation-tick', () => {});
    };
  }, []);

  return (
    <div className="performance-monitor">
      <button 
        className="toggle-button"
        onClick={() => setVisible(!visible)}
      >
        {visible ? 'Hide' : 'Show'} Performance
      </button>
      
      {visible && (
        <div className="metrics">
          <div>FPS: {metrics.fps}</div>
          <div>Tick: {metrics.tickTime}ms</div>
          <div>Render: {metrics.renderTime}ms</div>
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitor;
```

Add this CSS:

```css
/* src/components/PerformanceMonitor.css */
.performance-monitor {
  position: fixed;
  bottom: 10px;
  right: 10px;
  z-index: 1000;
}

.toggle-button {
  background: #333;
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
}

.metrics {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px;
  border-radius: 4px;
  margin-top: 5px;
  font-family: monospace;
  font-size: 12px;
}
```

Then modify the PowerPlantProvider to emit timing events:

```typescript
// In PowerPlantProvider.tsx, modify the simulation loop
useEffect(() => {
  let lastTime = Date.now()

  const simulationInterval = setInterval(() => {
    const tickStart = performance.now();
    
    const now = Date.now()
    const deltaTime = (now - lastTime) / 1000 // Convert to seconds
    lastTime = now

    //  boiler
    boilerDispatch({ type: "SIMULATE_TICK", deltaTime })

    // condenser vacuum
    const { steamFlowOut } = boilerState
    condenserDispatch({ type: "SIMULATE_TICK", payload: { boilerSteamFlow: steamFlowOut, deltaTime } })
    
    const tickEnd = performance.now();
    
    // Dispatch custom event with timing information
    window.dispatchEvent(new CustomEvent('simulation-tick', { 
      detail: { duration: tickEnd - tickStart }
    }));
    
  }, 100) // Update 10 times per second

  return () => {
    clearInterval(simulationInterval)
  }
}, [boilerState, condenserState, condenserDispatch])
```

## 2. Optimization Techniques

### Memoize Expensive Calculations

For functions that are called frequently with the same inputs, consider using memoization:

```typescript
// In utils/steamTable.ts
import { memoize } from './memoize';

// Create a memoization utility
// utils/memoize.ts
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();
  
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Then apply to expensive functions
export const getSteamData = memoize((temperature: number) => {
  // Original implementation
});
```

### Use React.memo for Pure Components

For components that render frequently but don't change often:

```tsx
// In components/Boiler/BoilerReadouts.tsx
import React from 'react';

const BoilerReadouts = React.memo(({ temperature, pressure, waterVolume }) => {
  // Component implementation
});

export default BoilerReadouts;
```

### Optimize Reducer Logic

Ensure your reducers are efficient:

```typescript
// In BoilerReducer.ts
function boilerReducer(state: BoilerState, action: BoilerAction): BoilerState {
  switch (action.type) {
    case "SIMULATE_TICK": {
      // Only perform expensive calculations if relevant state has changed
      if (
        state.gasFlow === 0 && 
        !state.fillValveOpen && 
        !state.drainValveOpen && 
        state.mainSteamValvePosition === 0 &&
        Math.abs(state.temperature - 20) < 0.1
      ) {
        // If system is idle, avoid unnecessary calculations
        return state;
      }
      
      return BoilerTick(state, action.deltaTime);
    }
    // Other cases
  }
}
```

### Throttle UI Updates for Non-Critical Elements

For visual elements that don't need to update every tick:

```tsx
// In a component with frequent updates
import { useState, useEffect } from 'react';

function ThrottledComponent({ value }) {
  const [displayValue, setDisplayValue] = useState(value);
  
  useEffect(() => {
    // Only update every 300ms for non-critical displays
    const timer = setTimeout(() => {
      setDisplayValue(value);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [value]);
  
  return <div>{displayValue.toFixed(2)}</div>;
}
```

## 3. Dynamic Simulation Rate

Implement a dynamic simulation rate that adjusts based on performance:

```typescript
// In PowerPlantProvider.tsx
useEffect(() => {
  let lastTime = Date.now();
  let simulationRate = 100; // Start at 10 updates per second
  let performanceHistory: number[] = [];
  
  const simulationInterval = setInterval(() => {
    const tickStart = performance.now();
    
    const now = Date.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;
    
    // Run simulation tick
    boilerDispatch({ type: "SIMULATE_TICK", deltaTime });
    const { steamFlowOut } = boilerState;
    condenserDispatch({ type: "SIMULATE_TICK", payload: { boilerSteamFlow: steamFlowOut, deltaTime } });
    
    const tickDuration = performance.now() - tickStart;
    
    // Track performance
    performanceHistory.push(tickDuration);
    if (performanceHistory.length > 30) performanceHistory.shift();
    
    // Adjust simulation rate if needed
    if (performanceHistory.length === 30) {
      const avgDuration = performanceHistory.reduce((sum, time) => sum + time, 0) / 30;
      
      // If ticks are taking too long, slow down the simulation
      if (avgDuration > 20) { // More than 20ms per tick
        simulationRate = Math.min(200, simulationRate + 10);
        clearInterval(simulationInterval);
        simulationInterval = setInterval(simulationTick, simulationRate);
      }
      // If performance is good, speed up to target rate
      else if (avgDuration < 10 && simulationRate > 100) {
        simulationRate = Math.max(100, simulationRate - 10);
        clearInterval(simulationInterval);
        simulationInterval = setInterval(simulationTick, simulationRate);
      }
    }
  }, simulationRate);
  
  return () => clearInterval(simulationInterval);
}, []);
```

## 4. Profiling with React DevTools

Use React's built-in profiling tools:

1. Install React DevTools browser extension
2. Use the Profiler tab to record performance
3. Identify components that render too frequently or take too long

## Implementation Priority

These enhancements should be considered low priority and implemented only if performance issues are observed. The current 100ms update interval provides a good balance between simulation realism and performance for most modern browsers and devices.
