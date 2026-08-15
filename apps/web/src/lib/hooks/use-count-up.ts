"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a figure up on mount, the way the bot-served join page does — a static
 * number reads as a label, a climbing one reads as a scoreboard.
 *
 * Honours prefers-reduced-motion by landing on the final value immediately, and
 * restarts when the target changes so a live figure does not jump.
 */
export function useCountUp(target: number | null, duration = 1200): number {
  const [value, setValue] = useState(target ?? 0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (target == null) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduced || target === 0) {
      setValue(target);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // Cubic ease-out: fast off the line, settles onto the real number.
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else setValue(target);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, [target, duration]);

  return value;
}
