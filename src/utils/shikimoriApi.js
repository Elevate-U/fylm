import { supabaseClient } from '../supabase';

// Shikimori API constants
const SHIKIMORI_API_URL = 'https://shikimori.one/api';
const SHIKIMORI_AUTH_URL = 'https://shikimori.one/oauth';
const SHIKIMORI_CLIENT_ID = process.env.VITE_SHIKIMORI_CLIENT_ID;
const SHIKIMORI_CLIENT_SECRET = process.env.VITE_SHIKIMORI_CLIENT_SECRET;
const SHIKIMORI_REDIRECT_URI = `${window.location.origin}/auth/callback`;

// ID mapping service URL
const MAPPING_API_URL = 'https://find-my-anime.dtimur.de/api';

/**
 * Initialize the OAuth process by redirecting to Shikimori login
 */
export const initiateShikimoriLogin = () => {
  const authUrl = `${SHIKIMORI_AUTH_URL}/authorize?client_id=${SHIKIMORI_CLIENT_ID}&redirect_uri=${encodeURIComponent(SHIKIMORI_REDIRECT_URI)}&response_type=code`;
  window.location.href = authUrl;
};

/**
 * Exchange auth code for access token
 * @param {string} code - Authorization code from callback
 * @returns {Promise<Object>} Token response
 */
export const getShikimoriToken = async (code) => {
  try {
    const formData = new URLSearchParams();
    formData.append('grant_type', 'authorization_code');
    formData.append('client_id', SHIKIMORI_CLIENT_ID);
    formData.append('client_secret', SHIKIMORI_CLIENT_SECRET);
    formData.append('code', code);
    formData.append('redirect_uri', SHIKIMORI_REDIRECT_URI);

    const response = await fetch(`${SHIKIMORI_AUTH_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const tokenData = await response.json();
    
    // Store tokens in Supabase user metadata
    const { user } = await supabaseClient.auth.getUser();
    if (user) {
      await supabaseClient.auth.updateUser({
        data: {
          shikimori_access_token: tokenData.access_token,
          shikimori_refresh_token: tokenData.refresh_token,
          shikimori_token_expiry: Date.now() + (tokenData.expires_in * 1000)
        }
      });
    }
    
    return tokenData;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
};

/**
 * Refresh the access token using refresh token
 * @returns {Promise<Object>} New token data
 */
export const refreshShikimoriToken = async () => {
  try {
    // Get current user and refresh token
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user?.user_metadata?.shikimori_refresh_token) {
      throw new Error('No refresh token available');
    }
    
    const formData = new URLSearchParams();
    formData.append('grant_type', 'refresh_token');
    formData.append('client_id', SHIKIMORI_CLIENT_ID);
    formData.append('client_secret', SHIKIMORI_CLIENT_SECRET);
    formData.append('refresh_token', user.user_metadata.shikimori_refresh_token);
    
    const response = await fetch(`${SHIKIMORI_AUTH_URL}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const tokenData = await response.json();
    
    // Update stored tokens
    await supabaseClient.auth.updateUser({
      data: {
        shikimori_access_token: tokenData.access_token,
        shikimori_refresh_token: tokenData.refresh_token,
        shikimori_token_expiry: Date.now() + (tokenData.expires_in * 1000)
      }
    });
    
    return tokenData;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
};

/**
 * Get a valid access token, refreshing if necessary
 * @returns {Promise<string>} Valid access token
 */
export const getValidAccessToken = async () => {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { shikimori_access_token, shikimori_token_expiry } = user.user_metadata || {};
    
    // Check if token is expired or will expire soon (5 minutes buffer)
    if (!shikimori_access_token || !shikimori_token_expiry || 
        Date.now() > (shikimori_token_expiry - 300000)) {
      const newTokens = await refreshShikimoriToken();
      return newTokens.access_token;
    }
    
    return shikimori_access_token;
  } catch (error) {
    console.error('Failed to get valid access token:', error);
    throw error;
  }
};

/**
 * Make an authenticated API request to Shikimori
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} API response
 */
export const shikimoriApiRequest = async (endpoint, options = {}) => {
  try {
    const accessToken = await getValidAccessToken();
    
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Fylm Streaming App'
    };
    
    const response = await fetch(`${SHIKIMORI_API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers || {})
      }
    });
    
    if (!response.ok) {
      throw new Error(`Shikimori API error: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error(`Error in Shikimori API request to ${endpoint}:`, error);
    throw error;
  }
};

/**
 * Get anime details from Shikimori
 * @param {number} id - Shikimori anime ID
 * @returns {Promise<Object>} Anime details
 */
export const getAnimeDetails = async (id) => {
  return shikimoriApiRequest(`/animes/${id}`);
};

/**
 * Get episodes for an anime
 * @param {number} id - Shikimori anime ID
 * @returns {Promise<Array>} Episodes list with images
 */
export const getAnimeEpisodes = async (id) => {
  return shikimoriApiRequest(`/animes/${id}/episodes`);
};

/**
 * Map AniList ID to Shikimori ID
 * @param {number} anilistId - AniList anime ID
 * @returns {Promise<number|null>} Shikimori ID or null if not found
 */
export const mapAnilistToShikimori = async (anilistId) => {
  try {
    const response = await fetch(`${MAPPING_API_URL}/anilist/${anilistId}`);
    if (!response.ok) {
      throw new Error(`Mapping API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.shikimori || null;
  } catch (error) {
    console.error(`Error mapping AniList ID ${anilistId} to Shikimori:`, error);
    return null;
  }
};

/**
 * Search anime by name
 * @param {string} query - Search query
 * @returns {Promise<Array>} Search results
 */
export const searchAnime = async (query) => {
  return shikimoriApiRequest(`/animes?search=${encodeURIComponent(query)}&limit=20`);
};

/**
 * Get anime recommendations
 * @param {number} id - Shikimori anime ID
 * @returns {Promise<Array>} Recommended anime
 */
export const getAnimeRecommendations = async (id) => {
  return shikimoriApiRequest(`/animes/${id}/similar`);
}; 