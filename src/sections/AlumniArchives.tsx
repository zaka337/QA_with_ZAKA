import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { researchConfig } from '../config';

export default function AlumniArchives() {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const text = textRef.current;
    if (!section || !text) return;

    gsap.set(text, { opacity: 0, y: 30 });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.to(text, {
              opacity: 1,
              y: 0,
              duration: 1,
              ease: 'power3.out',
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  if (!researchConfig.sectionLabel && researchConfig.projects.length === 0) {
    return null;
  }

  // Duplicate items to create a seamless infinite loop
  const duplicatedProjects = [...researchConfig.projects, ...researchConfig.projects];

  return (
    <section
      id="alumni"
      ref={sectionRef}
      style={{
        padding: '120px 0 80px',
        background: '#0a0a0a',
        position: 'relative',
        zIndex: 2,
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 5vw' }} ref={textRef}>
        {researchConfig.sectionLabel && (
          <div
            className="mb-6"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 300,
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: '#dadada',
              opacity: 0.6,
            }}
          >
            {researchConfig.sectionLabel}
          </div>
        )}
        <div
          className="mb-16"
          style={{
            width: '100%',
            height: 1,
            background: 'rgba(255, 255, 255, 0.1)',
          }}
        />
      </div>

      {/* Marquee Container */}
      <div className="relative w-full overflow-hidden flex items-center group">
        {/* Left Fade */}
        <div className="absolute top-0 left-0 w-24 md:w-64 h-full bg-gradient-to-r from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
        
        {/* Right Fade */}
        <div className="absolute top-0 right-0 w-24 md:w-64 h-full bg-gradient-to-l from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
        
        {/* Animated Track */}
        <div className="flex animate-marquee group-hover:[animation-play-state:paused] w-max">
          {duplicatedProjects.map((project, i) => (
            <div
              key={`${project.title}-${i}`}
              className="flex items-center space-x-4 mx-4 md:mx-8 px-6 py-4 rounded-xl cursor-pointer transition-colors duration-300 hover:bg-white/5"
              style={{
                border: '1px solid rgba(255, 255, 255, 0.05)',
                minWidth: '280px',
              }}
            >
              {project.image && (
                <div className="w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-white/5">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover transition-all duration-300"
                    style={{
                      opacity: 0.8,
                      filter: 'grayscale(100%)',
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLImageElement).style.opacity = '1';
                      (e.target as HTMLImageElement).style.filter = 'grayscale(0%)';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLImageElement).style.opacity = '0.8';
                      (e.target as HTMLImageElement).style.filter = 'grayscale(100%)';
                    }}
                    loading="lazy"
                  />
                </div>
              )}
              <div className="flex flex-col">
                <h4
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 500,
                    fontSize: 15,
                    color: '#ffffff',
                    margin: '0 0 2px 0',
                    lineHeight: 1.2,
                  }}
                >
                  {project.title}
                </h4>
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 300,
                    fontSize: 13,
                    color: '#dadada',
                    opacity: 0.5,
                  }}
                >
                  {project.discipline}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
