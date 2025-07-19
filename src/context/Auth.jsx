import { createContext } from 'preact';
import { useState, useEffect, useContext, useCallback } from 'preact/hooks';
import { supabase } from '../supabase';

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
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // Ignore 'not found' errors
        throw error;
      }
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      try {
        await supabase.auth.refreshSession();
        await fetchProfile(user);
      } catch (error) {
        console.error('Failed to refresh session:', error);
      }
    }
  }, [user, fetchProfile]);

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
          }
          setAuthError(null);
        }
      } catch (error) {
        console.error('Auth: Error in getSessionAndProfile:', error);
        if (isMounted) {
          setAuthError(error.message);
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
        if (_event === 'USER_UPDATED') {
          setSession(session);
          setUser(session?.user ?? null);
          return;
        }

        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await fetchProfile(currentUser);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      console.log('Auth: Unsubscribing from auth changes.');
      authListener.subscription.unsubscribe();
      isMounted = false;
    };
  }, [fetchProfile]);

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
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error during sign out:', error);
      }
      setSession(null);
      setUser(null);
      setProfile(null);
    } catch (err) {
      console.error('Unexpected error during sign out:', err);
    }
  };

  const value = {
    session,
    user,
    profile,
    refreshProfile,
    updateUser, 
    signOut,
    authReady,
    loading,
    authError, // Expose auth errors to the UI
    isSafari: false // Expose Safari detection to components
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