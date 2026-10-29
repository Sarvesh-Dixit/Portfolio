import { useRef, type ReactNode } from 'react';
import { env } from '../core/state';

/** Pulls its child slightly toward the cursor. Inert on touch and reduced motion. */
export function Magnetic({ children, strength = 0.25 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  if (env.touch || env.reduced) return <>{children}</>;

  const move = (e: React.PointerEvent) => {
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * strength;
    const y = (e.clientY - r.top - r.height / 2) * strength * 1.3;
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };
  const leave = () => {
    ref.current!.style.transform = '';
  };

  return (
    <span ref={ref} className="magnetic" onPointerMove={move} onPointerLeave={leave}>
      {children}
    </span>
  );
}
