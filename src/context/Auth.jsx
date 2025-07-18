import { createContext } from 'preact';
import { useState, useEffect, useContext, useCallback } from 'preact/hooks';
import { supabase } from '../supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
      // First, refresh the auth session to get the latest user metadata
      await supabase.auth.refreshSession();
      // Then, fetch the profile from the database
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let isMounted = true;

    const getSessionAndProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          setSession(session);
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          if (currentUser) {
            await fetchProfile(currentUser);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        if (isMounted) setLoading(false);
      }
    };

    getSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // When a user is updated, the updateUser function handles the profile refresh.
        // Re-fetching here can cause a race condition where we get stale data from the db
        // trigger before it's updated.
        if (_event === 'USER_UPDATED') {
          setSession(session);
          setUser(session?.user ?? null);
          // Trust that the calling function has updated the profile state already
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
    updateUser, // Expose the updateUser function
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}