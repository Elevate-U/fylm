// Quick health check for the Express server
// Run with: node check-server.js

async function checkServer() {
  console.log('🔍 Checking Express server health...');
  
  try {
    // Test Express server directly
    const response = await fetch('http://localhost:3001/api/tmdb/movie/popular?page=1');
    console.log(`📊 Express Server Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Express server is responding correctly');
      console.log(`📦 Sample response: ${JSON.stringify(data, null, 2).substring(0, 200)}...`);
    } else {
      console.log('❌ Express server returned an error');
      const errorText = await response.text();
      console.log(`🚨 Error: ${errorText}`);
    }
  } catch (error) {
    console.log('💥 Cannot connect to Express server');
    console.log(`🚨 Error: ${error.message}`);
    console.log('\n💡 Make sure:');
    console.log('   1. Express server is running: npm run dev:api');
    console.log('   2. TMDB_API_KEY is set in .env file');
    console.log('   3. Port 3001 is not blocked');
  }
}

checkServer(); 