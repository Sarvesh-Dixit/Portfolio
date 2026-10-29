import { projects } from '../data/projects';
import { PROJECT_SECTIONS, RANGES, rangeById } from '../data/sections';
import { activeSectionStore } from '../core/state';
import { useStore } from '../core/store';
import { navigate } from './Nav';

/** Bottom-left "where am I" readout, plus a project index while inside the work. */
export function SectionIndicator() {
  const active = useStore(activeSectionStore);
  const r = rangeById[active];
  const inWork = PROJECT_SECTIONS.includes(active);

  return (
    <>
      <div className="indicator" aria-hidden="true">
        <span className="indicator__num">{String(r.index + 1).padStart(2, '0')}</span>
        <span className="indicator__track"><span /></span>
        <span className="indicator__num indicator__num--dim">{String(RANGES.length).padStart(2, '0')}</span>
        <span className="indicator__label" key={active}>{r.label}</span>
      </div>
      <nav className={`work-index ${inWork ? 'is-visible' : ''}`} aria-label="Projects">
        <ol>
          {projects.map((p) => (
            <li key={p.id}>
              <a
                href={`#${p.id}`}
                onClick={(e) => navigate(e, p.id)}
                aria-current={active === p.id ? 'true' : undefined}
                tabIndex={inWork ? 0 : -1}
              >
                <span>{p.index}</span> {p.name}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
