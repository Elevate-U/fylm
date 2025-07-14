import { h } from 'preact';
import { useState, useRef, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { useAuth } from '../context/Auth';
import { supabase } from '../supabase';
import toast from '../components/Toast';
import './Profile.css';
import { getProxiedImageUrl } from '../config';

// Move this function above Profile so it's defined before use
const getAvatarUrl = (profile, user) => {
  if (profile?.avatar_url) return getProxiedImageUrl(profile.avatar_url);
  if (user?.user_metadata?.picture) return getProxiedImageUrl(user.user_metadata.picture);
  if (user?.user_metadata?.avatar_url) return getProxiedImageUrl(user.user_metadata.avatar_url);
  return '/assets/default-avatar.png';
};

const Profile = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(getAvatarUrl(profile, user));
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const fileInputRef = useRef();

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setAvatarUrl(getAvatarUrl(profile, user));
      setInitializing(false);
    } else if (user) {
      setFullName(user.user_metadata?.full_name || '');
      setAvatarUrl(getAvatarUrl(null, user));
      setInitializing(false);
    }
  }, [profile, user]);

  if (!user) {
    return <div className="profile-container"><div className="profile-form"><h2>Not logged in</h2></div></div>;
  }
  if (initializing) {
    return <div className="profile-container"><div className="profile-form"><h2>Loading profile...</h2></div></div>;
  }

  const handleNameChange = (e) => setFullName(e.target.value);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Avatar must be less than 50MB.');
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarUrl(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let newAvatarUrl = null;

      // 1. If a new avatar is selected, upload it first.
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `avatars/${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, {
            upsert: true,
            cacheControl: '3600',
          });

        if (uploadError) throw uploadError;

        // Get the public URL of the uploaded file.
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        newAvatarUrl = urlData.publicUrl;
      }

      // 2. Prepare the data for the user update.
      // We only include fields that are being changed.
      const userUpdateData = {
        data: {
          full_name: fullName,
          // Only update avatar_url if a new one was uploaded
          ...(newAvatarUrl && { avatar_url: newAvatarUrl }),
        },
      };

      // 3. Update the user's auth metadata.
      // A trigger in Supabase should handle syncing this to the 'profiles' table.
      const { data: { user: updatedUser }, error: userError } = await supabase.auth.updateUser(userUpdateData);

      if (userError) throw userError;

      // 4. Refresh local profile state to reflect changes immediately.
      await refreshProfile();

      toast.success('Profile updated successfully!');
      
      // No longer redirecting, user can see the successful change and then navigate.

    } catch (err) {
      console.error("Profile update failed:", err);
      toast.error(err.message || 'An error occurred while updating your profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-form" style={{ maxWidth: 420 }}>
        <form onSubmit={handleSave}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
              <label htmlFor="avatar-upload" style={{ cursor: 'pointer' }}>
                <img
                  src={avatarUrl}
                  alt="Profile avatar"
                  style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', marginBottom: 8, border: '2px solid var(--brand-primary)' }}
                />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                  onChange={handleAvatarChange}
                  aria-label="Change profile picture"
                />
                <div style={{ color: 'var(--brand-primary)', fontSize: 14, textAlign: 'center' }}>Change Avatar</div>
              </label>
            </div>
            <div className="input-group">
              <label htmlFor="full-name">Full Name</label>
              <input
                id="full-name"
                className="input-field"
                type="text"
                value={fullName}
                onInput={handleNameChange}
                placeholder="Your name"
                maxLength={40}
                required
              />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input
                className="input-field"
                type="email"
                value={user.email}
                disabled
                readOnly
              />
            </div>
            <button className="button" type="submit" disabled={loading} style={{ marginTop: 16 }}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
  );
};

export default Profile;