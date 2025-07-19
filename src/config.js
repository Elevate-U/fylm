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

  // In development, point directly to the API server
  // In production, use relative path for Vercel
  if (import.meta.env.MODE === 'development') {
    return '/api';
  }
  
  return '/api';
};

export const API_BASE_URL = getApiBaseUrl();

export function getProxiedImageUrl(url) {
  if (!url) return '';
  
  // Check if this is an AniList URL (either direct or with our special prefix)
  if (url.includes('anilist.co') || url.includes('anilistcdn') || url.includes('anili.st')) {
    return `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(url)}`;
  }
  
  // Check if this is our special format for AniList images
  if (url.startsWith('/anilist_images/')) {
    const actualImageUrl = decodeURIComponent(url.substring('/anilist_images/'.length));
    return `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(actualImageUrl)}`;
  }
  
  // For regular http/https URLs
  if (url.startsWith('http')) {
    return `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(url)}`;
  }
  
  // For TMDB relative paths, prepend the TMDB base URL
  return `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(`${IMAGE_BASE_URL}${url}`)}`;
}

console.log(`🚀 API Base URL: ${API_BASE_URL}`);
console.log(`🌍 Environment: ${import.meta.env.MODE}`);

export { IMAGE_BASE_URL, ORIGINAL_IMAGE_BASE_URL }; 