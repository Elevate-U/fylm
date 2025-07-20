import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

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