import { damp, lerp, ticker } from './ticker';
import { env } from './state';

/** Normalised device coords (-1…1, y up). `x/y` are smoothed, `tx/ty` raw targets. */
export const pointer = { x: 0, y: 0, tx: 0, ty: 0, active: false };

export function initPointer() {
  if (env.touch) return; // touch devices get static compositions
  window.addEventListener(
    'pointermove',
    (e) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
      pointer.active = true;
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', () => {
    pointer.tx = 0;
    pointer.ty = 0;
  });
  ticker.add((_t, dt) => {
    const k = damp(env.reduced ? 2 : 5, dt);
    pointer.x = lerp(pointer.x, pointer.tx, k);
    pointer.y = lerp(pointer.y, pointer.ty, k);
  });
}
