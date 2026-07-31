import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { Button } from '../components/Button';
import { AnimatedHero } from '../components/ui/animated-hero';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { useState } from 'react';

const LIFETIME_PRICE_ID = import.meta.env.VITE_STRIPE_LIFETIME_PRICE_ID;
const MONTHLY_PRICE_ID = import.meta.env.VITE_STRIPE_MONTHLY_PRICE_ID;

export default function Pricing() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, role, isLoading } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && role === 'admin') {
      navigate('/dashboard');
    }
  }, [role, isLoading, navigate]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.pricing-card',
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, stagger: 0.2, ease: 'power3.out' }
      );
      gsap.fromTo(
        '.pricing-header',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.2 }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleCheckout = async (priceId: string, plan: 'monthly' | 'lifetime') => {
    // If not logged in, redirect to signup
    if (!user) {
      navigate('/signup');
      return;
    }

    setLoadingPlan(plan);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          price_id: priceId,
          user_id: user.id,
          user_email: user.email,
          plan,
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      alert(err.message || 'Failed to start checkout. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div ref={containerRef} className="pt-32 pb-24 min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">

        <div className="pricing-header mb-20">
          <AnimatedHero
            prefix="Master the"
            words={["Craft", "Toolchain", "Automation", "Career"]}
            description="Gain full access to the complete roadmap, premium video courses, and an exclusive alumni community."
          />
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">

          {/* Monthly Plan */}
          <div className="pricing-card p-8 border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors duration-500 flex flex-col">
            <h2 className="text-2xl font-eb-garamond mb-2">Monthly Access</h2>
            <div className="text-5xl font-inter font-light mb-6">
              $19<span className="text-xl text-white/50">/mo</span>
            </div>

            <ul className="flex-1 space-y-4 mb-8 font-inter text-white/70 font-light">
              {[
                'Full Curriculum Access',
                'Weekly Content Updates',
                'Community Forum',
                'Cancel Anytime',
              ].map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/50 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              fullWidth
              disabled={loadingPlan !== null}
              onClick={() => handleCheckout(MONTHLY_PRICE_ID, 'monthly')}
            >
              {loadingPlan === 'monthly' ? 'Redirecting...' : 'Start Monthly'}
            </Button>
          </div>

          {/* Lifetime Plan */}
          <div className="pricing-card p-8 border border-white/30 bg-white/[0.05] relative flex flex-col">
            <div className="absolute top-0 right-0 bg-white text-black font-geist text-xs px-3 py-1 uppercase tracking-widest font-medium">
              Most Popular
            </div>
            <h2 className="text-2xl font-eb-garamond mb-2">Lifetime Access</h2>
            <div className="text-5xl font-inter font-light mb-6">
              $199<span className="text-xl text-white/50"> one-time</span>
            </div>

            <ul className="flex-1 space-y-4 mb-8 font-inter text-white/70 font-light">
              {[
                'Everything in Monthly',
                'Lifetime Updates',
                'Downloadable Resources',
                'Direct 1-on-1 Feedback',
              ].map((f) => (
                <li key={f} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/90 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              variant="primary"
              fullWidth
              disabled={loadingPlan !== null}
              onClick={() => handleCheckout(LIFETIME_PRICE_ID, 'lifetime')}
            >
              {loadingPlan === 'lifetime' ? 'Redirecting...' : 'Get Lifetime Access'}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
