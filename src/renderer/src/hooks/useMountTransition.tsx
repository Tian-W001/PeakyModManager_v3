import { useState, useEffect, useCallback, useLayoutEffect } from "react";

const useMountTransition = (transitionDuration: number = 200) => {
  const [isActive, setIsActive] = useState(false);
  const toggleActive = useCallback((value?: boolean) => {
    setIsActive((prev) => (typeof value === "boolean" ? value : !prev));
  }, []);
  const [shouldMount, setShouldMount] = useState(false);
  const [shouldTransition, setShouldTransition] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isActive && !shouldMount) {
      setShouldMount(true);
    } else if (!isActive && shouldMount) {
      setShouldTransition(false);
      timeoutId = setTimeout(() => setShouldMount(false), transitionDuration);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isActive, transitionDuration, shouldMount]);

  useLayoutEffect(() => {
    if (shouldMount) {
      setShouldTransition(true);
    }
  }, [shouldMount]);

  return [toggleActive, shouldMount, shouldTransition] as const;
};

export default useMountTransition;
