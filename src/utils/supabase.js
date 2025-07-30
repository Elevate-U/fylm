import { createClient } from '@supabase/supabase-js';

// Enhanced storage implementation for better cross-browser compatibility
const customStorage = {
    getItem: (key) => {
        try {
            // Try localStorage first
            if (typeof window !== 'undefined' && window.localStorage) {
                return window.localStorage.getItem(key);
            }
            // Fallback to sessionStorage
            if (typeof window !== 'undefined' && window.sessionStorage) {
                return window.sessionStorage.getItem(key);
            }
            return null;
        } catch (error) {
            console.warn('Storage getItem failed:', error);
            return null;
        }
    },
    setItem: (key, value) => {
        try {
            // Try localStorage first
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem(key, value);
                return;
            }
            // Fallback to sessionStorage
            if (typeof window !== 'undefined' && window.sessionStorage) {
                window.sessionStorage.setItem(key, value);
                return;
            }
        } catch (error) {
            console.warn('Storage setItem failed:', error);
        }
    },
    removeItem: (key) => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem(key);
            }
            if (typeof window !== 'undefined' && window.sessionStorage) {
                window.sessionStorage.removeItem(key);
            }
        } catch (error) {
            console.warn('Storage removeItem failed:', error);
        }
    }
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Present' : 'MISSING');
console.log('Anon Key:', supabaseAnonKey ? 'Present' : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase URL or Anon Key is missing. Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file or Vercel environment variables.');
    console.error('Current env vars:', {
        VITE_SUPABASE_URL: !!supabaseUrl,
        VITE_SUPABASE_ANON_KEY: !!supabaseAnonKey
    });
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: customStorage, // Use our custom storage implementation
        // Reduce aggressive session refresh that can cause network errors
        autoRefreshToken: true,
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
        // Add request timeout with better error handling
        fetch: async (url, options = {}) => {
            const MAX_RETRIES = 3;
            const INITIAL_DELAY_MS = 1000;
            let retries = 0;

            // Safari detection
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            if (isSafari) {
                console.log('Safari browser detected, applying specific handling');
            }

            while (retries < MAX_RETRIES) {
                try {
                    const controller = new AbortController();
                    // Safari sometimes has issues with long-running requests
                    const timeout = isSafari ? 10000 : 15000; // 10-second timeout for Safari
                    const timeoutId = setTimeout(() => controller.abort(), timeout);

                    const response = await fetch(url, {
                        ...options,
                        signal: controller.signal,
                        // Safari has stricter CORS requirements
                        credentials: 'same-origin',
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok && (response.status >= 500 || response.status === 429)) {
                        // Retry on server errors or rate limiting
                        throw new Error(`Server error: ${response.status}`);
                    }

                    return response; // Success

                } catch (error) {
                    // Special handling for Safari CORS errors
                    if (isSafari && error.message && error.message.includes('NetworkError')) {
                        console.warn('Safari CORS error detected:', error);
                        // Try to detect if this is a CORS error
                        if (retries === 0) {
                            console.log('Attempting Safari-specific workaround for CORS issue');
                            // Some Safari CORS workarounds might be added here
                        }
                    }

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
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

// Debug logging for development
if (import.meta.env.MODE === 'development') {
    console.log('🔧 Supabase client initialized with enhanced configuration');
    console.log('Environment:', import.meta.env.MODE);
    console.log('URL configured:', !!supabaseUrl);
    console.log('Key configured:', !!supabaseAnonKey);
}

// Test connection on initialization (development only)
if (import.meta.env.MODE === 'development') {
    supabase.auth.getSession().then(({ data, error }) => {
        if (error) {
            console.warn('⚠️ Supabase auth session check failed:', error.message);
        } else {
            console.log('✅ Supabase connection test successful');
            if (data.session) {
                console.log('👤 User session found:', data.session.user?.email);
            } else {
                console.log('👤 No active user session');
            }
        }
    }).catch(err => {
        console.error('🚨 Supabase connection test failed:', err);
    });
}

// Helper function to get the current user
export const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
        console.error('Error getting current user:', error);
        return null;
    }
    return user;
};

// Helper function to check if user is authenticated
export const isAuthenticated = async () => {
    const user = await getCurrentUser();
    return !!user;
};

// Helper function to sign out
export const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error('Error signing out:', error);
        throw error;
    }
};

// Helper function to get storage URL
export const getStorageUrl = (bucket, path) => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
};

// Helper function to upload file to storage
export const uploadFile = async (bucket, path, file, options = {}) => {
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            ...options
        });
    
    if (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
    
    return data;
};

// Helper function to delete file from storage
export const deleteFile = async (bucket, paths) => {
    const { data, error } = await supabase.storage
        .from(bucket)
        .remove(Array.isArray(paths) ? paths : [paths]);
    
    if (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
    
    return data;
};

// Helper function to handle database errors
export const handleDatabaseError = (error, operation = 'database operation') => {
    console.error(`Error during ${operation}:`, error);
    
    // Common error messages
    const errorMessages = {
        '23505': 'This item already exists.',
        '23503': 'Cannot delete this item because it is referenced by other data.',
        '42501': 'You do not have permission to perform this action.',
        'PGRST116': 'The requested item was not found.',
        'PGRST301': 'Row Level Security policy violation.'
    };
    
    const errorCode = error.code || error.error_description || error.message;
    const userMessage = errorMessages[errorCode] || `An error occurred during ${operation}. Please try again.`;
    
    return {
        error: true,
        message: userMessage,
        details: error
    };
};

// Helper function for paginated queries
export const paginatedQuery = async (query, page = 1, limit = 10) => {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    const { data, error, count } = await query
        .range(from, to)
        .select('*', { count: 'exact' });
    
    if (error) {
        throw error;
    }
    
    const totalPages = Math.ceil(count / limit);
    
    return {
        data,
        pagination: {
            page,
            limit,
            total: count,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        }
    };
};

// Helper function to generate unique filename
export const generateUniqueFilename = (originalName, prefix = '') => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    
    return `${prefix}${prefix ? '_' : ''}${nameWithoutExt}_${timestamp}_${random}.${extension}`;
};

// Helper function to validate file type
export const validateFileType = (file, allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) => {
    if (!file || !file.type) {
        return { valid: false, error: 'Invalid file' };
    }
    
    if (!allowedTypes.includes(file.type)) {
        return { 
            valid: false, 
            error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}` 
        };
    }
    
    return { valid: true };
};

// Helper function to validate file size
export const validateFileSize = (file, maxSizeInMB = 5) => {
    if (!file || !file.size) {
        return { valid: false, error: 'Invalid file' };
    }
    
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    
    if (file.size > maxSizeInBytes) {
        return { 
            valid: false, 
            error: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${maxSizeInMB}MB` 
        };
    }
    
    return { valid: true };
};

export default supabase;