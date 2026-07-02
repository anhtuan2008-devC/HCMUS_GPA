"use client";

import { useEffect, useState } from "react";

function shouldReduceMotion() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 900,
}: Readonly<{
  value: number;
  decimals?: number;
  duration?: number;
}>) {
  const displayValue = useAnimatedNumber(value, duration);

  return <>{displayValue.toFixed(decimals)}</>;
}

export function useAnimatedNumber(value: number, duration = 900) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (shouldReduceMotion()) {
      const frameId = requestAnimationFrame(() => setDisplayValue(value));
      return () => cancelAnimationFrame(frameId);
    }

    let frameId = 0;
    const startedAt = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplayValue(value * eased);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  }, [duration, value]);

  return displayValue;
}
