import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useForm as useHookForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '../lib/supabase';

const schema = z
  .object({
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

type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [successMsg, setSuccessMsg] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
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

  // Supabase automatically handles the access_token in the URL fragment (#) 
  // and establishes a session if the token is valid.
  const onSubmit = async (data: FormData) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });
      
      if (error) throw error;
      
      setSuccessMsg('Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (error: any) {
      setError('root', {
        type: 'manual',
        message: error.message || 'Failed to reset password. The link may have expired.',
      });
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-[#0a0a0a] flex items-center justify-center pt-20 px-6">
      <div className="auth-content w-full max-w-md p-8 border border-white/10 bg-white/[0.02]">
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-eb-garamond mb-2">Update Password</h1>
          <p className="text-white/50 font-inter font-light text-sm">
            Enter your new secure password below.
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

          <div>
            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              {...register('password')}
              error={errors.password?.message}
            />
            
            {!errors.password && (
              <p className="mt-2 text-xs text-white/30 font-inter font-light">
                Min 8 chars · uppercase · lowercase · number · special character
              </p>
            )}
          </div>

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />

          <Button type="submit" fullWidth variant="primary" disabled={isSubmitting || !!successMsg}>
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </Button>
        </form>

      </div>
    </div>
  );
}
