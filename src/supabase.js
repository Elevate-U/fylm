import { createClient } from '@supabase/supabase-js'

// Custom storage implementation with in-memory fallback for Safari compatibility
const memoryStorage = {};
const customStorage = {
  getItem: (key) => {
    try {
      // First, try to get from localStorage
      const item = window.localStorage.getItem(key);
      // If not found in localStorage, check memoryStorage as a fallback
      return item ?? memoryStorage[key] ?? null;
    } catch (error) {
      console.warn(`LocalStorage (getItem) failed: ${error.message}. Falling back to in-memory storage.`);
      return memoryStorage[key] ?? null;
    }
  },
  setItem: (key, value) => {
    try {
      // Try to set in localStorage
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.warn(`LocalStorage (setItem) failed: ${error.message}. Falling back to in-memory storage.`);
    }
    // Always set in memoryStorage as well
    memoryStorage[key] = value;
  },
  removeItem: (key) => {
    try {
      // Try to remove from localStorage
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`LocalStorage (removeItem) failed: ${error.message}. Falling back to in-memory storage.`);
    }
    // Always remove from memoryStorage
    delete memoryStorage[key];
  },
};

// It's recommended to store these in environment variables
// and expose them to your Vite app.
// Create a .env.local file in the root of your project and add:
// VITE_SUPABASE_URL=your_supabase_url
// VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging for production issues
console.log('🔍 Supabase Configuration Check:');
console.log('URL:', supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'MISSING');
console.log('Anon Key:', supabaseAnonKey ? 'Present' : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase URL or Anon Key is missing. Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file or Vercel environment variables.');
    console.error('Current env vars:', {
        VITE_SUPABASE_URL: !!supabaseUrl,
        VITE_SUPABASE_ANON_KEY: !!supabaseAnonKey
    });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: customStorage, // Use our custom storage implementation
        // Disable auto-refresh to prevent CORS error loops - we'll handle manually
        autoRefreshToken: false,
        persistSession: true,
        detectSessionInUrl: true, // Enable to better handle iOS Safari redirects
        // Add timeout settings to prevent hanging requests
        flowType: 'pkce',
        // Debug mode for auth
        debug: import.meta.env.MODE === 'development'
    },
    db: {
        schema: 'public'
    },
    global: {
        headers: {
            //'Content-Type': 'application/json',
            'X-Client-Info': 'supabase-js-web'
        },
        // Enhanced fetch with timeout for mobile networks
      fetch: async (input, init) => {
            const maxRetries = 1;
            let attempt = 0;
            
            // Mobile-friendly timeout (15 seconds for slower connections)
            const MOBILE_TIMEOUT = 15000;
            
            // Do a very light retry once on network errors to reduce false refresh failures
            while (true) {
                try {
                  // Lightweight request logging for Supabase calls to aid debugging
                  try {
                      const urlStr = typeof input === 'string' ? input : (input && input.url) ? input.url : '';
                      if (urlStr && supabaseUrl && urlStr.startsWith(supabaseUrl)) {
                          const method = (init && init.method) ? init.method : (typeof input !== 'string' && input && input.method) ? input.method : 'GET';
                          const shortUrl = urlStr.replace(supabaseUrl, `${supabaseUrl}/`).split('?')[0];
                          const kind = shortUrl.includes('/rest/v1/rpc/') ? 'rpc' : shortUrl.includes('/rest/v1/') ? 'rest' : 'auth';
                          console.log(`🔌 Supabase ${kind.toUpperCase()} → ${method} ${shortUrl}`);
                      }
                  } catch (_) { /* ignore logging errors */ }
                  
                  // Add timeout to fetch for mobile networks
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), MOBILE_TIMEOUT);
                  
                  try {
                      const response = await fetch(input, {
                          ...init,
                          signal: controller.signal
                      });
                      clearTimeout(timeoutId);
                      return response;
                  } catch (fetchError) {
                      clearTimeout(timeoutId);
                      if (fetchError.name === 'AbortError') {
                          console.warn('⚠️ Supabase request timeout after 15s');
                          throw new Error('Request timeout - please check your connection');
                      }
                      throw fetchError;
                  }
                } catch (err) {
                    if (attempt >= maxRetries) throw err;
                    attempt++;
                    // Small delay before retry for mobile networks
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }
    }
});

// Enhanced connection test utility
export const testSupabaseConnection = async () => {
    try {
        console.log('🔄 Testing Supabase connection...');
        
        // Test basic connectivity
        const { data, error } = await supabase.from('watch_history').select('count').limit(1);
        if (error) {
            console.error('❌ Supabase connection test failed:', error);
            return false;
        }
        
        // Test auth endpoint
        const { data: authData, error: authError } = await supabase.auth.getSession();
        if (authError) {
            console.error('❌ Auth endpoint test failed:', authError);
            return false;
        }
        
        console.log('✅ Supabase connection and auth endpoint tests successful');
        return true;
    } catch (error) {
        console.error('❌ Supabase connection test error:', error);
        return false;
    }
};

// Enhanced auth error handler
export const handleAuthError = (error) => {
    console.error('🚨 Authentication error:', error);
    
    // Common error types and suggested fixes
    const errorSolutions = {
        'Invalid API key': 'Check your VITE_SUPABASE_ANON_KEY environment variable',
        'Invalid JWT': 'Your session may have expired. Try logging in again.',
        'User not found': 'This email address is not registered.',
        'Invalid login credentials': 'Check your email and password.',
        'NetworkError': 'Check your internet connection and try again.',
        'CORS error': 'Contact support - there may be a configuration issue.',
        // Safari specific errors
        'blocked by client': 'Safari\'s ITP may be blocking cookies. Try disabling Prevent Cross-Site Tracking in Safari settings.',
        'Storage access': 'Safari requires storage access. Try disabling Prevent Cross-Site Tracking.',
        'Unrecognized': 'This could be related to Safari\'s tracking prevention. Try a different browser or disable Prevent Cross-Site Tracking.'
    };
    
    const errorMessage = error.message || error.error_description || 'Unknown error';
    const solution = Object.keys(errorSolutions).find(key => 
        errorMessage.toLowerCase().includes(key.toLowerCase())
    );
    
    if (solution) {
        console.log('💡 Suggested fix:', errorSolutions[solution]);
    }
    
    return {
        message: errorMessage,
        suggestion: solution ? errorSolutions[solution] : 'Please try again or contact support'
    };
};

// Expose to window for debugging
if (typeof window !== 'undefined') {
    window.supabase = supabase;
    window.testSupabaseConnection = testSupabaseConnection;
    window.handleAuthError = handleAuthError;
    
    // Auto-test connection in development is disabled.
} 