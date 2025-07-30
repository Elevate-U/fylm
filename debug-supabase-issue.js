// Debug script to identify Supabase connection issues after fullscreen/navigation
// Run this in browser console to diagnose the problem

console.log('🔍 Starting Supabase Connection Diagnostics...');

// Store original methods for comparison
const originalFetch = window.fetch;
const originalSupabaseAuth = window.supabase?.auth;

// Track Supabase requests
let requestCount = 0;
let failedRequests = [];
let successfulRequests = [];

// Override fetch to monitor Supabase requests
window.fetch = async function(...args) {
  const [url, options] = args;
  
  if (url && url.includes('supabase')) {
    requestCount++;
    const requestId = requestCount;
    console.log(`📡 Supabase Request #${requestId}:`, url);
    
    try {
      const response = await originalFetch.apply(this, args);
      
      if (response.ok) {
        successfulRequests.push({ id: requestId, url, status: response.status });
        console.log(`✅ Request #${requestId} succeeded:`, response.status);
      } else {
        failedRequests.push({ id: requestId, url, status: response.status, error: 'HTTP Error' });
        console.error(`❌ Request #${requestId} failed:`, response.status);
      }
      
      return response;
    } catch (error) {
      failedRequests.push({ id: requestId, url, error: error.message });
      console.error(`💥 Request #${requestId} threw error:`, error);
      throw error;
    }
  }
  
  return originalFetch.apply(this, args);
};

// Monitor auth state changes
if (window.supabase?.auth) {
  console.log('🔐 Setting up auth state monitoring...');
  
  window.supabase.auth.onAuthStateChange((event, session) => {
    console.log(`🔄 Auth State Change: ${event}`, {
      hasSession: !!session,
      userId: session?.user?.id,
      expiresAt: session?.expires_at ? new Date(session.expires_at * 1000) : null
    });
  });
}

// Test basic connectivity
async function testConnectivity() {
  console.log('🧪 Testing basic connectivity...');
  
  try {
    const { data, error } = await window.supabase.from('watch_history').select('count').limit(1);
    if (error) {
      console.error('❌ Basic connectivity test failed:', error);
      return false;
    }
    console.log('✅ Basic connectivity test passed');
    return true;
  } catch (error) {
    console.error('💥 Basic connectivity test threw error:', error);
    return false;
  }
}

// Test auth session
async function testAuthSession() {
  console.log('🔑 Testing auth session...');
  
  try {
    const { data: { session }, error } = await window.supabase.auth.getSession();
    if (error) {
      console.error('❌ Auth session test failed:', error);
      return false;
    }
    console.log('✅ Auth session test passed:', {
      hasSession: !!session,
      userId: session?.user?.id,
      expiresAt: session?.expires_at ? new Date(session.expires_at * 1000) : null
    });
    return true;
  } catch (error) {
    console.error('💥 Auth session test threw error:', error);
    return false;
  }
}

// Test RPC call
async function testRPCCall() {
  console.log('⚙️ Testing RPC call...');
  
  try {
    const { data, error } = await window.supabase.rpc('get_watch_history_with_progress');
    if (error) {
      console.error('❌ RPC test failed:', error);
      return false;
    }
    console.log('✅ RPC test passed, returned', data?.length || 0, 'items');
    return true;
  } catch (error) {
    console.error('💥 RPC test threw error:', error);
    return false;
  }
}

// Monitor fullscreen changes
function setupFullscreenMonitoring() {
  console.log('📱 Setting up fullscreen monitoring...');
  
  const handleFullscreenChange = () => {
    const isFullscreen = document.fullscreenElement || 
                        document.webkitFullscreenElement || 
                        document.mozFullScreenElement;
    
    console.log(`📱 Fullscreen changed: ${isFullscreen ? 'ENTERED' : 'EXITED'}`);
    
    // Test connectivity after fullscreen change
    setTimeout(async () => {
      console.log('🧪 Testing connectivity after fullscreen change...');
      await runAllTests();
    }, 1000);
  };
  
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
}

// Run all tests
async function runAllTests() {
  console.log('🏃 Running all diagnostic tests...');
  
  const results = {
    connectivity: await testConnectivity(),
    authSession: await testAuthSession(),
    rpcCall: await testRPCCall()
  };
  
  console.log('📊 Test Results:', results);
  console.log('📈 Request Stats:', {
    total: requestCount,
    successful: successfulRequests.length,
    failed: failedRequests.length
  });
  
  if (failedRequests.length > 0) {
    console.log('❌ Failed Requests:', failedRequests);
  }
  
  return results;
}

// Setup monitoring
setupFullscreenMonitoring();

// Run initial tests
runAllTests();

// Expose functions globally for manual testing
window.debugSupabase = {
  testConnectivity,
  testAuthSession,
  testRPCCall,
  runAllTests,
  getStats: () => ({
    total: requestCount,
    successful: successfulRequests.length,
    failed: failedRequests.length,
    failedRequests
  })
};

console.log('✅ Supabase diagnostics setup complete!');
console.log('💡 Use window.debugSupabase.runAllTests() to run tests manually');
console.log('💡 Use window.debugSupabase.getStats() to see request statistics');