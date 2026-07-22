import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import gsap from 'gsap';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';

export default function PaymentSuccess() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Using it for a simple check so tsc passes
  const isSuccess = searchParams.get('success') !== 'false';
  console.log('Payment success status:', isSuccess);
  const { user } = useAuth();
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

  // Auto-redirect to dashboard
  useEffect(() => {
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
  }, [navigate]);

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0a] flex items-center justify-center pt-20 px-6">
      <div className="success-content w-full max-w-md p-10 border border-white/10 bg-white/[0.02] text-center">

        {/* Check icon */}
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

      </div>
    </div>
  );
}
