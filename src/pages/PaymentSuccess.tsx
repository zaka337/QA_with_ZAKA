import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getProfile } from '../lib/supabase';

const POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 8; // ~12s — the Stripe webhook is normally near-instant

type ConfirmStatus = 'confirming' | 'confirmed' | 'timeout';

export default function PaymentSuccess() {
  useDocumentTitle('Payment Successful');
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<ConfirmStatus>('confirming');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.success-content',
        { y: 30, opacity: 0, filter: 'blur(10px)' },
        { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1, ease: 'power3.out' }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  // Poll the profile until the Stripe webhook has actually granted the plan,
  // instead of assuming success purely from landing on this URL.
  useEffect(() => {
    if (!user) return;
    let attempts = 0;
    let cancelled = false;

    const check = async () => {
      const profile = await getProfile(user.id);
      if (cancelled) return;
      if (profile?.plan === 'lifetime' || profile?.plan === 'monthly') {
        setStatus('confirmed');
        return;
      }
      attempts += 1;
      if (attempts >= MAX_POLL_ATTEMPTS) {
        setStatus('timeout');
        return;
      }
      setTimeout(check, POLL_INTERVAL_MS);
    };

    check();
    return () => { cancelled = true; };
  }, [user]);

  // Auto-redirect to dashboard, only once confirmed
  useEffect(() => {
    if (status !== 'confirmed') return;
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(interval);
          navigate('/dashboard');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, navigate]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0a] flex items-center justify-center pt-20 px-6">
      <div className="success-content w-full max-w-md p-10 border border-white/10 bg-white/[0.02] text-center">

        {status === 'confirming' && (
          <>
            <div className="w-16 h-16 rounded-full mx-auto mb-8 flex items-center justify-center border border-white/10">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
            </div>
            <h1 className="text-3xl font-eb-garamond mb-3">Confirming your payment...</h1>
            <p className="text-white/50 font-inter font-light text-sm leading-relaxed">
              This usually only takes a few seconds. Please don't close this page.
            </p>
          </>
        )}

        {status === 'confirmed' && (
          <>
            <div
              className="w-16 h-16 rounded-full mx-auto mb-8 flex items-center justify-center"
              style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgb(74,222,128)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>

            <h1 className="text-3xl font-eb-garamond mb-3">Payment Successful!</h1>
            <p className="text-white/50 font-inter font-light text-sm mb-8 leading-relaxed">
              Welcome aboard{user?.email ? `, ${user.email.split('@')[0]}` : ''}! Your account has been upgraded and you now have full access to all courses.
            </p>

            <div className="mb-6 text-white/30 font-inter font-light text-xs">
              Redirecting to your dashboard in <span className="text-white">{countdown}</span>s...
            </div>

            <Button variant="primary" fullWidth onClick={() => navigate('/dashboard')}>
              Go to Dashboard Now
            </Button>
          </>
        )}

        {status === 'timeout' && (
          <>
            <div
              className="w-16 h-16 rounded-full mx-auto mb-8 flex items-center justify-center"
              style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgb(234,179,8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h1 className="text-3xl font-eb-garamond mb-3">Almost there</h1>
            <p className="text-white/50 font-inter font-light text-sm mb-8 leading-relaxed">
              We received your payment, but your account is taking a little longer than usual to update.
              It should activate within a minute or two — check your dashboard shortly, or reach out if it doesn't.
            </p>
            <Button variant="primary" fullWidth onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          </>
        )}

      </div>
    </div>
  );
}
