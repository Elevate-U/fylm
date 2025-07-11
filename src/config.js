// config.js

// The client-side application now communicates with our own backend proxy.
// The proxy is responsible for securely adding the API key to requests.
// The API key is no longer stored on the client.

// IMPORTANT: You must set up a `TMDB_API_KEY` environment variable in your
// Vercel project settings for the proxy to work.

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const ORIGINAL_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

// Enhanced API base URL configuration for different environments
const getApiBaseUrl = () => {
  // Check if we're in development mode
  const isDevelopment = import.meta.env.MODE === 'development' || 
                       window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.port === '5173';
  
  // Custom environment variable override
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Development: use local Express server
  if (isDevelopment) {
    return 'http://localhost:3001/api';
  }
  
  // Production: use Vercel serverless functions
  return '/api';
};

export const API_BASE_URL = getApiBaseUrl();

export function getProxiedImageUrl(url) {
  if (!url) return '';
  return `/image-proxy?url=${encodeURIComponent(url)}`;
}

console.log(`🚀 API Base URL: ${API_BASE_URL}`);
console.log(`🌍 Environment: ${import.meta.env.MODE}`);

export { IMAGE_BASE_URL, ORIGINAL_IMAGE_BASE_URL }; 