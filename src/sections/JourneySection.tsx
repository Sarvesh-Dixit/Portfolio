import type { CSSProperties } from 'react';
import { Section, Todo, sectionNo } from '../components/Section';
import { achievements, education, internships } from '../data/journey';

export function JourneySection() {
  return (
    <Section id="journey" label="My journey">
      <div className="journey">
        <header className="journey__head" data-reveal>
          <p className="eyebrow">{sectionNo('journey')} — My journey</p>
          <h2 className="display" data-focus tabIndex={-1}>
            <span className="line"><span className="line__in">From school</span></span>
            <span className="line"><span className="line__in" style={{ '--i': 1 } as CSSProperties}>to <em>engineering.</em></span></span>
          </h2>
        </header>

        {/* Timeline and experience share one slot and swap at the last step, so the section fits short screens. */}
        <div className="journey__body">
          <ol className="milestones" aria-label="Education timeline">
            <span className="milestones__fill" aria-hidden="true" />
            {education.map((m, i) => (
              <li key={m.id} className="milestone" data-step={i}>
                <span className="milestone__dot" aria-hidden="true" />
                <p className="milestone__top">
                  <span className="mono">{m.period}</span>
                  <span className={`badge badge--${m.status}`}>{m.status === 'pursuing' ? 'Currently pursuing' : 'Completed'}</span>
                  {m.periodProvisional && <Todo>verify years</Todo>}
                </p>
                <h3 className="milestone__title">{m.title}</h3>
                <p className="milestone__inst">{m.institution}</p>
                <p className="milestone__meta">{m.details.join(' · ')}</p>
                <dl className="milestone__results">
                  {[...m.results, ...(m.cumulative ? [m.cumulative] : [])].map((r) => (
                    <div key={r.label}>
                      <dt>{r.label}</dt>
                      <dd>{r.value}</dd>
                    </div>
                  ))}
                </dl>
                {m.cumulative === null && <Todo>cumulative CGPA</Todo>}
                <p className="milestone__body">{m.body}</p>
              </li>
            ))}
          </ol>

          <div className="journey__extra" data-step={3}>
            <section aria-labelledby="journey-exp">
              <h3 className="label" id="journey-exp">Practical experience</h3>
              {internships.map((x) => (
                <div key={x.org} className="intern">
                  <p className="intern__role">
                    {x.role} <span>· {x.org}</span>
                  </p>
                  <p className="intern__meta mono">{x.location} · {x.duration}</p>
                  <p className="intern__body">{x.body}</p>
                  <ul className="chips" aria-label="Technologies explored">
                    {x.tech.map((t) => <li key={t}>{t}</li>)}
                  </ul>
                </div>
              ))}
            </section>
            <section aria-labelledby="journey-ach">
              <h3 className="label" id="journey-ach">Achievements</h3>
              <ul className="achievements">
                {achievements.map((a) => (
                  <li key={a.title}>
                    <span className="mono">{a.kind}</span>
                    {a.title}
                  </li>
                ))}
              </ul>
              <Todo>certificates / hackathons / awards</Todo>
            </section>
          </div>
        </div>
      </div>
    </Section>
  );
}
