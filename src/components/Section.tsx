import type { CSSProperties, ReactNode } from 'react';
import { rangeById, type SectionId } from '../data/sections';

/**
 * A section is `length` viewports tall with a sticky, full-viewport stage, so
 * DOM and GL share the same scroll ranges.
 */
export function Section({ id, label, className = '', children }: { id: SectionId; label?: string; className?: string; children: ReactNode }) {
  const r = rangeById[id];
  return (
    <section
      id={id}
      className={`sec sec--${id} ${className}`}
      aria-label={label ?? r.label}
      style={{ height: `calc(var(--vh) * ${r.length * 100})` } as CSSProperties}
    >
      <div className="stage">{children}</div>
    </section>
  );
}

/** Two-digit position of a section on the page, e.g. "03". */
export function sectionNo(id: SectionId) {
  return String(rangeById[id].index + 1).padStart(2, '0');
}

/** Line-masked text. Wrap words in *asterisks* for italics. */
export function Lines({ lines, delay = 0 }: { lines: string[]; delay?: number }) {
  return (
    <>
      {lines.map((line, i) => (
        <span className="line" key={i}>
          <span className="line__in" style={{ '--i': i, '--d': `${delay}ms` } as CSSProperties}>
            {line.split(/(\*[^*]+\*)/).map((part, k) =>
              part.startsWith('*') ? <em key={k}>{part.slice(1, -1)}</em> : part,
            )}{' '}
          </span>
        </span>
      ))}
    </>
  );
}

/** Dev-only reminder for missing content; renders nothing in production. */
export function Todo({ children }: { children: ReactNode }) {
  if (!import.meta.env.DEV) return null;
  return <span className="todo">{children}</span>;
}
