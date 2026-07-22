import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useForm as useHookForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../lib/supabase';

const schema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useHookForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.auth-content',
        { y: 30, opacity: 0, filter: 'blur(10px)' },
        { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1, ease: 'power3.out' }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const onSubmit = async (data: FormData) => {
    setSuccessMsg('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      
      setSuccessMsg('If an account exists for that email, we have sent password reset instructions.');
      reset();
    } catch (error: any) {
      setError('root', {
        type: 'manual',
        message: error.message || 'Failed to send reset email. Please try again.',
      });
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0a] flex items-center justify-center pt-20 px-6">
      <div className="auth-content w-full max-w-md p-8 border border-white/10 bg-white/[0.02]">
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-eb-garamond mb-2">Reset Password</h1>
          <p className="text-white/50 font-inter font-light text-sm">
            Enter your email to receive a password reset link.
          </p>
        </div>

        {successMsg && (
          <div
            className="mb-6 p-3 border text-sm font-inter font-light rounded"
            style={{
              background: 'rgba(34, 197, 94, 0.08)',
              borderColor: 'rgba(34, 197, 94, 0.2)',
              color: 'rgb(74, 222, 128)',
            }}
          >
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {errors.root && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-inter font-light rounded">
              {errors.root.message}
            </div>
          )}

          <Input
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            {...register('email')}
            error={errors.email?.message}
          />

          <Button type="submit" fullWidth variant="primary" disabled={isSubmitting || !!successMsg}>
            {isSubmitting ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm font-inter text-white/50 font-light">
          Remember your password?{' '}
          <Link to="/login" className="text-white hover:underline underline-offset-4 transition-all">
            Back to login
          </Link>
        </div>

      </div>
    </div>
  );
}
