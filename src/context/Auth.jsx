import { createContext } from 'preact';
import { useContext, useState, useEffect, useCallback } from 'preact/hooks';
import { supabase } from '../supabase';
import { BlogAPI } from '../utils/blogApi';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState(null);

  const fetchProfile = useCallback(async (user) => {
    if (!user) {
      setProfile(null);
      // Clear admin cache when no user
      BlogAPI.clearAdminCache();
      return;
    }
    try {
      console.log('Auth: Fetching profile for user:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create one
          console.log('Auth: Profile not found, creating new profile');
          const newProfile = {
            id: user.id,
            full_name: user.user_metadata?.full_name || '',
            avatar_url: user.user_metadata?.avatar_url || '',
            updated_at: new Date().toISOString()
          };

          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert([newProfile])
            .select()
            .single();

          if (createError) {
            console.error('Auth: Error creating profile:', createError);
            throw createError;
          }

          setProfile(createdProfile);
          // Clear admin cache when profile changes
          BlogAPI.clearAdminCache();
        } else {
          console.error('Auth: Error fetching profile:', error);
          throw error;
        }
      } else {
        console.log('Auth: Profile fetched successfully:', data);
        setProfile(data);
        // Clear admin cache when profile changes to ensure fresh admin check
        BlogAPI.clearAdminCache();
      }
    } catch (error) {
      console.error('Auth: Error in fetchProfile:', error);
      setProfile(null);
      BlogAPI.clearAdminCache();
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      try {
        console.log('Auth: Refreshing profile for user:', user.id);
        BlogAPI.clearAdminCache();
        await supabase.auth.refreshSession();
        await fetchProfile(user);
      } catch (error) {
        console.error('Failed to refresh session:', error);
      }
    }
  }, [user, fetchProfile]);

  const forceRefreshAuth = useCallback(async () => {
    console.log('Auth: Force refreshing authentication state');
    setLoading(true);
    BlogAPI.clearAdminCache();
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
        BlogAPI.clearAdminCache();
      }
      setAuthError(null);
    } catch (error) {
      console.error('Auth: Error in forceRefreshAuth:', error);
      setAuthError(error.message);
    } finally {
      setLoading(false);
    }
  }, []); // Remove fetchProfile from dependencies to prevent infinite loops

  // Centralized helper to handle 401/refresh issues across devices
  const handleAuthFailure = useCallback(async (reason) => {
    try {
      console.warn('Auth: Handling auth failure, reason:', reason);
      // Attempt a lightweight refresh; if it fails, force sign-out
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.warn('Auth: refreshSession failed, performing signOut()', refreshError);
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error('Auth: Error during handleAuthFailure:', e);
    } finally {
      // Clear local state so UI can prompt login
      setSession(null);
      setUser(null);
      setProfile(null);
      BlogAPI.clearAdminCache();
      setAuthReady(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    console.log('Auth: useEffect initiated.');

    const getSessionAndProfile = async () => {
      if (!isMounted) return;
      console.log('Auth: Starting session and profile check...');
      
      try {
        console.log('Auth: Calling supabase.auth.getSession()...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('Auth: supabase.auth.getSession() completed.');

        if (sessionError) {
          console.error('Auth: getSession() returned an error:', sessionError);
          throw sessionError;
        }

        if (isMounted) {
          console.log('Auth: Session received:', session ? `Exists (user: ${session.user.id})` : 'Null');
          setSession(session);
          const currentUser = session?.user ?? null;
          setUser(currentUser);

          if (currentUser) {
            console.log('Auth: Fetching profile for user:', currentUser.id);
            await fetchProfile(currentUser);
            console.log('Auth: Profile fetch completed.');
          } else {
            console.log('Auth: No user in session, clearing state');
            setProfile(null);
            BlogAPI.clearAdminCache();
          }
          setAuthError(null);
        }
      } catch (error) {
        console.error('Auth: Error in getSessionAndProfile:', error);
        if (isMounted) {
          setAuthError(error.message);
          // Clear user state on error
          setSession(null);
          setUser(null);
          setProfile(null);
          BlogAPI.clearAdminCache();
        }
      } finally {
        if (isMounted) {
          console.log('Auth: Finalizing auth check, setting authReady to true.');
          setLoading(false);
          setAuthReady(true);
        }
      }
    };

    getSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('Auth: onAuthStateChange event received:', _event);
        
        if (!isMounted) return;
        
        try {
          if (_event === 'SIGNED_OUT') {
            console.log('Auth: User signed out, clearing state');
            setSession(null);
            setUser(null);
            setProfile(null);
            BlogAPI.clearAdminCache();
            setAuthError(null);
            setLoading(false);
            setAuthReady(true);
            console.log('Auth: State cleared after sign out');
            return;
          }

          if (_event === 'USER_UPDATED') {
            console.log('Auth: User updated');
            if (session?.user) {
              setUser(session.user);
              setSession(session);
              await fetchProfile(session.user);
            } else {
              setUser(null);
              setProfile(null);
              setSession(null);
              BlogAPI.clearAdminCache();
            }
            return;
          }

          if (_event === 'SIGNED_IN') {
            console.log('Auth: User signed in');
            setSession(session);
            if (session?.user) {
              setUser(session.user);
              // Only fetch profile if we don't already have one for this user
              if (!profile || profile.id !== session.user.id) {
                await fetchProfile(session.user);
              }
              setAuthError(null);
              setLoading(false);
              setAuthReady(true);
            } else {
              console.warn('Auth: SIGNED_IN event but no user in session');
              setUser(null);
              setProfile(null);
              BlogAPI.clearAdminCache();
            }
          }

          if (_event === 'TOKEN_REFRESHED') {
            console.log('Auth: Token refreshed');
            setSession(session);
            if (session?.user) {
              // Don't refetch profile on token refresh unless user changed
              if (!user || user.id !== session.user.id) {
                setUser(session.user);
                await fetchProfile(session.user);
              } else {
                setUser(session.user);
              }
            } else {
              setUser(null);
              setProfile(null);
              BlogAPI.clearAdminCache();
            }
          }

          if (_event === 'TOKEN_REFRESH_FAILED') {
            console.warn('Auth: Token refresh failed');
            await handleAuthFailure('TOKEN_REFRESH_FAILED');
          }
        } catch (error) {
          console.error('Auth: Error in onAuthStateChange:', error);
          setAuthError(error.message);
        }
      }
    );

    return () => {
      console.log('Auth: Unsubscribing from auth changes.');
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
      isMounted = false;
    };
  }, []); // Remove fetchProfile from dependencies to prevent infinite loops

  const updateUser = async (updates) => {
    try {
      // 1. Update auth user metadata
      const { data: authData, error: authError } = await supabase.auth.updateUser(updates);
      if (authError) throw authError;

      const user = authData.user;
      if (!user) {
        // This case should ideally not be reached if authError is handled
        return { data: null, error: new Error("User update failed.") };
      }
      
      const profileUpdate = {};
      if (updates.data.full_name) {
        profileUpdate.full_name = updates.data.full_name;
      }
      if (updates.data.avatar_url) {
        profileUpdate.avatar_url = updates.data.avatar_url;
      }

      // 2. Update the public profile table.
      if (Object.keys(profileUpdate).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('id', user.id);

        if (profileError) {
          // Log the profile error but don't block the user update from succeeding
          console.error('Error updating profile table:', profileError);
        }
      }
      
      // 3. Update local state with fresh data for immediate UI consistency.
      // This avoids race conditions with backend triggers.
      setUser(user);
      const { data: newProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error re-fetching profile after update:', fetchError);
      } else {
        setProfile(newProfile);
      }

      return { data: authData, error: null };
    } catch (error) {
      console.error('Error updating user:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      console.log('Auth: Starting signOut process');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Auth: Error during sign out:', error);
        // Even if there's an error, clear local state
        setSession(null);
        setUser(null);
        setProfile(null);
        BlogAPI.clearAdminCache();
        setLoading(false);
        setAuthReady(true);
        throw error;
      }
      console.log('Auth: Supabase signOut successful');
      // Note: State will be cleared by the onAuthStateChange listener
      // But we can also clear it here for immediate feedback
      BlogAPI.clearAdminCache();
      console.log('Auth: Admin cache cleared');
    } catch (err) {
      console.error('Auth: Unexpected error during sign out:', err);
      // Clear state even on error to ensure user is logged out locally
      setSession(null);
      setUser(null);
      setProfile(null);
      BlogAPI.clearAdminCache();
      setLoading(false);
      setAuthReady(true);
      throw err;
    }
  };

  const value = {
     user,
     session,
     profile,
     refreshProfile,
     forceRefreshAuth,
     updateUser, 
     signOut,
     loading,
     authReady,
     authError,
     // Debug helpers
     isAuthenticated: !!user,
     hasProfile: !!profile,
     userId: user?.id || null,
     userRole: profile?.role || null
   };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}