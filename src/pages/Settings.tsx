import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../hooks/useAuth';
import { supabase, getProfile, updateProfile, uploadAvatar } from '../lib/supabase';
import { Button } from '../components/Button';

export default function Settings() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Fetch current profile on load
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const profile = await getProfile(user.id);
      if (profile) {
        setDisplayName(profile.display_name || user.user_metadata?.full_name || user.user_metadata?.name || '');
        setAvatarUrl(profile.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || '');
      }
      setLoading(false);
    };
    load();
  }, [user, navigate]);

  // 2. Animate entrance
  useEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.settings-item',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power2.out' }
      );
    }, containerRef);
    return () => ctx.revert();
  }, [loading]);

  // 3. Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      // Create local preview
      setAvatarUrl(URL.createObjectURL(file));
    }
  };

  // 4. Save Profile
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSuccessMsg('');

    try {
      let finalAvatarUrl = avatarUrl;

      // Upload new avatar if selected
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar(user.id, avatarFile);
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl;
          setAvatarUrl(uploadedUrl);
        }
      }

      // Update auth.users metadata (so Navigation updates instantly)
      await supabase.auth.updateUser({
        data: {
          name: displayName,
          full_name: displayName,
          avatar_url: finalAvatarUrl,
          picture: finalAvatarUrl,
        }
      });

      // Update profiles table
      await updateProfile(user.id, {
        display_name: displayName,
        avatar_url: finalAvatarUrl
      });

      setSuccessMsg('Profile updated successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      alert('Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="loading-text"><span>L</span><span>O</span><span>A</span><span>D</span><span>I</span><span>N</span><span>G</span></div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="pt-32 pb-24 min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-6 lg:px-8">
        
        <header className="settings-item mb-12 border-b border-white/10 pb-6">
          <h1 className="text-4xl font-eb-garamond mb-2">Profile Settings</h1>
          <p className="text-white/50 font-inter font-light text-sm">
            Manage your personal details and how you appear to the community.
          </p>
        </header>

        <form onSubmit={handleSave} className="space-y-10">
          
          {/* Avatar Section */}
          <div className="settings-item flex flex-col md:flex-row gap-8 items-start md:items-center p-8 bg-white/[0.02] border border-white/5">
            <div className="relative group">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Avatar" 
                  className="w-24 h-24 rounded-full object-cover border border-white/20 group-hover:border-white/50 transition-colors"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border border-white/20 font-eb-garamond text-2xl group-hover:border-white/50 transition-colors">
                  {displayName ? displayName[0].toUpperCase() : user?.email?.[0].toUpperCase()}
                </div>
              )}
              
              <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity backdrop-blur-sm">
                <span className="text-xs font-geist uppercase tracking-widest text-white">Change</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
            
            <div className="flex-1">
              <h3 className="font-eb-garamond text-xl mb-1">Profile Photo</h3>
              <p className="font-inter font-light text-sm text-white/50 mb-4">
                Recommended size: 400x400px. JPG, PNG, or WebP.
              </p>
              <label className="cursor-pointer px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-xs font-geist uppercase tracking-widest inline-block">
                Upload New Photo
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          </div>

          {/* Details Section */}
          <div className="settings-item space-y-6 p-8 bg-white/[0.02] border border-white/5">
            <div>
              <label className="block text-xs font-geist text-white/50 uppercase tracking-widest mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-transparent border-b border-white/20 py-2 font-inter text-lg focus:outline-none focus:border-white transition-colors"
                placeholder="How should we call you?"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-geist text-white/50 uppercase tracking-widest mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full bg-transparent border-b border-white/10 py-2 font-inter text-lg text-white/50 cursor-not-allowed"
              />
              <p className="text-xs text-white/30 mt-2 font-inter">Email address cannot be changed currently.</p>
            </div>
          </div>

          {/* Submit */}
          <div className="settings-item flex items-center justify-between pt-6">
            <div className="text-green-400 font-inter text-sm h-6">
              {successMsg}
            </div>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
