// config.js

// The client-side application now communicates with our own backend proxy.
// The proxy is responsible for securely adding the API key to requests.
// The API key is no longer stored on the client.

// IMPORTANT: You must set up a `TMDB_API_KEY` environment variable in your
// Vercel project settings for the proxy to work.

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const ORIGINAL_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';

const API_BASE_URL = '/api';

export { API_BASE_URL, IMAGE_BASE_URL, ORIGINAL_IMAGE_BASE_URL }; 