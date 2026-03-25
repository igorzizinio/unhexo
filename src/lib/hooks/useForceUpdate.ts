import { useCallback, useState } from "preact/hooks";

/**
 * @description Custom hook to force a component re-render. Useful when you need to trigger a re-render
 */
export function useForceUpdate() {
  const [, setTick] = useState(0);
  const update = useCallback(() => {
    setTick((tick) => tick + 1);
  }, []);
  return update;
}
