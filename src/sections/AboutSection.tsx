import { Lines, Section, Todo, sectionNo } from '../components/Section';
import { profile } from '../data/profile';

export function AboutSection() {
  return (
    <Section id="about">
      <div className="about">
        <p className="eyebrow">{sectionNo('about')} — About</p>
        <h2 className="display about__statement" data-reveal data-focus tabIndex={-1}>
          <Lines lines={profile.statement} />
        </h2>
        <div className="about__grid" data-reveal>
          <div className="about__col fade-up">
            <h3 className="label">Bio</h3>
            <p>{profile.bio}</p>
          </div>
          <div className="about__col fade-up">
            <h3 className="label">Focus</h3>
            <ul>{profile.focus.map((f, i) => <li key={i}>{f}</li>)}</ul>
          </div>
          <div className="about__col fade-up">
            <h3 className="label">Interests</h3>
            <ul>{profile.interests.map((f, i) => <li key={i}>{f}</li>)}</ul>
          </div>
          {profile.experience.length > 0 ? (
            <div className="about__col fade-up">
              <h3 className="label">Experience</h3>
              <ul className="about__exp">
                {profile.experience.map((x, i) => (
                  <li key={i}>
                    <span className="mono">{x.period}</span> {x.role}, {x.org}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="about__col"><Todo>add experience in profile.ts (optional)</Todo></div>
          )}
          <p className="about__philosophy fade-up">{profile.philosophy}</p>
        </div>
      </div>
    </Section>
  );
}
