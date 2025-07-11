import { createClient } from '@supabase/supabase-js'

// It's recommended to store these in environment variables
// and expose them to your Vite app.
// Create a .env.local file in the root of your project and add:
// VITE_SUPABASE_URL=your_supabase_url
// VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase URL or Anon Key is missing. Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // Reduce aggressive session refresh that can cause network errors
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        // Add timeout settings to prevent hanging requests
        storageKey: 'sb-auth-token',
        flowType: 'pkce'
    },
    db: {
        schema: 'public'
    },
    global: {
        headers: {
            'Content-Type': 'application/json'
        },
        // Add request timeout
        fetch: (url, options = {}) => {
            return fetch(url, {
                ...options,
                signal: AbortSignal.timeout(10000) // 10 second timeout
            });
        }
    }
})

// Connection test utility
export const testSupabaseConnection = async () => {
    try {
        console.log('Testing Supabase connection...');
        const { data, error } = await supabase.from('watch_history').select('count').limit(1);
        if (error) {
            console.error('Supabase connection test failed:', error);
            return false;
        }
        console.log('Supabase connection test successful');
        return true;
    } catch (error) {
        console.error('Supabase connection test error:', error);
        return false;
    }
};

// Expose to window for debugging
if (typeof window !== 'undefined') {
    window.supabase = supabase;
    window.testSupabaseConnection = testSupabaseConnection;
} 