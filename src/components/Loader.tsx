import { useEffect } from 'react';
import { skipIntro } from '../core/boot';
import { glStore, loadingPctStore, phaseStore } from '../core/state';
import { useStore } from '../core/store';

const SEGMENTS = 21;

/**
 * The boot screen itself is drawn in WebGL; this layer adds the skip control,
 * an accessible progress value, and a DOM copy of the bar for when WebGL is
 * still loading or unavailable.
 */
export function Loader() {
  const phase = useStore(phaseStore);
  const pct = useStore(loadingPctStore);
  const gl = useStore(glStore);

  useEffect(() => {
    if (phase === 'ready') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') skipIntro();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  if (phase === 'ready') return null;
  const filled = Math.floor(((pct + 0.1) / 100) * SEGMENTS);

  return (
    <div className={`loader ${gl === 'ok' ? 'loader--gl' : ''}`} data-phase={phase}>
      <div className="loader__fallback" aria-hidden="true">
        <div className="loader__bar">
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span key={i} className={i < filled ? 'on' : ''} />
          ))}
        </div>
        <span className="loader__pct">{String(pct).padStart(3, '0')}%</span>
      </div>
      <div className="sr-only" role="progressbar" aria-label="Loading portfolio" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} />
      <button type="button" className="loader__skip" onClick={skipIntro}>
        Skip intro <kbd>Esc</kbd>
      </button>
    </div>
  );
}
