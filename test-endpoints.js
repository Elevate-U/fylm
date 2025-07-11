#!/usr/bin/env node

// Test script to verify API endpoints work in both local and production environments
import fetch from 'node-fetch';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';

async function testEndpoint(endpoint, description) {
    try {
        console.log(`\n🧪 Testing: ${description}`);
        console.log(`📍 URL: ${BASE_URL}${endpoint}`);
        
        const response = await fetch(`${BASE_URL}${endpoint}`, {
            headers: {
                'Accept': 'application/json',
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ SUCCESS: ${response.status} - Data received (${Object.keys(data).length} properties)`);
        } else {
            console.log(`❌ FAILED: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.log(`💥 ERROR: ${error.message}`);
    }
}

async function testImageProxy(imageUrl, description) {
    try {
        console.log(`\n🖼️  Testing: ${description}`);
        const proxyUrl = `${BASE_URL}/image-proxy?url=${encodeURIComponent(imageUrl)}`;
        console.log(`📍 URL: ${proxyUrl}`);
        
        const response = await fetch(proxyUrl);
        
        if (response.ok) {
            const contentType = response.headers.get('content-type');
            console.log(`✅ SUCCESS: ${response.status} - Content-Type: ${contentType}`);
        } else {
            console.log(`❌ FAILED: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.log(`💥 ERROR: ${error.message}`);
    }
}

async function runTests() {
    console.log('🚀 Testing API Endpoints for Both Local & Production');
    console.log(`🌐 Base URL: ${BASE_URL}`);
    console.log('=' .repeat(60));

    // Test TMDB API endpoints
    await testEndpoint('/api/tmdb/movie/550', 'TMDB Movie Details (Fight Club)');
    await testEndpoint('/api/tmdb/tv/1399', 'TMDB TV Show Details (Game of Thrones)');
    await testEndpoint('/api/tmdb/trending/all/week', 'TMDB Trending Content');
    await testEndpoint('/api/tmdb/movie/popular', 'TMDB Popular Movies');
    
    // Test image proxy
    await testImageProxy('https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg', 'TMDB Image Proxy');
    await testImageProxy('https://via.placeholder.com/500x750/1a1a1a/ffffff?text=No+Image', 'Placeholder Image Proxy');
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 Testing Complete!');
    
    if (BASE_URL.includes('localhost')) {
        console.log('\n💡 To test production deployment:');
        console.log('   TEST_BASE_URL=https://your-vercel-domain.vercel.app node test-endpoints.js');
    }
}

runTests().catch(console.error); 