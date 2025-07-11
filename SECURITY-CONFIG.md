# Free Tier Optimized Configuration Guide

## Overview

Your TMDB API proxy has been optimized for the **Vercel Hobby (Free) Plan** while maintaining essential security and performance features. This document explains the optimizations and how to configure them for free tier usage.

## Key Improvements Implemented

### 🔒 Security Enhancements

1. **Restrictive CORS Policy**
   - Production: Only allows specific domains (configurable via `ALLOWED_ORIGINS`)
   - Development: Allows localhost origins for testing
   - Validates origin headers and blocks unauthorized requests

2. **Security Headers**
   - `X-Content-Type-Options: nosniff` - Prevents MIME sniffing attacks
   - `X-Frame-Options: DENY` - Prevents clickjacking
   - `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information

3. **Input Validation & Sanitization**
   - Path traversal protection (`../` removal)
   - Dangerous character filtering
   - URL encoding of path segments
   - Request method validation (only GET allowed)

4. **Error Handling Security**
   - Generic error messages in production
   - Internal error details hidden from users
   - Structured error logging with unique error IDs

### ⚡ Performance Improvements

1. **Connection Pooling**
   - HTTP keep-alive enabled
   - Configurable socket pooling (50 max sockets, 10 free sockets)
   - LIFO scheduling for better connection reuse

2. **Timeout Management**
   - Configurable request timeouts (default: 8 seconds)
   - Proper abort signal handling
   - Environment-based timeout configuration

3. **Structured Logging**
   - JSON logging in production for better parsing
   - Request correlation with unique IDs
   - Performance metrics tracking
   - Debug logs only in development

4. **Caching Headers**
   - Public caching with 5-minute max-age
   - Stale-while-revalidate for better UX
   - Proper cache control headers

### 🔧 Maintainability Features

1. **Environment-Based Configuration**
   - Different settings for development vs production
   - Centralized configuration management
   - Environment variable validation

2. **Comprehensive Logging**
   - Request/response tracking
   - Error correlation IDs
   - Performance monitoring
   - Security event logging

3. **Code Organization**
   - Modular function structure
   - Clear separation of concerns
   - Enhanced error handling

## Environment Variables Configuration

Create these environment variables in your Vercel project:

### Required Variables

```bash
# TMDB API Key (Required)
TMDB_API_KEY=your_tmdb_api_key_here

# Environment (Required)
NODE_ENV=production
```

### Security Variables

```bash
# Allowed Origins for CORS (Production)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Custom User Agent (Optional)
USER_AGENT=YourApp/1.0 (contact@yourdomain.com)
```

### Performance Variables

```bash
# API Timeout in milliseconds (Optional, default: 8000)
API_TIMEOUT=8000
```

### Development Settings

For local development, use:

```bash
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
API_TIMEOUT=15000
```

## CORS Configuration Examples

### Production Setup
```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com,https://cdn.yourdomain.com
```

### Development Setup
```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000
```

### Multiple Environments
```bash
# Production
ALLOWED_ORIGINS=https://yourdomain.com

# Staging
ALLOWED_ORIGINS=https://staging.yourdomain.com

# Development
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

## Monitoring and Observability

### Log Structure
All logs now include:
- `timestamp` - ISO 8601 timestamp
- `level` - Log level (info, warn, error, debug)
- `message` - Human-readable message
- `service` - Always "tmdb-proxy"
- `environment` - Current NODE_ENV
- `requestId` - Unique request identifier
- `userAgent` - Client user agent
- `duration` - Request duration in milliseconds

### Example Log Entry (Production)
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "message": "Request completed successfully",
  "service": "tmdb-proxy",
  "environment": "production",
  "requestId": "abc123def456",
  "duration": 234,
  "responseSize": 1024
}
```

### Example Log Entry (Development)
```
[2024-01-15T10:30:45.123Z] INFO: Request completed successfully { requestId: 'abc123def456', duration: 234 }
```

## Security Headers Explained

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevents browsers from MIME-sniffing responses |
| `X-Frame-Options` | `DENY` | Prevents the page from being embedded in frames |
| `X-XSS-Protection` | `1; mode=block` | Enables browser XSS filtering |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls referrer information sent with requests |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Enforces HTTPS for one year |
| `Cache-Control` | `public, max-age=300, stale-while-revalidate=60` | Optimizes caching behavior |

## Error Handling

### Error Response Format
```json
{
  "error": true,
  "message": "User-friendly error message",
  "errorCode": "ERROR_CODE",
  "errorId": "unique-error-id",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

### Error Codes
- `ORIGIN_NOT_ALLOWED` - Request from unauthorized origin
- `METHOD_NOT_ALLOWED` - Non-GET request attempted
- `PATH_REQUIRED` - Missing API path
- `INVALID_PATH` - Invalid characters in path
- `CONFIG_ERROR` - Server configuration issue
- `RESOURCE_NOT_FOUND` - TMDB resource not found
- `API_KEY_INVALID` - TMDB API key issue
- `RATE_LIMITED` - TMDB rate limit exceeded
- `TIMEOUT_ERROR` - Request timeout
- `INTERNAL_ERROR` - Generic server error

## Performance Optimizations

### Connection Pooling Settings
```javascript
{
  keepalive: true,
  keepaliveMsecs: 30000,    // 30 seconds
  maxSockets: 50,           // Max connections per host
  maxFreeSockets: 10,       // Max idle connections
  timeout: 8000,            // Request timeout
  scheduling: 'lifo'        // Last-in-first-out scheduling
}
```

### Timeout Configuration
- Default: 8 seconds
- Development: Can be increased to 15+ seconds
- Production: Keep below 10 seconds for better UX
- Edge Functions: Must be under 30 seconds (Vercel limit)

## Migration Notes

### Breaking Changes
1. **CORS**: Production now requires explicit origin configuration
2. **Error Format**: Error responses now use structured format
3. **Headers**: Additional security headers added
4. **Logging**: Console output format changed

### Upgrade Steps
1. Set `ALLOWED_ORIGINS` environment variable for production
2. Update error handling in your frontend if needed
3. Configure monitoring for new log format
4. Test CORS configuration with your domains

## Best Practices

### Security
1. Always set `ALLOWED_ORIGINS` in production
2. Use HTTPS for all allowed origins
3. Monitor error logs for security events
4. Rotate API keys regularly

### Performance
1. Set appropriate timeout values
2. Monitor request durations
3. Use caching headers effectively
4. Optimize API usage patterns

### Monitoring
1. Set up log aggregation (e.g., LogDNA, Papertrail)
2. Monitor error rates and response times
3. Track security events
4. Set up alerts for high error rates

## Troubleshooting

### Common Issues

#### CORS Errors
```
Error: Origin not allowed
```
**Solution**: Add your domain to `ALLOWED_ORIGINS`

#### Timeout Errors
```
Error: Request timeout after 8000ms
```
**Solution**: Increase `API_TIMEOUT` or optimize TMDB API calls

#### Configuration Errors
```
Error: Service configuration error
```
**Solution**: Check that `TMDB_API_KEY` is set

### Debug Mode
Set `NODE_ENV=development` to enable:
- Detailed error messages
- Debug logging
- Relaxed CORS for localhost
- Stack traces in errors

## References

- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Vercel Edge Functions Documentation](https://vercel.com/docs/functions/edge-functions) 