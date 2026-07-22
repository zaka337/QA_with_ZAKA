import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useForm as useHookForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../lib/supabase';

/* ── Schemas ── */
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

const signupSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Forms for standard email/pass if desired (omitted from UI for minimalism, but typed here)

interface AuthProps {
  type: 'login' | 'signup';
}

/* ── Social Providers ── */
const socialProviders = [
  {
    id: 'google' as const,
    label: 'Google',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: 'github' as const,
    label: 'GitHub',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
      </svg>
    ),
  },
  {
    id: 'linkedin_oidc' as const,
    label: 'LinkedIn',
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
];

export default function Auth({ type }: AuthProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const isLogin = type === 'login';
  const [successMsg, setSuccessMsg] = useState('');
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const schema = isLogin ? loginSchema : signupSchema;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
  } = useHookForm<any>({
    resolver: zodResolver(schema),
  });

  // Reset form when switching between login and signup
  useEffect(() => {
    reset();
    setSuccessMsg('');
  }, [type, reset]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.auth-content',
        { y: 30, opacity: 0, filter: 'blur(10px)' },
        { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1, ease: 'power3.out' }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [type]);

  /* ── Email/Password Submit ── */
  const onSubmit = async (data: any) => {
    setSuccessMsg('');
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
        setSuccessMsg('Account created! Check your email for a confirmation link, or sign in directly.');
        reset();
      }
    } catch (error: any) {
      setError('root', {
        type: 'manual',
        message: error.message || 'Authentication failed. Please try again.',
      });
    }
  };

  /* ── Social OAuth ── */
  const handleSocialLogin = async (provider: 'google' | 'github' | 'linkedin_oidc') => {
    setSocialLoading(provider);
    try {
      // Save provider so we can display the correct avatar after redirect
      localStorage.setItem('auth_provider', provider);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      setError('root', {
        type: 'manual',
        message: error.message || `Failed to sign in with ${provider}`,
      });
      setSocialLoading(null);
    }
  };


  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0a] flex items-center justify-center pt-20 pb-12 px-6">
      <div className="auth-content w-full max-w-md p-8 border border-white/10 bg-white/[0.02]">
        {/* ── Header ── */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-eb-garamond mb-2">
            {isLogin ? 'Welcome Back' : 'Begin Your Journey'}
          </h1>
          <p className="text-white/50 font-inter font-light text-sm">
            {isLogin
              ? 'Enter your credentials to continue.'
              : 'Create an account to access the platform.'}
          </p>
        </div>

        {/* ── Success Message ── */}
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

        {/* ── Form ── */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Root error */}
          {errors.root && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-inter font-light rounded">
              {(errors.root as any).message}
            </div>
          )}

          {/* Email */}
          <Input
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            autoComplete="email"
            {...register('email')}
            error={(errors as any).email?.message}
          />

          {/* Password */}
          <div>
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              {...register('password')}
              error={(errors as any).password?.message}
            />

            {/* ── Password requirements hint (signup only) ── */}
            {!isLogin && !(errors as any).password && (
              <p className="mt-2 text-xs text-white/30 font-inter font-light">
                Min 8 chars · uppercase · lowercase · number · special character
              </p>
            )}
          </div>

          {/* Confirm Password (signup only) */}
          {!isLogin && (
            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              {...register('confirmPassword')}
              error={(errors as any).confirmPassword?.message}
            />
          )}

          {/* Forgot password link (login only) */}
          {isLogin && (
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs text-white/40 hover:text-white transition-colors duration-300 font-inter font-light underline underline-offset-4"
              >
                Forgot your password?
              </Link>
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" fullWidth variant="primary" disabled={isSubmitting}>
            {isSubmitting
              ? 'Processing...'
              : isLogin
                ? 'Sign In'
                : 'Create Account'}
          </Button>
        </form>

        {/* ── Divider ── */}
        <div className="flex items-center my-8">
          <div className="flex-1 h-px bg-white/10" />
          <span className="px-4 text-xs text-white/30 font-inter font-light uppercase tracking-widest">
            or continue with
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* ── Social Logins ── */}
        <div className="flex flex-col gap-3">
          {socialProviders.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={socialLoading !== null}
              onClick={() => handleSocialLogin(p.id)}
              className="
                flex items-center justify-center gap-3
                w-full py-3 px-4
                border border-white/10
                bg-transparent
                text-white/70 font-inter font-light text-sm tracking-wide
                hover:bg-white/5 hover:border-white/25 hover:text-white
                transition-all duration-300
                disabled:opacity-40 disabled:cursor-not-allowed
              "
              style={{ borderRadius: 0 }}
            >
              {socialLoading === p.id ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                p.icon
              )}
              <span>{socialLoading === p.id ? 'Redirecting...' : p.label}</span>
            </button>
          ))}
        </div>

        {/* ── Toggle link ── */}
        <div className="mt-8 text-center text-sm font-inter text-white/50 font-light">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <Link
            to={isLogin ? '/signup' : '/login'}
            className="text-white hover:underline underline-offset-4 transition-all"
          >
            {isLogin ? 'Sign up' : 'Log in'}
          </Link>
        </div>
      </div>
    </div>
  );
}
