import { useEffect, useState } from 'react';
import { supabase, type Profile } from '../lib/supabase';

// Infer user type directly from supabase client
type SupabaseUser = Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'];

/**
 * Auto-populate empty profile fields from OAuth user_metadata.
 * This only writes ONCE (when fields are null), so future logins
 * with different providers will never overwrite the permanent profile.
 */
async function autoPopulateProfile(user: NonNullable<SupabaseUser>, profileData: Profile): Promise<Profile> {
  const needsName = !profileData.display_name;
  const needsAvatar = !profileData.avatar_url;

  if (!needsName && !needsAvatar) return profileData;

  const meta = user.user_metadata || {};
  const updates: Partial<Profile> = {};

  if (needsName) {
    updates.display_name = meta.full_name || meta.name || user.email?.split('@')[0] || null;
  }
  if (needsAvatar) {
    updates.avatar_url = meta.avatar_url || meta.picture || null;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (!error) {
      return { ...profileData, ...updates };
    }
  }

  return profileData;
}

export function useAuth() {
  const [user, setUser] = useState<SupabaseUser>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadProfile(authUser: NonNullable<SupabaseUser>) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileData && mounted) {
        // Auto-populate empty fields from OAuth metadata (one-time only)
        const populated = await autoPopulateProfile(authUser, profileData as Profile);
        if (mounted) setProfile(populated);
      }
    }

    async function fetchSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        if (mounted) setUser(session.user);
        await loadProfile(session.user);
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
        await loadProfile(session.user);
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
