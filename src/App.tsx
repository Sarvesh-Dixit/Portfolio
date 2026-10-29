import { useEffect, useRef } from 'react';
import { boot } from './core/boot';
import { Loader } from './components/Loader';
import { Nav } from './components/Nav';
import { SectionIndicator } from './components/SectionIndicator';
import { HeroSection } from './sections/HeroSection';
import { AboutSection } from './sections/AboutSection';
import { JourneySection } from './sections/JourneySection';
import { ProjectSection } from './sections/ProjectSection';
import { StackSection } from './sections/StackSection';
import { ProcessSection } from './sections/ProcessSection';
import { ContactSection } from './sections/ContactSection';
import { projects } from './data/projects';

export default function App() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    boot(canvas.current!);
  }, []);

  return (
    <>
      <a className="skip-link" href="#about">Skip to content</a>
      <canvas ref={canvas} className="gl" aria-hidden="true" />
      <div className="gl-fallback" aria-hidden="true" />
      <Loader />
      <Nav />
      <main id="main">
        <HeroSection />
        <AboutSection />
        <JourneySection />
        {projects.map((p) => (
          <ProjectSection key={p.id} project={p} />
        ))}
        <StackSection />
        <ProcessSection />
        <ContactSection />
      </main>
      <SectionIndicator />
    </>
  );
}
