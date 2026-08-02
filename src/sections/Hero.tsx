import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AmberCascades from './AmberCascades';
import LiquidGlassButton from '../components/LiquidGlassButton';
import { heroConfig } from '../config';

export default function Hero() {
  const navigate = useNavigate();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [titleWidth, setTitleWidth] = useState<number>(0);

  useEffect(() => {
    const measure = () => {
      if (titleRef.current) setTitleWidth(titleRef.current.offsetWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  if (!heroConfig.title) {
    return null;
  }

  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden"
      style={{ height: '100vh' }}
    >
      <AmberCascades />
      <div
        className="relative z-10 flex flex-col justify-between pointer-events-none"
        style={{
          height: '100%',
          padding: '28vh 5vw 8vh',
        }}
      >
        <div>
          <h1
            ref={titleRef}
            className="text-white"
            style={{
              fontFamily: "'GeistMono', monospace",
              fontWeight: 400,
              fontSize: 'clamp(48px, 6vw, 96px)',
              lineHeight: 1.0,
              letterSpacing: '-3px',
              textShadow: '0 4px 24px rgba(0,0,0,0.8)',
              marginBottom: 'clamp(32px, 4vw, 56px)',
              width: 'fit-content',
            }}
          >
            {heroConfig.title}
          </h1>
          {heroConfig.subtitleLine1 && (
            <p
              style={{
                fontFamily: "'GeistMono', monospace",
                fontWeight: 200,
                fontSize: 'clamp(15px, 1.5vw, 22px)',
                lineHeight: 1.7,
                letterSpacing: '-0.3px',
                color: '#ffffff',
                margin: '0 0 12px 0',
                width: titleWidth || 'auto',
                maxWidth: '100%',
                textShadow: '0 2px 12px rgba(0,0,0,0.6)',
              }}
            >
              {heroConfig.subtitleLine1}
            </p>
          )}
          {heroConfig.subtitleLine2 && (
            <p
              style={{
                fontFamily: "'GeistMono', monospace",
                fontWeight: 200,
                fontSize: 'clamp(15px, 1.5vw, 22px)',
                lineHeight: 1.7,
                letterSpacing: '-0.3px',
                color: '#ffffff',
                margin: 0,
                width: titleWidth || 'auto',
                maxWidth: '100%',
                textShadow: '0 2px 12px rgba(0,0,0,0.6)',
              }}
            >
              {heroConfig.subtitleLine2}
            </p>
          )}
        </div>

        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}
          className="pointer-events-auto"
        >
          {/* Primary action — a new visitor's only path to sign up was
              previously buried in the nav bar; this button existed but only
              scrolled to the curriculum section, with no actual signup link
              anywhere on the homepage itself. */}
          <LiquidGlassButton onClick={() => navigate('/signup')}>
            Get Started Free
          </LiquidGlassButton>

          {heroConfig.ctaText && (
            <button
              onClick={() => {
                document.querySelector('#curriculum')?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                fontFamily: "'GeistMono', monospace",
                fontSize: 13,
                letterSpacing: '0.5px',
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '4px',
                textDecorationColor: 'rgba(255,255,255,0.25)',
              }}
            >
              {heroConfig.ctaText} ↓
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
