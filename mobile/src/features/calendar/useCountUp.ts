// Tiny count-up hook — animates a numeric value from its previous
// state to `target` over `durationMs` using a cubic bezier easing.
//
// Returns the currently-displayed number, updated on every animation
// frame. Safe to drive <Text> content directly without Reanimated.

import { useEffect, useRef, useState } from 'react';

const EASE = (t: number) => {
  // cubic-bezier(0.4, 0, 0.2, 1) approximation (material standard)
  return t < 0.5
    ? 2 * t * t
    : -1 + (4 - 2 * t) * t;
};

export function useCountUp(target: number, durationMs = 500): number {
  const [display, setDisplay] = useState(target);
  const startVal = useRef(target);
  const startTs  = useRef<number | null>(null);
  const rafId    = useRef<number | null>(null);

  useEffect(() => {
    if (display === target) return;
    startVal.current = display;
    startTs.current  = null;

    const tick = (ts: number) => {
      if (startTs.current === null) startTs.current = ts;
      const elapsed = ts - startTs.current;
      const t = Math.min(1, elapsed / durationMs);
      const eased = EASE(t);
      const v = startVal.current + (target - startVal.current) * eased;
      setDisplay(v);
      if (t < 1) {
        rafId.current = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    };
    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return display;
}
