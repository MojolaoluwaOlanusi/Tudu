import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

/**
 * Lightweight confetti burst, fired imperatively through a ref.
 *
 * Deliberately dependency-free: 40 absolutely-positioned divs animated with
 * transforms are far cheaper than pulling in a canvas particle library, and
 * they respect prefers-reduced-motion because the CSS zeroes the animation.
 */

interface Piece {
  id: number;
  left: number;
  top: number;
  size: number;
  color: string;
  x: number;
  y: number;
  rotate: number;
  duration: number;
  delay: number;
  round: boolean;
}

const COLORS = ['#22c55e', '#16a34a', '#4ade80', '#86efac', '#fbbf24', '#f472b6'];

const PIECE_COUNT = 40;

export interface ConfettiHandle {
  /** Fire a burst. Defaults to the centre of the viewport. */
  burst: (origin?: { x: number; y: number }) => void;
}

const Confetti = React.forwardRef<ConfettiHandle>((_, ref) => {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const nextId = useRef(0);
  const timers = useRef<number[]>([]);

  const burst = useCallback((origin?: { x: number; y: number }) => {
    const originX = origin?.x ?? window.innerWidth / 2;
    const originY = origin?.y ?? window.innerHeight / 2;

    const created: Piece[] = Array.from({ length: PIECE_COUNT }, () => {
      // Fan the pieces outward in an upward-biased cone.
      const angle = Math.random() * Math.PI * 2;
      const force = 90 + Math.random() * 190;
      return {
        id: nextId.current++,
        left: originX,
        top: originY,
        size: 5 + Math.random() * 7,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        x: Math.cos(angle) * force,
        y: Math.sin(angle) * force - 70, // bias upwards
        rotate: (Math.random() * 900 - 450) | 0,
        duration: 1100 + Math.random() * 700,
        delay: Math.random() * 160,
        round: Math.random() > 0.65,
      };
    });

    setPieces((current) => [...current, ...created]);

    // Remove once the longest piece has finished animating.
    const timer = window.setTimeout(() => {
      const ids = new Set(created.map((p) => p.id));
      setPieces((current) => current.filter((p) => !ids.has(p.id)));
    }, 2200);
    timers.current.push(timer);
  }, []);

  // Clear pending timers on unmount so no state update lands after teardown.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(window.clearTimeout);
      pending.length = 0;
    };
  }, []);

  useImperativeHandle(ref, () => ({ burst }), [burst]);

  return (
    <div aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="confetti-piece"
          style={
            {
              '--confetti-left': `${piece.left}px`,
              '--confetti-top': `${piece.top}px`,
              '--confetti-size': `${piece.size}px`,
              '--confetti-color': piece.color,
              '--confetti-x': `${piece.x}px`,
              '--confetti-y': `${piece.y}px`,
              '--confetti-rotate': `${piece.rotate}deg`,
              '--confetti-duration': `${piece.duration}ms`,
              '--confetti-delay': `${piece.delay}ms`,
              borderRadius: piece.round ? '999px' : '2px',
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
});

Confetti.displayName = 'Confetti';

export default Confetti;