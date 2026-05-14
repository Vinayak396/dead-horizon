import { useEffect, useRef } from 'react';

export function useGameLoop(callback) {
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    function loop(timestamp) {
      if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
      const dt = Math.min(timestamp - lastTimeRef.current, 50); // cap dt at 50ms
      lastTimeRef.current = timestamp;
      callbackRef.current(dt, timestamp);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);
}
