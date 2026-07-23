import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { navigationConfig } from '../config';
import { useAuth } from '../hooks/useAuth';

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, profile, role, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileOpen(false);
    
    if (href.startsWith('#') && location.pathname !== '/') {
      navigate('/' + href);
      return;
    }
    
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSignOut = async () => {
    setDropdownOpen(false);
    setMobileOpen(false);
    await signOut();
    navigate('/login');
  };

  const avatarUrl =
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture;

  const displayName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Account';

  const initials = displayName.slice(0, 2).toUpperCase();

  if (navigationConfig.links.length === 0) {
    return null;
  }

  const mobileNavLinkClass =
    'block py-3 text-white/70 hover:text-white transition-colors no-underline font-inter font-light text-base border-b border-white/5';

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between transition-colors duration-500 px-4 sm:px-6 md:px-[5vw]"
        style={{
          height: 80,
          backgroundColor: scrolled || mobileOpen ? 'rgba(10, 10, 10, 0.95)' : 'transparent',
          backdropFilter: scrolled || mobileOpen ? 'blur(8px)' : 'none',
          borderBottom: scrolled || mobileOpen ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
        }}
      >
        <a
          href="#hero"
          onClick={(e) => handleAnchorClick(e, '#hero')}
          className="text-white no-underline z-10"
        >
          <div className="flex items-center gap-2 md:gap-3 group">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-[#4ade80]/20 to-transparent flex items-center justify-center border border-[#4ade80]/30 group-hover:border-[#4ade80]/60 transition-colors">
              <span className="text-[#4ade80] font-mono font-bold text-lg leading-none mt-0.5">Z</span>
            </div>
            <span className="text-white font-eb-garamond tracking-wide text-xl">
              QA with <span className="text-[#4ade80] font-bold italic">ZAKA</span>
            </span>
          </div>
        </a>

        <div className="hidden md:flex items-center gap-10">
          {navigationConfig.links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleAnchorClick(e, link.href)}
              className="nav-link"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {user ? (
            <div ref={dropdownRef} className="relative hidden md:block">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 group bg-transparent border-none cursor-pointer p-0"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-8 h-8 rounded-full object-cover border border-white/20 group-hover:border-white/50 transition-colors duration-300"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full border border-white/20 group-hover:border-white/50 flex items-center justify-center transition-colors duration-300"
                    style={{ background: 'rgba(201, 169, 110, 0.15)' }}
                  >
                    <span className="font-geist text-[11px] font-medium text-[#C9A96E] tracking-wide">
                      {initials}
                    </span>
                  </div>
                )}
                <span className="text-white/60 group-hover:text-white transition-colors duration-300 font-inter text-[13px] font-light">
                  {displayName}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  className="text-white/40 group-hover:text-white/70 transition-all duration-300"
                  style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 top-12 w-52 border border-white/10 bg-[#0f0f0f] shadow-2xl"
                  style={{ backdropFilter: 'blur(12px)' }}
                >
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="font-inter text-[13px] font-light text-white/40 truncate">{user.email}</p>
                  </div>
                  <Link to="/dashboard" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 no-underline font-inter text-[13px] font-light">
                    Dashboard
                  </Link>
                  <Link to="/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 no-underline font-inter text-[13px] font-light">
                    Settings
                  </Link>
                  {role === 'admin' && (
                    <Link to="/admin" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 no-underline font-inter text-[13px] font-light">
                      System Admin
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-white/50 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 border-t border-white/10 font-inter text-[13px] font-light bg-transparent cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            navigationConfig.ctaText && (
              <button
                onClick={() => navigate('/login')}
                className="nav-link hidden md:inline-block bg-transparent cursor-pointer rounded px-5 py-2 border border-white/15 transition-all duration-300 hover:border-[rgba(196,167,125,0.5)] hover:text-[#c4a77d]"
              >
                {navigationConfig.ctaText}
              </button>
            )
          )}

          {/* Mobile avatar (logged in) */}
          {user && (
            <div className="md:hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover border border-white/20" />
              ) : (
                <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-[rgba(201,169,110,0.15)]">
                  <span className="font-geist text-[11px] text-[#C9A96E]">{initials}</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-white/70 hover:text-white transition-colors p-2 -mr-2"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed top-20 left-0 right-0 bottom-0 z-40 bg-[#0a0a0a] overflow-y-auto md:hidden px-6 py-6"
            style={{ backdropFilter: 'blur(12px)' }}
          >
            <div className="max-w-lg mx-auto">
              {navigationConfig.links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleAnchorClick(e, link.href)}
                  className={mobileNavLinkClass}
                >
                  {link.label}
                </a>
              ))}

              {role !== 'admin' && (
                <Link to="/pricing" onClick={() => setMobileOpen(false)} className={mobileNavLinkClass}>
                  Pricing
                </Link>
              )}

              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)} className={mobileNavLinkClass}>
                    Dashboard
                  </Link>
                  <Link to="/settings" onClick={() => setMobileOpen(false)} className={mobileNavLinkClass}>
                    Settings
                  </Link>
                  {role === 'admin' && (
                    <Link to="/admin" onClick={() => setMobileOpen(false)} className={mobileNavLinkClass}>
                      System Admin
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className={`${mobileNavLinkClass} w-full text-left text-red-400/70 hover:text-red-400 bg-transparent border-none cursor-pointer`}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setMobileOpen(false); navigate('/login'); }}
                  className="mt-6 w-full nav-link bg-transparent cursor-pointer rounded px-5 py-3 border border-white/15 transition-all duration-300 text-center"
                >
                  {navigationConfig.ctaText || 'Start Learning'}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
