// Debug script to help identify Supabase authentication issues
// Run this in your browser console on the deployed site

console.log('🔍 Debugging Supabase Authentication');

// Check if environment variables are available
console.log('📊 Environment Variables:');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Present' : 'Missing');

// Check if Supabase client is initialized
if (window.supabase) {
    console.log('✅ Supabase client is available');
    
    // Test connection
    console.log('🔄 Testing Supabase connection...');
    window.supabase.from('watch_history').select('count').limit(1)
        .then(({ data, error }) => {
            if (error) {
                console.error('❌ Connection test failed:', error);
            } else {
                console.log('✅ Connection test successful');
            }
        })
        .catch(err => {
            console.error('❌ Connection test error:', err);
        });
    
    // Test authentication endpoint
    console.log('🔑 Testing auth endpoint...');
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
        headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
    })
    .then(response => {
        console.log('🔍 Auth endpoint response status:', response.status);
        if (response.ok) {
            console.log('✅ Auth endpoint is accessible');
        } else {
            console.error('❌ Auth endpoint returned error:', response.status);
        }
    })
    .catch(err => {
        console.error('❌ Auth endpoint test error:', err);
    });
} else {
    console.error('❌ Supabase client is not available');
}

// Test CORS
console.log('🌐 Testing CORS...');
console.log('Current origin:', window.location.origin); 