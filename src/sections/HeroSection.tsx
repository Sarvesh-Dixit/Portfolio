import { Lines, Section } from '../components/Section';
import { Magnetic } from '../components/Magnetic';
import { navigate } from '../components/Nav';
import { profile } from '../data/profile';

export function HeroSection() {
  return (
    <Section id="hero" label="Introduction">
      <div className="hero">
        <p className="eyebrow hero__name">
          <span>{profile.name}</span>
          <span aria-hidden="true">/</span>
          <span>{profile.role}</span>
        </p>
        <h1 className="display hero__title" data-focus tabIndex={-1}>
          <Lines lines={profile.headline} />
        </h1>
        <p className="hero__intro">{profile.intro}</p>
        <div className="hero__actions">
          <Magnetic>
            <a className="btn btn--primary" href="#illuxus" onClick={(e) => navigate(e, 'illuxus')}>
              Explore the work <span aria-hidden="true">→</span>
            </a>
          </Magnetic>
          <a className="btn btn--line" href="#contact" onClick={(e) => navigate(e, 'contact')}>
            Start a conversation
          </a>
        </div>
        <p className="hero__scroll" aria-hidden="true">
          <span className="hero__scroll-line" />
          Scroll to enter the screen
        </p>
      </div>
    </Section>
  );
}
