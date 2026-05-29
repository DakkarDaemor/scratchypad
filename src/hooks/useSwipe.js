import { useRef, useCallback } from 'react';

const THRESHOLD = 50;  // px
const ANGLE_MAX = 0.6; // max |deltaY/deltaX| ratio to count as horizontal

export function useSwipe({ onSwipeLeft, onSwipeRight, enabled = true } = {}) {
  const start = useRef(null);

  const onTouchStart = useCallback(e => {
    if (!enabled) return;
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY };
  }, [enabled]);

  const onTouchEnd = useCallback(e => {
    if (!enabled || !start.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;
    start.current = null;

    if (Math.abs(dx) < THRESHOLD) return;
    if (Math.abs(dy / dx) > ANGLE_MAX) return; // mostly vertical → scroll, ignore

    if (dx < 0) onSwipeLeft?.();
    else         onSwipeRight?.();
  }, [enabled, onSwipeLeft, onSwipeRight]);

  return { onTouchStart, onTouchEnd };
}
