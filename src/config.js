// config.js

// The client-side application now communicates with our own backend proxy.
// The proxy is responsible for securely adding the API key to requests.
// The API key is no longer stored on the client.

// IMPORTANT: You must set up a `TMDB_API_KEY` environment variable in your
// Vercel project settings for the proxy to work.

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const ORIGINAL_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/original';
const SHIKIMORI_IMAGE_BASE_URL = 'https://shikimori.one';

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

// API provider configurations
export const API_PROVIDERS = {
  ANILIST: 'anilist',
  SHIKIMORI: 'shikimori',
  TMDB: 'tmdb'
};

// Default API provider for anime content
export const DEFAULT_ANIME_PROVIDER = import.meta.env.VITE_DEFAULT_ANIME_PROVIDER || API_PROVIDERS.ANILIST;

export const API_BASE_URL = getApiBaseUrl();

export function getProxiedImageUrl(url) {
  if (!url) return '';
  
  // Check if this is a Supabase storage URL - don't proxy these, use directly
  if (url.includes('supabase.co/storage')) {
    return url;
  }
  
  // Check if this is a local/relative URL (like default avatar)
  if (url.startsWith('/') && !url.startsWith('//')) {
    return url;
  }
  
  // Check if this is an AniList URL (either direct or with our special prefix)
  if (url.includes('anilist.co') || url.includes('anilistcdn') || url.includes('anili.st')) {
    return `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(url)}`;
  }
  
  // Check if this is our special format for AniList images
  if (url.startsWith('/anilist_images/')) {
    const actualImageUrl = decodeURIComponent(url.substring('/anilist_images/'.length));
    return `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(actualImageUrl)}`;
  }
  
  // Check if this is a Shikimori image URL
  if (url.startsWith('/system/')) {
    return `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(`${SHIKIMORI_IMAGE_BASE_URL}${url}`)}`;
  }
  
  // For regular http/https URLs
  if (url.startsWith('http')) {
    return `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(url)}`;
  }
  
  // For TMDB relative paths, prepend the TMDB base URL
  return `${API_BASE_URL}/image-proxy?url=${encodeURIComponent(`${IMAGE_BASE_URL}${url}`)}`;
}

// Convert Shikimori anime object to our standardized format
export function normalizeShikimoriAnime(shikimoriAnime) {
  return {
    id: shikimoriAnime.id,
    title: shikimoriAnime.russian || shikimoriAnime.name,
    name: shikimoriAnime.russian || shikimoriAnime.name,
    original_title: shikimoriAnime.name,
    overview: shikimoriAnime.description,
    poster_path: shikimoriAnime.image?.original || shikimoriAnime.image?.preview,
    backdrop_path: null, // Shikimori doesn't provide backdrop images
    vote_average: shikimoriAnime.score,
    first_air_date: shikimoriAnime.aired_on,
    status: shikimoriAnime.status,
    episodes_count: shikimoriAnime.episodes,
    episodes_aired: shikimoriAnime.episodes_aired,
    kind: shikimoriAnime.kind,
    source_provider: API_PROVIDERS.SHIKIMORI,
    seasons: [
      {
        id: 1,
        name: 'Season 1',
        season_number: 1,
        episode_count: shikimoriAnime.episodes || 0
      }
    ]
  };
}

// Convert Shikimori episode to our standardized format
export function normalizeShikimoriEpisode(episode, animeId) {
  return {
    id: `${animeId}-${episode.episode}`,
    name: episode.name || `Episode ${episode.episode}`,
    episode_number: episode.episode,
    season_number: 1, // Shikimori treats all as season 1
    overview: '',
    still_path: episode.image || null,
    air_date: episode.airdate
  };
}

console.log(`🚀 API Base URL: ${API_BASE_URL}`);
console.log(`🌍 Environment: ${import.meta.env.MODE}`);
console.log(`🎯 Default Anime Provider: ${DEFAULT_ANIME_PROVIDER}`);

export { IMAGE_BASE_URL, ORIGINAL_IMAGE_BASE_URL, SHIKIMORI_IMAGE_BASE_URL }; 