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
  
  // Token refresh control to prevent CORS error loops
  const refreshStateRef = useState({
    isRefreshing: false,
    lastRefreshAttempt: 0,
    failedAttempts: 0,
    backoffDelay: 1000 // Start with 1 second
  })[0];

  const fetchProfile = useCallback(async (user, timeoutMs = 25000) => { // Increased timeout for better reliability
    if (!user) {
      setProfile(null);
      // Clear admin cache when no user
      BlogAPI.clearAdminCache();
      return;
    }
    
    try {
      console.log('Auth: Fetching profile for user:', user.id);
      
      // Create timeout promise with longer timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout - please check your connection')), timeoutMs);
      });
      
      // Race between fetch and timeout
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      let result;
      try {
        result = await Promise.race([fetchPromise, timeoutPromise]);
      } catch (raceError) {
        // If timeout or network error, try one more time without race condition
        if (raceError.message.includes('timeout') || raceError.message.includes('fetch')) {
          console.warn('Auth: First profile fetch failed, retrying without timeout...');
          result = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        } else {
          throw raceError;
        }
      }
      
      const { data, error } = result;
      
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

          const createPromise = supabase
            .from('profiles')
            .insert([newProfile])
            .select()
            .single();
          
          const createTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Profile creation timeout - please check your connection')), timeoutMs);
          });

          let createResult;
          try {
            createResult = await Promise.race([createPromise, createTimeoutPromise]);
          } catch (createRaceError) {
            // Retry without timeout
            if (createRaceError.message.includes('timeout')) {
              console.warn('Auth: Profile creation timed out, retrying...');
              createResult = await supabase
                .from('profiles')
                .insert([newProfile])
                .select()
                .single();
            } else {
              throw createRaceError;
            }
          }

          const { data: createdProfile, error: createError } = createResult;

          if (createError) {
            console.error('Auth: Error creating profile:', createError);
            // Don't throw - set basic profile from user metadata
            setProfile({
              id: user.id,
              full_name: user.user_metadata?.full_name || '',
              avatar_url: user.user_metadata?.avatar_url || ''
            });
            BlogAPI.clearAdminCache();
            return;
          }

          setProfile(createdProfile);
          BlogAPI.clearAdminCache();
        } else {
          console.error('Auth: Error fetching profile:', error);
          // Set basic profile from user metadata instead of throwing
          setProfile({
            id: user.id,
            full_name: user.user_metadata?.full_name || '',
            avatar_url: user.user_metadata?.avatar_url || ''
          });
          BlogAPI.clearAdminCache();
        }
      } else {
        console.log('Auth: Profile fetched successfully:', data);
        setProfile(data);
        BlogAPI.clearAdminCache();
      }
    } catch (error) {
      console.error('Auth: Error in fetchProfile:', error);
      // Set basic profile from user metadata but don't throw - allow app to continue
      setProfile({
        id: user.id,
        full_name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url || ''
      });
      BlogAPI.clearAdminCache();
    }
  }, []);

  // Controlled token refresh with exponential backoff
  const controlledRefreshSession = useCallback(async () => {
    const now = Date.now();
    
    // Prevent concurrent refresh attempts
    if (refreshStateRef.isRefreshing) {
      console.log('Auth: Refresh already in progress, skipping');
      return { success: false, reason: 'already_refreshing' };
    }
    
    // Check if we should back off due to previous failures
    const timeSinceLastAttempt = now - refreshStateRef.lastRefreshAttempt;
    if (timeSinceLastAttempt < refreshStateRef.backoffDelay) {
      console.log(`Auth: Backing off, waiting ${refreshStateRef.backoffDelay - timeSinceLastAttempt}ms`);
      return { success: false, reason: 'backoff' };
    }
    
    // Maximum backoff reached - clear session to force re-login
    if (refreshStateRef.failedAttempts >= 5) {
      console.warn('Auth: Too many refresh failures, clearing session');
      await supabase.auth.signOut();
      return { success: false, reason: 'max_attempts' };
    }
    
    refreshStateRef.isRefreshing = true;
    refreshStateRef.lastRefreshAttempt = now;
    
    try {
      console.log('Auth: Attempting controlled token refresh');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        // Check if it's a CORS or network error
        if (error.message.includes('CORS') || error.message.includes('NetworkError') || error.message.includes('fetch')) {
          console.error('Auth: CORS/Network error during refresh, will retry with backoff');
          refreshStateRef.failedAttempts++;
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          refreshStateRef.backoffDelay = Math.min(refreshStateRef.backoffDelay * 2, 16000);
          return { success: false, reason: 'network_error', error };
        }
        
        // If it's an auth error (invalid token), sign out
        console.error('Auth: Token refresh failed with auth error:', error);
        await supabase.auth.signOut();
        return { success: false, reason: 'auth_error', error };
      }
      
      // Success - reset failure tracking
      console.log('Auth: Token refresh successful');
      refreshStateRef.failedAttempts = 0;
      refreshStateRef.backoffDelay = 1000;
      
      return { success: true, session: data.session };
    } catch (error) {
      console.error('Auth: Unexpected error during token refresh:', error);
      refreshStateRef.failedAttempts++;
      refreshStateRef.backoffDelay = Math.min(refreshStateRef.backoffDelay * 2, 16000);
      return { success: false, reason: 'unexpected_error', error };
    } finally {
      refreshStateRef.isRefreshing = false;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      try {
        console.log('Auth: Refreshing profile for user:', user.id);
        BlogAPI.clearAdminCache();
        const result = await controlledRefreshSession();
        if (result.success) {
          await fetchProfile(user);
        }
      } catch (error) {
        console.error('Failed to refresh session:', error);
      }
    }
  }, [user, fetchProfile, controlledRefreshSession]);

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
      
      // Use controlled refresh to prevent CORS error loops
      const result = await controlledRefreshSession();
      
      if (!result.success) {
        console.warn('Auth: Controlled refresh failed, performing signOut()', result.reason);
        // Only attempt signOut if it's not already a network error
        // (to avoid more CORS errors)
        if (result.reason !== 'network_error') {
          await supabase.auth.signOut();
        } else {
          // For network errors, just clear local state
          console.log('Auth: Clearing local state due to network error');
        }
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
  }, [controlledRefreshSession]);

  useEffect(() => {
    let isMounted = true;
    let loadingTimeout;
    console.log('Auth: useEffect initiated.');

    const getSessionAndProfile = async () => {
      if (!isMounted) return;
      console.log('Auth: Starting session and profile check...');
      
      // Check if Supabase credentials are available before attempting auth
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('❌ Supabase credentials missing - cannot authenticate');
        setAuthError('Configuration error. Please contact support.');
        setLoading(false);
        setAuthReady(true);
        return;
      }
      
      // Reduced timeout for mobile - force complete loading after 20 seconds (was 45)
      // Most mobile connections should complete within 10-15 seconds
      loadingTimeout = setTimeout(() => {
        if (isMounted && loading) {
          console.warn('⚠️ Auth loading timeout reached - forcing completion');
          setLoading(false);
          setAuthReady(true);
          if (!session && !user) {
            setAuthError('Connection is taking too long. Please check your network and refresh the page.');
          }
        }
      }, 20000); // Reduced from 45 seconds to 20 seconds
      
      try {
        console.log('Auth: Calling supabase.auth.getSession()...');
        
        // Reduced timeout for getSession - mobile networks need faster feedback
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Session fetch timeout - please check your connection')), 15000); // Reduced from 30s to 15s
        });
        
        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]);
        
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
          // Provide user-friendly error message
          const errorMsg = error.message.includes('timeout') 
            ? 'Connection timeout. Please check your network and try again.'
            : error.message.includes('fetch')
            ? 'Unable to connect. Please check your internet connection.'
            : 'Authentication error. Please try again.';
          setAuthError(errorMsg);
          // Clear user state on error but allow app to continue
          setSession(null);
          setUser(null);
          setProfile(null);
          BlogAPI.clearAdminCache();
        }
      } finally {
        if (isMounted) {
          clearTimeout(loadingTimeout);
          console.log('Auth: Finalizing auth check, setting authReady to true.');
          setLoading(false);
          setAuthReady(true);
        }
      }
    };

    getSessionAndProfile();
    
    // Periodic token refresh check (manual replacement for autoRefreshToken)
    // Check every 5 minutes if session needs refresh
    const tokenCheckInterval = setInterval(async () => {
      if (!isMounted || !session) return;
      
      try {
        // Check if token is close to expiring (within 10 minutes)
        const expiresAt = session.expires_at;
        if (expiresAt) {
          const now = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = expiresAt - now;
          
          // Refresh if less than 10 minutes until expiry
          if (timeUntilExpiry < 600) {
            console.log('Auth: Token expiring soon, attempting refresh');
            const result = await controlledRefreshSession();
            if (result.success && result.session) {
              setSession(result.session);
              setUser(result.session.user);
            }
          }
        }
      } catch (error) {
        console.error('Auth: Error in token check interval:', error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

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
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
      }
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
      isMounted = false;
    };
  }, []); // Remove fetchProfile from dependencies to prevent infinite loops

  const updateUser = async (updates) => {
    try {
      console.log('Auth: Starting user update (fire and forget mode)');
      
      // Update profile state immediately with optimistic update
      const userId = user?.id || updates.id;
      const profileUpdate = {};
      
      if (updates.data.full_name) {
        profileUpdate.full_name = updates.data.full_name;
      }
      if (updates.data.avatar_url) {
        profileUpdate.avatar_url = updates.data.avatar_url;
      }

      // Immediately update local state for instant UI feedback
      if (user) {
        setUser({
          ...user,
          user_metadata: {
            ...user.user_metadata,
            ...updates.data
          }
        });
      }
      
      setProfile({
        ...profile,
        id: userId,
        ...profileUpdate
      });
      
      console.log('Auth: Local state updated immediately');

      // Fire off server updates in background without blocking
      // 1. Update auth user metadata (no waiting)
      supabase.auth.updateUser(updates)
        .then(({ data: authData, error: authError }) => {
          if (authError) {
            console.error('Auth: Background auth update error:', authError);
          } else {
            console.log('Auth: Background auth update succeeded');
            if (authData?.user) {
              setUser(authData.user);
            }
          }
        })
        .catch(err => {
          console.error('Auth: Background auth update failed:', err);
        });

      // 2. Update the public profile table (no waiting)
      if (Object.keys(profileUpdate).length > 0) {
        supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('id', userId)
          .then(({ error: profileError }) => {
            if (profileError) {
              console.error('Auth: Background profile update error:', profileError);
            } else {
              console.log('Auth: Background profile update succeeded');
              // Refetch to get any server-side computed fields
              supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()
                .then(({ data: newProfile }) => {
                  if (newProfile) {
                    setProfile(newProfile);
                    console.log('Auth: Background profile refetch completed');
                  }
                })
                .catch(err => {
                  console.warn('Auth: Background profile refetch failed:', err);
                });
            }
          })
          .catch(err => {
            console.error('Auth: Background profile update failed:', err);
          });
      }

      console.log('Auth: User update completed (optimistic)');
      return { data: { user }, error: null };
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