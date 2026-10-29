import type { CSSProperties } from 'react';
import { Section, sectionNo } from '../components/Section';
import { processStages } from '../data/process';

export function ProcessSection() {
  return (
    <Section id="process" label="How I build">
      <div className="process">
        <div className="process__head" data-reveal>
          <p className="eyebrow">{sectionNo('process')} — How I build</p>
          <h2 className="display" data-focus tabIndex={-1}>
            <span className="line"><span className="line__in">From problem</span></span>
            <span className="line"><span className="line__in" style={{ '--i': 1 } as CSSProperties}>to <em>system.</em></span></span>
          </h2>
        </div>

        <ol className="process__stages">
          {processStages.map((s, i) => (
            <li key={s.title} data-step={i} className="process__stage">
              <span className="process__num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="process__rail" aria-hidden="true">
          <span className="process__fill" />
          {processStages.map((s, i) => (
            <span key={s.title} className="process__tick" data-step={i}>
              {s.title}
            </span>
          ))}
        </div>
      </div>
    </Section>
  );
}
