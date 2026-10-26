import { useState } from 'react';

function useEMA(value: number, alpha: number): number {
  const [state, setState] = useState({ ema: value, value, alpha });

  // One EMA step per change of value/alpha, derived during render (no effect, no extra render pass)
  if (state.value !== value || state.alpha !== alpha) {
    setState({ ema: alpha * value + (1 - alpha) * state.ema, value, alpha });
  }

  return state.ema;
}

export default useEMA;
