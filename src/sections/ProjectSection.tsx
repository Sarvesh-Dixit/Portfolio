import { useRef } from 'react';
import { Section, Todo } from '../components/Section';
import { ownershipLabel, statusLabel, type Project } from '../data/projects';
import { AutomationControls } from './AutomationControls';
import { lockScroll } from '../core/scroll';

export function ProjectSection({ project: p }: { project: Project }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const status = statusLabel[p.status];

  const open = () => {
    dialog.current?.showModal();
    lockScroll(true);
  };
  const close = () => {
    const d = dialog.current;
    if (!d?.open) return;
    d.classList.add('is-closing');
    setTimeout(() => {
      d.classList.remove('is-closing');
      d.close();
    }, 380);
  };

  return (
    <Section id={p.id} label={`${p.name}, project ${p.index}`} className="sec--project">
      <article className="proj" data-reveal>
        <header className="proj__head">
          <p className="eyebrow">
            <span className="proj__index">{p.index} / 04</span> {p.category}
            {status && <span className={`status status--${p.status}`}>{status}</span>}
            {!status && <Todo>status unverified</Todo>}
          </p>
          <h2 className="display proj__name" data-focus tabIndex={-1}>
            <span className="line"><span className="line__in">{p.name}</span></span>
          </h2>
          <p className="proj__summary fade-up">{p.summary}</p>
          {p.role && (
            <p className="proj__role fade-up">
              {p.role}
              {p.client && <span> · for {p.client.name}</span>}
            </p>
          )}
        </header>

        <div className="proj__legend fade-up">
          <p className="label">{p.legend.title}</p>
          {p.id === 'automation' ? (
            <AutomationControls />
          ) : (
            <ol className="steps">
              {p.legend.items.map((item, i) => (
                <li key={item} data-step={i}>
                  <span className="mono">{String(i + 1).padStart(2, '0')}</span> {item}
                </li>
              ))}
            </ol>
          )}
          {p.note && <p className="proj__note">{p.note}</p>}
        </div>

        <div className="proj__foot fade-up">
          {p.stack.length > 0 ? (
            <ul className="chips" aria-label="Technologies">
              {p.stack.map((s) => <li key={s}>{s}</li>)}
            </ul>
          ) : (
            <Todo>add stack in data/projects.ts</Todo>
          )}
          <div className="proj__actions">
            <button type="button" className="btn btn--primary" onClick={open} aria-haspopup="dialog">
              Case file <span aria-hidden="true">↗</span>
            </button>
            {p.liveUrl && (
              <a className="btn btn--line" href={p.liveUrl} target="_blank" rel="noreferrer">
                {p.status === 'paused' ? 'Visit site (paused)' : 'Live site'} <span aria-hidden="true">↗</span>
              </a>
            )}
            {p.repoUrl && <a className="btn btn--line" href={p.repoUrl} target="_blank" rel="noreferrer">Source</a>}
            {!p.liveUrl && <Todo>liveUrl</Todo>}
            {!p.repoUrl && <Todo>repoUrl</Todo>}
          </div>
        </div>
      </article>

      <dialog
        ref={dialog}
        className="case"
        aria-labelledby={`${p.id}-case-title`}
        data-lenis-prevent
        onClose={() => lockScroll(false)}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => e.target === e.currentTarget && close()}
      >
        <div className="case__inner">
          <header className="case__head">
            <p className="eyebrow">
              {p.index} — {p.projectType}
              {p.ownership && <span className="status">{ownershipLabel[p.ownership]}</span>}
              {!p.ownership && <Todo>ownership</Todo>}
            </p>
            <h3 id={`${p.id}-case-title`} className="display">{p.name}</h3>
            {p.aka && <p className="case__aka">Previously {p.aka}</p>}
            <p className="case__summary">{p.summary}</p>
            {(p.role || p.client) && (
              <dl className="case__facts">
                {p.role && <div><dt>Role</dt><dd>{p.role}</dd></div>}
                {p.client && <div><dt>Client</dt><dd>{p.client.name}{p.client.owner && ` (${p.client.owner})`}</dd></div>}
                {statusLabel[p.status] && <div><dt>Status</dt><dd>{statusLabel[p.status]}</dd></div>}
              </dl>
            )}
            <button type="button" className="case__close" onClick={close}>Close <kbd>Esc</kbd></button>
          </header>
          <div className="case__body">
            {p.targetUsers && (
              <section>
                <h4 className="label">Target users</h4>
                <p>{p.targetUsers}</p>
              </section>
            )}
            <section>
              <h4 className="label">Problem</h4>
              <p>{p.problem}</p>
            </section>
            <section>
              <h4 className="label">Solution</h4>
              <p>{p.solution}</p>
            </section>
            <section>
              <h4 className="label">{p.featuresTitle}</h4>
              <ul className="case__features">{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
            </section>
            <section>
              <h4 className="label">Architecture</h4>
              <ul className="case__list">{p.architecture.map((a) => <li key={a}>{a}</li>)}</ul>
            </section>
            {p.contributions.length > 0 ? (
              <section>
                <h4 className="label">My contributions</h4>
                <ul className="case__list">{p.contributions.map((c) => <li key={c}>{c}</li>)}</ul>
              </section>
            ) : (
              <Todo>add your contributions in data/projects.ts</Todo>
            )}
            {p.stack.length > 0 && (
              <section>
                <h4 className="label">Stack</h4>
                <ul className="chips">{p.stack.map((s) => <li key={s}>{s}</li>)}</ul>
              </section>
            )}
          </div>
          {(p.liveUrl || p.repoUrl) && (
            <footer className="case__links">
              {p.liveUrl && <a className="btn btn--primary" href={p.liveUrl} target="_blank" rel="noreferrer">{p.status === 'paused' ? 'Visit site (paused) ↗' : 'Open live project ↗'}</a>}
              {p.repoUrl && <a className="btn btn--line" href={p.repoUrl} target="_blank" rel="noreferrer">View source ↗</a>}
            </footer>
          )}
        </div>
      </dialog>
    </Section>
  );
}
