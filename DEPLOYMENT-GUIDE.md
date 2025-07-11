
# 🚀 Deployment Guide - Local & Vercel Compatible

This application has been optimized to work seamlessly in both **local development** and **Vercel production** environments.

## ✅ RECENT FIXES (Updated)

### Dependency Conflicts Resolved
- ❌ **Removed**: `react-hot-toast` (React dependency conflicts)
- ❌ **Removed**: `@vidstack/react` (unused, causing conflicts)
- ✅ **Added**: Custom Preact-compatible toast system
- ✅ **Fixed**: All npm install errors and dependency conflicts
- ✅ **Verified**: Both local development and production builds work

### Toast Notification System
- **New Implementation**: `src/components/Toast.jsx` - Fully Preact-compatible
- **Features**: Success, error, warning, and info notifications
- **Styling**: Modern glass-morphism design with animations
- **Auto-dismiss**: Configurable timeout with manual close option

---

## 🛠️ Local Development Setup

### Prerequisites
- Node.js (v18.x recommended) - **Now enforced via `.nvmrc`**
- TMDB API Key (get one from [TMDB](https://www.themoviedb.org/settings/api))

### Environment Setup
1. Create a `.env` file in the root directory:
```bash
TMDB_API_KEY=your_tmdb_api_key_here
```

2. Install dependencies (✅ **Now conflict-free**):
```bash
npm install
```

3. Start development servers:
```bash
npm run dev
```

This will start:
- **API Server**: `http://localhost:3001` (Express server)
- **Frontend**: `http://localhost:5173` (Vite dev server with proxy)

### Testing Local Development
```bash
# Test endpoints locally
node test-endpoints.js

# Test production build locally
npm run build
npm run preview
```

---

## 🌐 Vercel Production Deployment

### Environment Variables
In your Vercel dashboard, add these environment variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `TMDB_API_KEY` | `your_api_key` | Your TMDB API key |
| `NODE_ENV` | `production` | Environment identifier |

### Deploy to Vercel
```bash
# Using Vercel CLI (✅ Now working)
npm i -g vercel
vercel

# Or connect your GitHub repo to Vercel Dashboard
```

### Testing Production Deployment
```bash
# Test production endpoints
TEST_BASE_URL=https://your-app.vercel.app node test-endpoints.js
```

---

## 🔧 Key Features for Dual Environment Support

### 1. **Robust API Proxy**
- **Local**: Express server with streaming support
- **Vercel**: Serverless functions with buffer handling
- **Timeout Protection**: 15s for TMDB API, 10s for images
- **Error Handling**: Graceful fallbacks and retries

### 2. **Image Proxy**
- **Fallback Images**: Returns transparent PNG on failures
- **CORS Headers**: Proper cross-origin support
- **Caching**: Optimized cache headers for performance

### 3. **Frontend Resilience**
- **Retry Logic**: 3 attempts with exponential backoff
- **Timeout Handling**: Compatible with both environments
- **Error Recovery**: User-friendly error messages with retry buttons
- **Optimistic Updates**: Smooth UX even during network issues
- **Toast Notifications**: ✅ **New Preact-compatible system**

### 4. **Development vs Production Differences**

| Feature | Local Development | Vercel Production |
|---------|-------------------|-------------------|
| API Routing | Express Router | Serverless Functions |
| Image Streaming | `response.pipe()` | `Buffer` handling |
| Timeouts | `Promise.race()` | `Promise.race()` |
| CORS | Express middleware | Function headers |
| Dependencies | ✅ **Preact-only** | ✅ **Preact-only** |

---

## 📁 File Structure

```
├── api/
│   ├── image.js              # Image proxy (local + Vercel)
│   ├── tmdb.js               # TMDB proxy (local only)
│   ├── tmdb/[...path].js     # TMDB proxy (Vercel only)
│   ├── stream-url.js         # Stream URL handler
│   └── index.js              # Express server (local only)
├── src/
│   ├── components/
│   │   ├── Toast.jsx         # ✅ New Preact toast system
│   │   └── Toast.css         # Toast styling
│   ├── pages/
│   │   ├── Login.jsx         # ✅ Updated to use new toast
│   │   ├── SignUp.jsx        # ✅ Updated to use new toast
│   │   └── History.jsx       # Enhanced with retry logic
│   ├── App.jsx               # ✅ Updated to use new toast
│   ├── store.js              # Fixed Zustand deprecation
│   └── config.js             # API base URL configuration
├── .nvmrc                    # ✅ Node.js version specification
├── vercel.json               # ✅ Enhanced Vercel config
├── vite.config.js            # Local dev proxy config
└── test-endpoints.js         # Cross-environment testing
```

---

## 🧪 Testing & Validation

### Endpoint Health Check
```bash
# Local testing
curl http://localhost:5173/api/tmdb/movie/550
curl http://localhost:5173/image-proxy?url=https://example.com/image.jpg

# Production testing
curl https://your-app.vercel.app/api/tmdb/movie/550
curl https://your-app.vercel.app/image-proxy?url=https://example.com/image.jpg
```

### ✅ Build Verification
```bash
# Test local build (should succeed)
npm run build

# Test local install (should succeed without conflicts)
npm install
```

### Error Scenarios Handled
- ✅ Network timeouts
- ✅ API rate limits
- ✅ Invalid image URLs
- ✅ Missing environment variables
- ✅ CORS issues
- ✅ JSON parsing errors
- ✅ **Dependency conflicts**
- ✅ **React/Preact incompatibilities**

---

## 🚨 Troubleshooting

### Common Issues

**1. TMDB API Key Error**
```
Error: TMDB_API_KEY environment variable is not set
```
**Solution**: Add your TMDB API key to environment variables

**2. ✅ **RESOLVED**: Dependency Conflicts**
```
npm error ERESOLVE could not resolve
```
**Solution**: ✅ **Fixed** - Removed conflicting React dependencies, using Preact-compatible alternatives

**3. ✅ **RESOLVED**: Toast Not Working**
```
Cannot resolve module 'react-hot-toast'
```
**Solution**: ✅ **Fixed** - New custom toast system in `src/components/Toast.jsx`

**4. Network Errors in History**
```
NetworkError when attempting to fetch resource
```
**Solution**: The app now has retry logic and will automatically recover

**5. Image Proxy 500 Errors**
```
Error proxying image
```
**Solution**: Now returns fallback transparent PNG instead of errors

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG=true npm run dev
```

---

## 📊 Performance Optimizations

- **Connection Reuse**: HTTP keep-alive enabled
- **Image Caching**: 1-year cache for successful images, 5-min for errors
- **Request Timeouts**: Prevents hanging requests
- **Retry Logic**: Smart exponential backoff
- **Optimistic UI**: Immediate feedback while loading
- **✅ Reduced Bundle Size**: Removed unnecessary React dependencies
- **✅ Faster Builds**: Streamlined dependency tree

---

## 🔒 Security Features

- **API Key Protection**: Server-side only, never exposed to client
- **CORS Configuration**: Restricted to necessary origins
- **Request Validation**: Input sanitization and validation
- **Rate Limiting**: Built-in TMDB API rate limiting
- **Error Sanitization**: No sensitive data in error messages

---

## 🎉 Ready for Deployment!

Your application is now **100% compatible** with both local development and Vercel production:

✅ **Local Development**: `npm install` → `npm run dev`  
✅ **Production Build**: `npm run build` (verified working)  
✅ **Vercel Deployment**: All dependency conflicts resolved  
✅ **Toast Notifications**: Custom Preact-compatible system  
✅ **Node.js Version**: Specified via `.nvmrc` for consistent deployments  

Deploy with confidence! 🚀 