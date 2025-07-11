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
  // Custom environment variable override
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // Both development and production will now use a relative path.
  // The Vite dev server proxy will handle it locally, and Vercel's
  // rewrites will handle it in production.
  return '/api';
};

export const API_BASE_URL = getApiBaseUrl();

export function getProxiedImageUrl(url) {
  if (!url) return '';
  // Use the API_BASE_URL to construct the full proxy path
  return `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(url)}`;
}

console.log(`🚀 API Base URL: ${API_BASE_URL}`);
console.log(`🌍 Environment: ${import.meta.env.MODE}`);

export { IMAGE_BASE_URL, ORIGINAL_IMAGE_BASE_URL }; 