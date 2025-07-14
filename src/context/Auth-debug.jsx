import { createContext } from 'preact';
import { useState, useEffect, useContext } from 'preact/hooks';
import { supabase } from '../supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🔍 AuthProvider useEffect triggered');
    
    const getSession = async () => {
      try {
        console.log('🔄 Calling supabase.auth.getSession()...');
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Auth timeout after 5 seconds')), 5000);
        });
        
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]);
        
        console.log('✅ getSession completed successfully');
        console.log('📊 Session:', session ? 'Present' : 'None');
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
      } catch (error) {
        console.error('❌ getSession failed:', error);
        setError(error);
        setLoading(false);
      }
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 Auth state change:', event);
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    signOut: () => supabase.auth.signOut(),
    error,
    loading
  };

  // Show error state if auth fails
  if (error) {
    return (
      <div style="padding: 20px; text-align: center;">
        <h2>🚨 Authentication Error</h2>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div style="padding: 20px; text-align: center;">
        <h2>🔄 Loading...</h2>
        <p>Checking authentication...</p>
      </div>
    );
  }

  // Render children when ready
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}