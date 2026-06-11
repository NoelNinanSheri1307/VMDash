import { useEffect, useState } from "react";

/**
 * useLazyUpdate(value, delay)
 * waits for 'delay' ms before updating the value
 * helps avoid too many API calls when user changes filters quickly
 */
export default function useLazyUpdate(value, delay = 350) {
  const [lazyValue, setLazyValue] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setLazyValue(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return lazyValue;
}
