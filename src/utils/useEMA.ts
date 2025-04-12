import { useState, useEffect } from 'react';

function useEMA(value: number, alpha: number): number {
  const [ema, setEma] = useState(value);
  
  useEffect(() => {
    setEma(prev => alpha * value + (1 - alpha) * prev);
  }, [value, alpha]);
  
  return ema;
}

export default useEMA;
