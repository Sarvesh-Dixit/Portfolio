import { Lines, Section, Todo, sectionNo } from '../components/Section';
import { Magnetic } from '../components/Magnetic';
import { navigate } from '../components/Nav';
import { profile } from '../data/profile';

export function ContactSection() {
  const { email, linkedin, github, other } = profile.contact;
  const links = [
    linkedin && { label: 'LinkedIn', url: linkedin },
    github && { label: 'GitHub', url: github },
    ...other,
  ].filter(Boolean) as { label: string; url: string }[];

  return (
    <Section id="contact" label="Contact">
      <div className="contact">
        <p className="eyebrow">{sectionNo('contact')} — Contact</p>
        <h2 className="display contact__title" data-reveal data-focus tabIndex={-1}>
          <Lines lines={['Have an idea?', 'Let’s *engineer* it.']} />
        </h2>
        <div className="contact__row" data-reveal>
          {email ? (
            <Magnetic strength={0.15}>
              <a className="contact__email fade-up" href={`mailto:${email}`}>
                {email} <span aria-hidden="true">↗</span>
              </a>
            </Magnetic>
          ) : (
            <Todo>set profile.contact.email</Todo>
          )}
          <ul className="contact__links fade-up">
            {links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noreferrer">{l.label} ↗</a>
              </li>
            ))}
            {!linkedin && <li><Todo>linkedin</Todo></li>}
            {!github && <li><Todo>github</Todo></li>}
          </ul>
          <p className="contact__availability fade-up">{profile.availability}</p>
        </div>
        <footer className="footer">
          <span>© {new Date().getFullYear()} {profile.name}</span>
          <span className="footer__built">Built with React, Three.js &amp; Lenis</span>
          <a href="#hero" onClick={(e) => navigate(e, 'hero')}>Back to top ↑</a>
        </footer>
      </div>
    </Section>
  );
}
