import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Map, Clapperboard, Layers, Mail, Tag, LayoutDashboard, Settings as SettingsIcon,
  ShieldCheck, LogOut, Rocket,
} from 'lucide-react';
import { navigationConfig } from '../config';
import { useAuth } from '../hooks/useAuth';
import { Dock, DockIcon, DockItem, DockLabel } from '../components/ui/dock';

type DockEntry = {
  key: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
};

const SECTION_ICONS: Record<string, React.ReactNode> = {
  'Learning Path': <Map className="w-full h-full text-white/70" />,
  'Live Demo': <Clapperboard className="w-full h-full text-white/70" />,
  'Tool Stack': <Layers className="w-full h-full text-white/70" />,
  'Contact': <Mail className="w-full h-full text-white/70" />,
};

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const goToAnchor = (href: string) => {
    if (location.pathname !== '/') {
      navigate('/' + href);
      return;
    }
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isAdmin = role === 'admin';

  // Every entry here maps 1:1 to something that already existed in the
  // previous top nav / avatar dropdown — nothing new is being added, this
  // just converts those same destinations into dock icons.
  const entries: DockEntry[] = [
    ...navigationConfig.links.map((link) => ({
      key: link.label,
      label: link.label,
      icon: SECTION_ICONS[link.label] ?? <Map className="w-full h-full text-white/70" />,
      onClick: () => goToAnchor(link.href),
    })),
  ];

  if (!isAdmin) {
    entries.push({
      key: 'pricing',
      label: 'Pricing',
      icon: <Tag className="w-full h-full text-white/70" />,
      onClick: () => navigate('/pricing'),
    });
  }

  if (user) {
    entries.push({
      key: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-full h-full text-white/70" />,
      onClick: () => navigate('/dashboard'),
    });
    entries.push({
      key: 'settings',
      label: 'Settings',
      icon: <SettingsIcon className="w-full h-full text-white/70" />,
      onClick: () => navigate('/settings'),
    });
    if (isAdmin) {
      entries.push({
        key: 'admin',
        label: 'Admin',
        icon: <ShieldCheck className="w-full h-full text-white/70" />,
        onClick: () => navigate('/admin'),
      });
    }
    entries.push({
      key: 'signout',
      label: 'Sign Out',
      icon: <LogOut className="w-full h-full text-red-400/80" />,
      onClick: handleSignOut,
    });
  } else if (navigationConfig.ctaText) {
    entries.push({
      key: 'cta',
      label: navigationConfig.ctaText,
      icon: <Rocket className="w-full h-full text-[#C9A96E]" />,
      onClick: () => navigate('/login'),
    });
  }

  if (navigationConfig.links.length === 0) {
    return null;
  }

  return (
    <>
      {/* Minimal top bar — brand only, navigation now lives in the dock below */}
      <nav
        className="fixed top-0 left-0 right-0 z-40 flex items-center px-4 sm:px-6 md:px-[5vw] transition-colors duration-500"
        style={{
          height: 80,
          backgroundColor: scrolled ? 'rgba(10, 10, 10, 0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(8px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
        }}
      >
        <a
          href="#hero"
          onClick={(e) => { e.preventDefault(); goToAnchor('#hero'); }}
          className="text-white no-underline z-10"
        >
          <div className="flex items-center gap-3 group">
            <div className="relative flex items-center justify-center w-8 h-8">
              <div className="absolute inset-0 border-[1.5px] border-white/30 rounded-sm rotate-45 group-hover:rotate-180 transition-all duration-700 ease-in-out group-hover:border-white/70"></div>
              <div className="absolute w-3 h-3 bg-white rounded-[1px] rotate-45 group-hover:bg-[#4ade80] transition-colors duration-700"></div>
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-white font-inter font-bold tracking-[0.2em] text-[10px] uppercase leading-none mb-1 opacity-70">
                QA with
              </span>
              <span className="text-white font-eb-garamond text-xl leading-none tracking-wide">
                ZAKA
              </span>
            </div>
          </div>
        </a>
      </nav>

      {/* Floating dock — the actual navigation, same on every screen size */}
      <div className="fixed bottom-3 sm:bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-[94vw]">
        <Dock className="items-end pb-2.5">
          {entries.map((entry) => (
            <DockItem
              key={entry.key}
              onClick={entry.onClick}
              aria-label={entry.label}
              className="aspect-square rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <DockLabel>{entry.label}</DockLabel>
              <DockIcon>{entry.icon}</DockIcon>
            </DockItem>
          ))}
        </Dock>
      </div>
    </>
  );
}
