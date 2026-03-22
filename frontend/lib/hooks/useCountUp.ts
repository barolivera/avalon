"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Animates a number from 0 to `end` over `duration` ms with ease-out easing.
 * Starts after `delay` ms. Returns the current animated value.
 */
export function useCountUp(end: number, duration = 1200, delay = 0): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const start = performance.now();

      function tick(now: number) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out: 1 - (1 - t)^3
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(eased * end);

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafRef.current);
    };
  }, [end, duration, delay]);

  return value;
}
