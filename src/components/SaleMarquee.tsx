import { useNavigate } from 'react-router-dom';

const MESSAGE = 'LIMITED TIME — 50% OFF ALL COURSES — USE CODE SAVE50 AT CHECKOUT';

export function SaleMarquee() {
  const navigate = useNavigate();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate('/pricing')}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/pricing'); } }}
      className="fixed top-0 left-0 right-0 z-[60] h-8 bg-[#c4a77d] text-black overflow-hidden cursor-pointer flex items-center"
    >
      <style>{`
        @keyframes sale-marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .sale-marquee-track {
          animation: sale-marquee-scroll 22s linear infinite;
        }
      `}</style>
      <div className="sale-marquee-track flex whitespace-nowrap">
        {Array.from({ length: 8 }).map((_, i) => (
          <span
            key={i}
            className="font-geist text-[11px] font-medium uppercase tracking-[0.15em] px-6"
          >
            {MESSAGE}
          </span>
        ))}
      </div>
    </div>
  );
}
