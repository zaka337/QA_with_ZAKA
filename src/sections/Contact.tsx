import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';

export default function Contact() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;
    if (!section || !content) return;

    gsap.set(content, { opacity: 0, y: 40 });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            gsap.to(content, {
              opacity: 1,
              y: 0,
              duration: 1.2,
              ease: 'power3.out',
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch("https://formspree.io/f/mqerdzrg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setIsSubmitted(true);
        setFormData({ name: '', email: '', message: '' });
        
        // Reset success state after a few seconds
        setTimeout(() => {
          setIsSubmitted(false);
        }, 5000);
      } else {
        console.error("Form submission failed");
      }
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      ref={sectionRef}
      style={{
        padding: '120px 5vw 120px',
        background: '#0a0a0a',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div 
        ref={contentRef}
        style={{ maxWidth: 800, margin: '0 auto' }}
      >
        <div className="text-center mb-16">
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
            Get In Touch
          </div>
          <h2
            style={{
              fontFamily: "'EB Garamond', serif",
              fontWeight: 400,
              fontSize: 'clamp(40px, 5vw, 64px)',
              lineHeight: 1.1,
              letterSpacing: '-1px',
              color: '#ffffff',
            }}
          >
            Let's build something exceptional.
          </h2>
        </div>

        <div 
          className="p-8 md:p-12 rounded-2xl relative overflow-hidden group"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 0 80px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Subtle glow effect behind form */}
          <div 
            className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 pointer-events-none transition-opacity duration-700 group-hover:opacity-40"
            style={{
              background: 'radial-gradient(circle, rgba(196, 167, 125, 0.8) 0%, rgba(0,0,0,0) 70%)',
              filter: 'blur(40px)',
            }}
          />

          <style>{`
            .premium-input:-webkit-autofill,
            .premium-input:-webkit-autofill:hover, 
            .premium-input:-webkit-autofill:focus, 
            .premium-input:-webkit-autofill:active {
                -webkit-box-shadow: 0 0 0 30px transparent inset !important;
                transition: background-color 5000s ease-in-out 0s;
                -webkit-text-fill-color: white !important;
            }
          `}</style>

          <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-10 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="flex flex-col gap-2 relative">
                <label className="text-[10px] font-mono tracking-[0.2em] text-white/40 uppercase">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                  className="premium-input w-full bg-transparent border-0 border-b border-white/10 px-0 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/60 focus:ring-0 transition-all font-inter font-light"
                />
              </div>
              <div className="flex flex-col gap-2 relative">
                <label className="text-[10px] font-mono tracking-[0.2em] text-white/40 uppercase">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="john@example.com"
                  className="premium-input w-full bg-transparent border-0 border-b border-white/10 px-0 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/60 focus:ring-0 transition-all font-inter font-light"
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-2 relative">
              <label className="text-[10px] font-mono tracking-[0.2em] text-white/40 uppercase">Message</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                placeholder="How can we collaborate?"
                rows={1}
                className="premium-input w-full bg-transparent border-0 border-b border-white/10 px-0 py-3 text-white placeholder-white/20 focus:outline-none focus:border-white/60 focus:ring-0 transition-all font-inter font-light resize-none min-h-[40px]"
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isSubmitted}
              className="mt-4 px-8 py-4 bg-white text-black font-inter text-sm font-medium tracking-wide rounded-lg flex items-center justify-center transition-all hover:bg-white/90 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  <span>Sending...</span>
                </div>
              ) : isSubmitted ? (
                <span className="text-green-600 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Message Sent
                </span>
              ) : (
                "Send Message"
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
