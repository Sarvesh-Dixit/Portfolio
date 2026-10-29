import { useEffect, useState, type MouseEvent } from 'react';
import { profile } from '../data/profile';
import { PROJECT_SECTIONS, type SectionId } from '../data/sections';
import { goTo, lockScroll } from '../core/scroll';
import { activeSectionStore } from '../core/state';
import { useStore } from '../core/store';
import { Magnetic } from './Magnetic';

const LINKS: { id: SectionId; label: string }[] = [
  { id: 'illuxus', label: 'Work' },
  { id: 'about', label: 'About' },
  { id: 'journey', label: 'Journey' },
  { id: 'stack', label: 'Stack' },
  { id: 'process', label: 'Process' },
  { id: 'contact', label: 'Contact' },
];

export function navigate(e: MouseEvent, id: SectionId) {
  e.preventDefault();
  goTo(id, { focus: true });
}

export function Nav() {
  const active = useStore(activeSectionStore);
  const [open, setOpen] = useState(false);
  const current = PROJECT_SECTIONS.includes(active) ? 'illuxus' : active;

  useEffect(() => {
    if (!open) return;
    lockScroll(true);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      lockScroll(false);
    };
  }, [open]);

  const go = (e: MouseEvent, id: SectionId) => {
    setOpen(false);
    navigate(e, id);
  };

  return (
    <header className={`nav ${open ? 'nav--open' : ''}`}>
      <a href="#hero" className="nav__mark" onClick={(e) => go(e, 'hero')} aria-label={`${profile.name}, back to top`}>
        <span className="nav__dot" aria-hidden="true" />
        {profile.name}
      </a>
      <nav aria-label="Primary">
        <ul className="nav__links" id="nav-links">
          {LINKS.map((l) => (
            <li key={l.id}>
              <a href={`#${l.id}`} onClick={(e) => go(e, l.id)} aria-current={current === l.id ? 'true' : undefined}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <Magnetic>
        <a href="#contact" className="btn btn--primary nav__cta" onClick={(e) => go(e, 'contact')}>
          Let’s talk
        </a>
      </Magnetic>
      <button
        type="button"
        className="nav__toggle"
        aria-expanded={open}
        aria-controls="nav-links"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? 'Close' : 'Menu'}
      </button>
    </header>
  );
}
