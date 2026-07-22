import { useEffect, useState } from 'react';
import { supabase, type Profile } from '../lib/supabase';

// Infer user type directly from supabase client
type SupabaseUser = Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'];

export function useAuth() {
  const [user, setUser] = useState<SupabaseUser>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        if (mounted) setUser(session.user);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (mounted && profileData) {
          setProfile(profileData as Profile);
        }
      } else {
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      }
      if (mounted) setIsLoading(false);
    }

    fetchSession();

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsLoading(true);
      if (session?.user) {
        if (mounted) setUser(session.user);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (mounted && profileData) {
          setProfile(profileData as Profile);
        }
      } else {
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      }
      if (mounted) setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    profile,
    role: profile?.role || 'student',
    isAuthenticated: !!user,
    isLoading,
    signOut
  };
}
