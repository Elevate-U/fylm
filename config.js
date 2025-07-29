// config.js

// SECURITY: API keys are now handled securely through environment variables
// All TMDB API calls are proxied through our backend to protect the API key

// Using /img/ prefix which gets rewritten to TMDB image URLs by Vercel
const IMAGE_BASE_URL = '/img/t/p/w500';
const ORIGINAL_IMAGE_BASE_URL = '/img/t/p/original';
// API calls now go through our secure backend proxy
const API_BASE_URL = '/api';