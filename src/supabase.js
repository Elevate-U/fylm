import { createClient } from '@supabase/supabase-js'

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
        // Reduce aggressive session refresh that can cause network errors
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        // Add timeout settings to prevent hanging requests
        storageKey: 'supabase.auth.token',
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
        // Add request timeout with better error handling
        fetch: async (url, options = {}) => {
            const MAX_RETRIES = 3;
            const INITIAL_DELAY_MS = 1000;
            let retries = 0;

            while (retries < MAX_RETRIES) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

                    const response = await fetch(url, {
                        ...options,
                        signal: controller.signal,
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok && (response.status >= 500 || response.status === 429)) {
                        // Retry on server errors or rate limiting
                        throw new Error(`Server error: ${response.status}`);
                    }

                    return response; // Success

                } catch (error) {
                    if (error.name === 'AbortError' || (error.message && error.message.includes('network'))) {
                        retries++;
                        if (retries >= MAX_RETRIES) {
                            console.error(`🚨 Supabase request failed after ${MAX_RETRIES} attempts:`, { url, error });
                            throw error;
                        }
                        const delay = INITIAL_DELAY_MS * Math.pow(2, retries - 1);
                        console.warn(`Supabase request failed. Retrying in ${delay}ms... (Attempt ${retries}/${MAX_RETRIES})`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        // Don't retry on other errors (e.g., client-side errors)
                        console.error('🚨 Supabase request failed with a non-retriable error:', { url, error });
                        throw error;
                    }
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
        'CORS error': 'Contact support - there may be a configuration issue.'
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