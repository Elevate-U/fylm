# Deployment Checklist

## Pre-Deployment Checks

### 1. Environment Variables
- [ ] **TMDB_API_KEY** (Required for production)
  - Go to Vercel Dashboard → Project Settings → Environment Variables
  - Add: `TMDB_API_KEY` = `your_api_key_here`
  - **Current fallback**: The app will use the hardcoded key from config.js if not set
  - **Recommendation**: Set this for better security and API quota management

### 2. API Key Verification
- [ ] Test TMDB API key: 
  ```bash
  curl "https://api.themoviedb.org/3/movie/popular?api_key=YOUR_API_KEY"
  ```

### 3. Build and Deploy
- [ ] Run local build test: `npm run build`
- [ ] Deploy to Vercel: `vercel --prod`
- [ ] Test production endpoints

### 4. Post-Deployment Testing
- [ ] Test API endpoints:
  - `/api/tmdb/test` (should return success)
  - `/api/tmdb/movie/popular`
  - `/api/tmdb/trending/all/week`

### 5. Security
- [ ] Verify CORS headers are properly set
- [ ] Check that API responses don't expose sensitive data
- [ ] Monitor API usage and rate limits

## Common Issues and Solutions

### NetworkError when fetching TMDB data
- **Cause**: Missing or invalid TMDB_API_KEY environment variable
- **Fix**: Set TMDB_API_KEY in Vercel dashboard or use fallback
- **Test**: Visit `/api/tmdb/test` to verify API is working

### Rate Limiting
- **Cause**: Too many requests to TMDB API
- **Fix**: Implement request throttling or upgrade TMDB plan
- **Monitor**: Check API usage in TMDB dashboard

### CORS Issues
- **Cause**: Browser blocking cross-origin requests
- **Fix**: Verify CORS headers in API responses
- **Check**: Network tab in browser dev tools

## Quick Fix for Current Issue

The current NetworkError is fixed by:
1. Added fallback API key mechanism
2. Updated error handling and logging
3. Environment variable configuration guide

The app will now work immediately while allowing proper environment variable setup for production. 