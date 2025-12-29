import { useState, useEffect, useCallback } from "react";

const useMountTransition = (transitionDuration: number = 200) => {
  const [isActive, setIsActive] = useState(false);
  const toggleActive = useCallback((value?: boolean) => {
    setIsActive((prev) => (typeof value === "boolean" ? value : !prev));
  }, []);
  const [shouldMount, setShouldMount] = useState(false);
  const [isTransitioned, setIsTransitioned] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isActive && !shouldMount) {
      setShouldMount(true);
    } else if (!isActive && shouldMount) {
      setIsTransitioned(false);
      timeoutId = setTimeout(() => setShouldMount(false), transitionDuration);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isActive, transitionDuration, shouldMount]);

  useEffect(() => {
    if (shouldMount) {
      requestAnimationFrame(() => setIsTransitioned(true));
    }
  }, [shouldMount]);

  return [toggleActive, shouldMount, isTransitioned] as const;
};

export default useMountTransition;
