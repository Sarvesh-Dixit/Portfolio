import { useMemo, useState, type CSSProperties } from 'react';
import { Section, sectionNo } from '../components/Section';
import { navigate } from '../components/Nav';
import { categories, projectsUsing, technologies, type CategoryId, type Technology } from '../data/technologies';
import { projectById, projects, type ProjectId } from '../data/projects';

type Selection = { kind: 'tech'; id: string } | { kind: 'cat'; id: CategoryId } | { kind: 'project'; id: ProjectId } | null;

const RAD = Math.PI / 180;
const at = (deg: number, r: number) => ({ x: 50 + Math.cos(deg * RAD) * r, y: 50 + Math.sin(deg * RAD) * r });

/**
 * Technologies sit on two outer arcs (left and right, so labels never collide
 * at the poles), grouped by category hubs; the four projects sit in the centre.
 */
function useLayout() {
  return useMemo(() => {
    // Whole categories go to one side, split so the sides hold similar counts.
    const groups = categories.map((c) => technologies.filter((t) => t.category === c.id));
    const total = technologies.length;
    let acc = 0;
    let split = groups.length;
    for (let i = 0; i < groups.length; i++) {
      if (acc + groups[i].length / 2 > total / 2) { split = i; break; }
      acc += groups[i].length;
    }
    const sides = [groups.slice(0, split).flat(), groups.slice(split).flat()];
    const arcs = [[-72, 72], [108, 252]];
    const tech = new Map<string, { x: number; y: number; deg: number }>();
    sides.forEach((list, s) => {
      const [a0, a1] = arcs[s];
      list.forEach((t, k) => {
        const deg = a0 + ((a1 - a0) * (k + 0.5)) / list.length;
        tech.set(t.id, { ...at(deg, 42), deg });
      });
    });
    const cat = new Map<CategoryId, { x: number; y: number }>();
    for (const c of categories) {
      const ts = technologies.filter((t) => t.category === c.id).map((t) => tech.get(t.id)!);
      const mx = ts.reduce((s, p) => s + p.x, 0) / ts.length;
      const my = ts.reduce((s, p) => s + p.y, 0) / ts.length;
      const len = Math.hypot(mx - 50, my - 50) || 1;
      cat.set(c.id, { x: 50 + ((mx - 50) / len) * 27, y: 50 + ((my - 50) / len) * 27 });
    }
    const proj = new Map<ProjectId, { x: number; y: number }>();
    projects.forEach((p, i) => proj.set(p.id, at(-135 + i * 90, 10)));
    const uses = new Map(technologies.map((t) => [t.id, projectsUsing(t)]));
    return { tech, cat, proj, uses };
  }, []);
}

export function StackSection() {
  const { tech, cat, proj, uses } = useLayout();
  const [sel, setSel] = useState<Selection>(null);

  const toggle = (next: NonNullable<Selection>) =>
    setSel((s) => (s && s.kind === next.kind && s.id === next.id ? null : next));

  // What is lit for the current selection.
  const lit = useMemo(() => {
    const techs = new Set<string>();
    const cats = new Set<CategoryId>();
    const projs = new Set<ProjectId>();
    if (sel?.kind === 'tech') {
      const t = technologies.find((x) => x.id === sel.id)!;
      techs.add(t.id);
      cats.add(t.category);
      uses.get(t.id)!.forEach((p) => projs.add(p));
    } else if (sel?.kind === 'cat') {
      cats.add(sel.id);
      technologies.filter((t) => t.category === sel.id).forEach((t) => techs.add(t.id));
    } else if (sel?.kind === 'project') {
      projs.add(sel.id);
      technologies.filter((t) => uses.get(t.id)!.includes(sel.id)).forEach((t) => {
        techs.add(t.id);
        cats.add(t.category);
      });
    }
    return { techs, cats, projs };
  }, [sel, uses]);

  const anySel = sel !== null;
  const cls = (on: boolean) => (anySel ? (on ? 'is-lit' : 'is-dim') : '');

  return (
    <Section id="stack" label="System map">
      <div className="stack">
        <div className="stack__intro" data-reveal>
          <p className="eyebrow">{sectionNo('stack')} — System map</p>
          <h2 className="display" data-focus tabIndex={-1}>
            <span className="line"><span className="line__in">How the pieces</span></span>
            <span className="line"><span className="line__in" style={{ '--i': 1 } as CSSProperties}><em>connect.</em></span></span>
          </h2>
          <p className="stack__hint fade-up">Select a technology, a category or a project to trace its relationships.</p>
          <Detail sel={sel} uses={uses} />
        </div>

        <div className="map" data-reveal>
          <svg className="map__lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {technologies.map((t) => {
              const a = tech.get(t.id)!;
              const b = cat.get(t.category)!;
              return <line key={t.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={cls(lit.techs.has(t.id))} />;
            })}
            {anySel &&
              technologies
                .filter((t) => lit.techs.has(t.id))
                .flatMap((t) =>
                  uses.get(t.id)!.filter((p) => lit.projs.has(p)).map((p) => {
                    const a = tech.get(t.id)!;
                    const b = proj.get(p)!;
                    return <line key={`${t.id}-${p}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="is-link" />;
                  }),
                )}
          </svg>

          {categories.map((c, ci) => {
            const p = cat.get(c.id)!;
            return (
              <button
                key={c.id}
                type="button"
                className={`map__node map__node--cat ${cls(lit.cats.has(c.id))}`}
                style={{ left: `${p.x}%`, top: `${p.y}%`, '--o': ci * 100 } as CSSProperties}
                aria-pressed={sel?.kind === 'cat' && sel.id === c.id}
                onClick={() => toggle({ kind: 'cat', id: c.id })}
              >
                {c.label}
              </button>
            );
          })}
          {technologies.map((t, ti) => {
            const p = tech.get(t.id)!;
            // Mobile list order: each category heading, then its technologies.
            const order = categories.findIndex((c) => c.id === t.category) * 100 + 1 + ti;
            const left = p.x < 50;
            return (
              <button
                key={t.id}
                type="button"
                className={`map__node map__node--tech ${left ? 'is-left' : ''} ${cls(lit.techs.has(t.id))}`}
                style={{ left: `${p.x}%`, top: `${p.y}%`, '--o': order } as CSSProperties}
                aria-pressed={sel?.kind === 'tech' && sel.id === t.id}
                onClick={() => toggle({ kind: 'tech', id: t.id })}
              >
                <span className="map__dot" aria-hidden="true" />
                {t.name}
              </button>
            );
          })}
          {projects.map((pr) => {
            const p = proj.get(pr.id)!;
            return (
              <button
                key={pr.id}
                type="button"
                className={`map__node map__node--proj ${cls(lit.projs.has(pr.id))}`}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                aria-pressed={sel?.kind === 'project' && sel.id === pr.id}
                onClick={() => toggle({ kind: 'project', id: pr.id })}
              >
                {pr.index}
                <span className="sr-only"> {pr.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

function Detail({ sel, uses }: { sel: Selection; uses: Map<string, ProjectId[]> }) {
  let title = 'Six areas, four projects';
  let body = 'Technologies I’ve worked with, grouped by area and linked to the projects that use them. Exposure, not equal proficiency.';
  let related: ProjectId[] = [];
  let kicker = 'Overview';

  if (sel?.kind === 'tech') {
    const t = technologies.find((x) => x.id === sel.id) as Technology;
    kicker = categories.find((c) => c.id === t.category)!.label;
    title = t.name;
    body = t.note;
    related = uses.get(t.id)!;
  } else if (sel?.kind === 'cat') {
    const c = categories.find((x) => x.id === sel.id)!;
    kicker = 'Category';
    title = c.label;
    body = c.blurb;
  } else if (sel?.kind === 'project') {
    const p = projectById[sel.id];
    kicker = `Project ${p.index}`;
    title = p.name;
    body = p.category;
    related = [p.id];
  }

  return (
    <div className="detail fade-up" aria-live="polite">
      <p className="label">{kicker}</p>
      <p className="detail__title">{title}</p>
      <p className="detail__body">{body}</p>
      {sel?.kind === 'tech' && (
        <p className="detail__rel">
          {related.length ? 'Used in ' : 'Not tied to a featured project.'}
          {related.map((id, i) => (
            <span key={id}>
              {i > 0 && ', '}
              <a href={`#${id}`} onClick={(e) => navigate(e, id)}>{projectById[id].name}</a>
            </span>
          ))}
        </p>
      )}
      {sel?.kind === 'project' && (
        <p className="detail__rel">
          <a href={`#${sel.id}`} onClick={(e) => navigate(e, sel.id)}>Go to project →</a>
        </p>
      )}
    </div>
  );
}
