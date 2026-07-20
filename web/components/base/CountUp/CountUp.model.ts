"use client";

import { useEffect, useState } from "react";

/**
 * Animates a number from 0 up to its target using requestAnimationFrame, so the
 * result "lands" with an ease-out curve. Returns the current displayed value.
 */
export function useCountUp(value: number): number {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / 600, 1);
      setShown(Math.round(value * (1 - (1 - progress) ** 3) * 100) / 100);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  return shown;
}
