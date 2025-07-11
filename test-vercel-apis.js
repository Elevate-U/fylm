// Test script for Vercel API endpoints
// Run with: node test-vercel-apis.js

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5174';

const testEndpoints = [
  {
    name: 'TMDB Trending',
    url: `${baseUrl}/api/tmdb/trending/all/week`,
    description: 'Test TMDB trending content'
  },
  {
    name: 'TMDB Movie Popular',
    url: `${baseUrl}/api/tmdb/movie/popular`,
    description: 'Test TMDB popular movies'
  },
  {
    name: 'Stream URL',
    url: `${baseUrl}/api/stream-url?type=movie&id=550&source=videasy`,
    description: 'Test stream URL generation'
  },
  {
    name: 'Image Proxy',
    url: `${baseUrl}/api/image-proxy?url=${encodeURIComponent('https://image.tmdb.org/t/p/w500/test.jpg')}`,
    description: 'Test image proxy'
  }
];

async function testEndpoint(endpoint) {
  try {
    console.log(`\n🧪 Testing: ${endpoint.name}`);
    console.log(`📍 URL: ${endpoint.url}`);
    
    const response = await fetch(endpoint.url);
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log(`✅ ${endpoint.name} - SUCCESS`);
      
      // Try to parse JSON if possible
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log(`📦 Response preview:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
      }
    } else {
      console.log(`❌ ${endpoint.name} - FAILED`);
      const errorText = await response.text();
      console.log(`🚨 Error:`, errorText.substring(0, 200));
    }
  } catch (error) {
    console.log(`💥 ${endpoint.name} - ERROR`);
    console.log(`🚨 Error:`, error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting API endpoint tests...');
  console.log(`🌍 Base URL: ${baseUrl}`);
  console.log('=' .repeat(50));
  
  for (const endpoint of testEndpoints) {
    await testEndpoint(endpoint);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('🏁 Tests completed!');
  console.log('\n💡 To test production:');
  console.log('TEST_BASE_URL=https://your-app.vercel.app node test-vercel-apis.js');
}

runTests().catch(console.error); 