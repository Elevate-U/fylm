import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import { URL } from 'url'; // For robust URL handling
import { Readable } from 'node:stream';

// Load environment variables
dotenv.config();

const app = express();

// --- In-Memory Cache Configuration ---
const API_CACHE = new Map();
const CACHE_DURATION = {
  TMDB_DETAILS: 30 * 60 * 1000, // 30 minutes for movie/TV details
  TMDB_SEARCH: 15 * 60 * 1000,  // 15 minutes for search results
  TMDB_TRENDING: 10 * 60 * 1000, // 10 minutes for trending
  TMDB_SEASON: 60 * 60 * 1000,   // 1 hour for season details (rarely changes)
};

// Cache utility functions
const getCacheKey = (prefix, ...args) => `${prefix}:${args.join(':')}`;
const getFromCache = (key) => {
  const cached = API_CACHE.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now > cached.expiry) {
    API_CACHE.delete(key);
    return null;
  }
  
  console.log(`✅ Cache HIT: ${key}`);
  return cached.data;
};
const setInCache = (key, data, duration) => {
  API_CACHE.set(key, {
    data,
    expiry: Date.now() + duration
  });
  console.log(`💾 Cached: ${key} for ${duration / 1000}s`);
};

// Clean up expired cache entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, value] of API_CACHE.entries()) {
    if (now > value.expiry) {
      API_CACHE.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
  }
}, 10 * 60 * 1000);

// --- Source Configuration ---
const SOURCES_CONFIG = {
    'videasy': {
        baseUrl: 'https://player.videasy.net',
        movie: (id) => `/movie/${id}`,
        tv: (id, s, e) => `/tv/${id}/${s}/${e}`,
        anime: (id, s, e) => `/anime/${id}/${e}`, // AniList format uses /anime/id/episode
        animeMovie: (id) => `/anime/${id}`
    },
    'vidsrc': {
        baseUrl: 'https://vidsrc.xyz',
        movie: (id, imdbId) => `/embed/movie?${imdbId ? `imdb=${imdbId}` : `tmdb=${id}`}`,
        tv: (id, s, e, imdbId) => `/embed/tv?${imdbId ? `imdb=${imdbId}` : `tmdb=${id}`}&season=${s}&episode=${e}`,
        anime: (id, s, e, imdbId) => `/embed/tv?${imdbId ? `imdb=${imdbId}` : `tmdb=${id}`}&season=${s}&episode=${e}`, // Vidsrc treats anime as TV shows
        animeMovie: (id, imdbId) => `/embed/movie?${imdbId ? `imdb=${imdbId}` : `tmdb=${id}`}`
    },
    'embedsu': {
        baseUrl: 'https://embed.su',
        movie: (id) => `/embed/movie?tmdb=${id}`,
        tv: (id, s, e) => `/embed/tv?tmdb=${id}&s=${s}&e=${e}`,
        anime: (id, s, e) => `/embed/tv?tmdb=${id}&s=${s}&e=${e}`, // Embedsu also treats anime as TV shows
        animeMovie: (id) => `/embed/movie?tmdb=${id}`
    }
};
const AVAILABLE_SOURCES = Object.keys(SOURCES_CONFIG);

// --- API Provider Configuration ---
const API_PROVIDERS = {
    ANILIST: 'anilist',
    SHIKIMORI: 'shikimori',
    TMDB: 'tmdb'
};

// Default API provider for anime content
const DEFAULT_ANIME_PROVIDER = process.env.DEFAULT_ANIME_PROVIDER || API_PROVIDERS.ANILIST;

// --- Environment Variable Checks ---
const TMDB_API_KEY = process.env.TMDB_API_KEY;
let apiKeyWarningShown = false;

const ensureTMDBKey = () => {
  if (!TMDB_API_KEY && !apiKeyWarningShown) {
    console.error("🔴 Fatal: TMDB_API_KEY is not defined in the environment.");
    apiKeyWarningShown = true;
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
  return !!TMDB_API_KEY;
};

// Initialize once at startup
if (TMDB_API_KEY) {
  console.log("✅ TMDB API key loaded successfully");
  console.log(`📊 Cache enabled for TMDB responses`);
} else {
  console.error("🔴 TMDB API key missing!");
}

// Check for Shikimori API keys
const SHIKIMORI_CLIENT_ID = process.env.SHIKIMORI_CLIENT_ID;
const SHIKIMORI_CLIENT_SECRET = process.env.SHIKIMORI_CLIENT_SECRET;
if (DEFAULT_ANIME_PROVIDER === API_PROVIDERS.SHIKIMORI && (!SHIKIMORI_CLIENT_ID || !SHIKIMORI_CLIENT_SECRET)) {
    console.warn("⚠️ Warning: Shikimori is set as default but credentials are missing. AniList will be used as fallback.");
} else if (SHIKIMORI_CLIENT_ID && SHIKIMORI_CLIENT_SECRET) {
    console.log("✅ Shikimori API credentials loaded successfully");
}

// This is now handled by SOURCES_CONFIG, so it can be removed.
// const STREAMING_PROVIDER_URL = process.env.STREAMING_PROVIDER_URL || 'https://player.videasy.net';
// console.log(`✅ Streaming provider URL set to: ${STREAMING_PROVIDER_URL}`);


// --- Middleware ---
app.use(express.json());

// Strip '/api' prefix for Vercel/local consistency
app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
        req.url = req.url.slice(4) || '/';
    }
    next();
});

// --- CORS Configuration ---
const isDevelopment = process.env.NODE_ENV !== 'production';
const localhostRegex = /^http:\/\/localhost(:\d+)?$/;
const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean));

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g., mobile apps, curl)
        if (!origin) {
            return callback(null, true);
        }
        // Allow localhost in development
        if (isDevelopment && localhostRegex.test(origin)) {
            return callback(null, true);
        }
        // Allow Vercel preview URLs
        if (/\.vercel\.app$/.test(origin)) {
            return callback(null, true);
        }
        // Check against whitelisted origins
        if (allowedOrigins.has(origin)) {
            return callback(null, true);
        }
        console.error(`CORS block for origin: ${origin}.`);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
};
app.use(cors(corsOptions));


// --- API Routes ---

// 1. Secure Image Proxy
app.get('/image-proxy', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl || typeof imageUrl !== 'string') {
        return res.status(400).json({ error: 'Image URL is required as a string.' });
    }

    // Handle placeholder images
    if (imageUrl.startsWith('/placeholder/')) {
        // Return a simple colored placeholder image
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        
        const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        
        // Determine image type from path
        let label = imageUrl.split('/').pop().replace('.jpg', '');
        let width = 500;
        let height = 750;
        
        // Special handling for anime placeholders
        if (label.startsWith('anime_')) {
            const animeId = label.replace('anime_', '');
            label = `Anime ${animeId}`;
            // For backdrop images, use different dimensions
            if (label.includes('backdrop')) {
                width = 1280;
                height = 720;
                label = `Anime ${animeId} Backdrop`;
            }
        } else if (label.startsWith('episode_')) {
            const episodeNum = label.replace('episode_', '');
            label = `Episode ${episodeNum}`;
            width = 1280;
            height = 720;
        }
        
        const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="${randomColor}" />
            <text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">
                ${label}
            </text>
        </svg>`;
        
        return res.send(svg);
    }

    // Handle AniList images with special format
    if (imageUrl.startsWith('/anilist_images/')) {
        try {
            // Extract and decode the actual image URL
            const actualImageUrl = decodeURIComponent(imageUrl.substring('/anilist_images/'.length));
            
            // Check if the URL is valid
            const url = new URL(actualImageUrl);
            if (!['http:', 'https:'].includes(url.protocol)) {
                return res.status(400).json({ error: 'Invalid AniList image URL protocol.' });
            }
            
            // Now proceed with fetching the image
            console.log(`[IMAGE_PROXY] Fetching AniList image: ${actualImageUrl}`);
            const response = await fetch(actualImageUrl, {
                headers: { 
                    'User-Agent': 'ai-business-image-proxy/1.0 (AniList)',
                    'Accept': 'image/*'
                }
            });
            
            if (!response.ok) {
                console.error(`[IMAGE_PROXY] Failed to fetch AniList image: ${response.status}`, actualImageUrl);
                // Return a placeholder image instead of an error
                res.setHeader('Content-Type', 'image/svg+xml');
                res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
                
                const svg = `<svg width="500" height="750" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="#6a5acd" />
                    <text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">
                        Anime Image
                    </text>
                </svg>`;
                
                return res.send(svg);
            }
            
            res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
            // Stream the image directly to the client to save memory
            Readable.fromWeb(response.body).pipe(res);
            return;
        } catch (error) {
            console.error('[IMAGE_PROXY] AniList image proxy error:', error);
            return res.status(500).json({ error: 'Failed to proxy AniList image', details: error.message });
        }
    }
    
    // Handle direct AniList image URLs
    if (imageUrl.includes('anilist.co') || imageUrl.includes('anilistcdn') || imageUrl.includes('anili.st')) {
        try {
            console.log(`[IMAGE_PROXY] Direct AniList image URL detected: ${imageUrl}`);
            
            // Check if the URL is valid
            const url = new URL(imageUrl);
            if (!['http:', 'https:'].includes(url.protocol)) {
                return res.status(400).json({ error: 'Invalid AniList image URL protocol.' });
            }
            
            // Now proceed with fetching the image
            const response = await fetch(imageUrl, {
                headers: { 
                    'User-Agent': 'ai-business-image-proxy/1.0 (AniList)',
                    'Accept': 'image/*'
                }
            });
            
            if (!response.ok) {
                console.error(`[IMAGE_PROXY] Failed to fetch direct AniList image: ${response.status}`, imageUrl);
                // Return a placeholder image instead of an error
                res.setHeader('Content-Type', 'image/svg+xml');
                res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
                
                const svg = `<svg width="500" height="750" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="#6a5acd" />
                    <text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">
                        Anime Image
                    </text>
                </svg>`;
                
                return res.send(svg);
            }
            
            res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
            // Stream the image directly to the client to save memory
            Readable.fromWeb(response.body).pipe(res);
            return;
        } catch (error) {
            console.error('[IMAGE_PROXY] Direct AniList image error:', error);
            return res.status(500).json({ error: 'Failed to proxy direct AniList image', details: error.message });
        }
    }

    // Handle Shikimori images
    if (imageUrl.includes('shikimori.one') || imageUrl.startsWith('/system/')) {
        try {
            const fullUrl = imageUrl.startsWith('/system/') 
                ? `https://shikimori.one${imageUrl}` 
                : imageUrl;
            
            console.log(`[IMAGE_PROXY] Fetching Shikimori image: ${fullUrl}`);
            
            // Check if the URL is valid
            const url = new URL(fullUrl);
            if (!['http:', 'https:'].includes(url.protocol)) {
                return res.status(400).json({ error: 'Invalid Shikimori image URL protocol.' });
            }
            
            // Now proceed with fetching the image
            const response = await fetch(fullUrl, {
                headers: { 
                    'User-Agent': 'ai-business-image-proxy/1.0 (Shikimori)',
                    'Accept': 'image/*'
                }
            });
            
            if (!response.ok) {
                console.error(`[IMAGE_PROXY] Failed to fetch Shikimori image: ${response.status}`, fullUrl);
                // Return a placeholder image instead of an error
                res.setHeader('Content-Type', 'image/svg+xml');
                res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
                
                const svg = `<svg width="500" height="750" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="#8B0000" />
                    <text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">
                        Anime Image
                    </text>
                </svg>`;
                
                return res.send(svg);
            }
            
            res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
            // Stream the image directly to the client to save memory
            Readable.fromWeb(response.body).pipe(res);
            return;
        } catch (error) {
            console.error('[IMAGE_PROXY] Shikimori image proxy error:', error);
            return res.status(500).json({ error: 'Failed to proxy Shikimori image', details: error.message });
        }
    }

    // Regular image URL handling
    try {
        const url = new URL(imageUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
            return res.status(400).json({ error: 'Invalid image URL protocol. Only HTTP and HTTPS are allowed.' });
        }
    } catch (error) {
        return res.status(400).json({ error: 'Invalid image URL provided.' });
    }
    
    try {
        const response = await fetch(imageUrl, {
            headers: { 'User-Agent': 'ai-business-image-proxy/1.0' }
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => `Upstream status: ${response.statusText}`);
            console.error(`[IMAGE_PROXY] Failed to fetch image. Status: ${response.status}`, { url: imageUrl, body: errorText.substring(0, 500) });
            return res.status(response.status).json({
                error: `Failed to fetch image: ${response.statusText}`,
                details: errorText.substring(0, 500)
            });
        }
        
        res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        // Stream the image directly to the client to save memory
        Readable.fromWeb(response.body).pipe(res);

    } catch (error) {
        console.error('[IMAGE_PROXY] General image proxy error:', { url: imageUrl, message: error.message });
        res.status(500).json({ error: 'Failed to proxy image', details: error.message });
    }
});


// 2. Stream URL Generator
app.get('/stream-url', async (req, res) => {
    try {
        const { type, id, season, episode, source, dub, progress, nextEpisode, episodeSelector, autoplayNextEpisode } = req.query;

        if (!type || !id) {
            return res.status(400).json({ error: true, message: 'Missing "type" or "id" parameter.' });
        }

        const currentSource = source && AVAILABLE_SOURCES.includes(source) ? source : 'videasy';
        const sourceConfig = SOURCES_CONFIG[currentSource];
        
        let path;
        let imdbId = null;
        let tmdbId = null;

        // For anime content, we need to handle it differently based on the streaming source
        if (type === 'anime') {
            const anilistId = id;
            
            // Videasy supports AniList IDs directly
            if (currentSource === 'videasy') {
                // Check if this is an anime movie or series
                if (season && episode) {
                    path = sourceConfig.anime(anilistId, season || 1, episode || 1);
                    console.log(`[Stream URL] Using AniList ID ${anilistId} for anime series on Videasy, episode ${episode || 1}`);
                } else {
                    path = sourceConfig.animeMovie(anilistId);
                    console.log(`[Stream URL] Using AniList ID ${anilistId} for anime movie on Videasy`);
                }
            }
            // Other sources might need TMDB ID
            else {
                try {
                    // Try to get TMDB ID from AniList ID
                    console.log(`[Stream URL] Trying to get TMDB ID for AniList ID ${anilistId} on ${currentSource}`);
                    
                    if (!TMDB_API_KEY) {
                        throw new Error('TMDB API key not configured.');
                    }
                    
                    // First get MAL ID from AniList
                    const malQuery = `query ($id: Int) { Media (id: $id, type: ANIME) { idMal title { romaji english } } }`;
                    const anilistResponse = await fetch('https://graphql.anilist.co', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query: malQuery, variables: { id: parseInt(anilistId) } }),
                    });
                    
                    if (!anilistResponse.ok) {
                        throw new Error(`AniList API error: ${anilistResponse.status}`);
                    }
                    
                    const anilistData = await anilistResponse.json();
                    
                    if (anilistData.errors) {
                        throw new Error(`AniList GraphQL errors: ${JSON.stringify(anilistData.errors)}`);
                    }
                    
                    const media = anilistData?.data?.Media;
                    const malId = media?.idMal;
                    const animeTitle = media?.title?.english || media?.title?.romaji || 'Unknown';
                    
                    if (!malId) {
                        throw new Error(`MAL ID not found for "${animeTitle}" (AniList ID: ${anilistId})`);
                    }
                    
                    console.log(`[Stream URL] Found MAL ID ${malId} for "${animeTitle}"`);
                    
                    // Then get TMDB ID from MAL ID
                    const findResponse = await fetch(`https://api.themoviedb.org/3/find/${malId}?api_key=${TMDB_API_KEY}&external_source=myanimelist_id`);
                    
                    if (!findResponse.ok) {
                        throw new Error(`TMDB find API error: ${findResponse.status}`);
                    }
                    
                    const findData = await findResponse.json();
                    const tvResult = findData.tv_results?.[0];
                    const movieResult = findData.movie_results?.[0];
                    const result = tvResult || movieResult;
                    
                    if (result) {
                        tmdbId = result.id;
                        const mediaType = tvResult ? 'tv' : 'movie';
                        console.log(`[Stream URL] Found TMDB ID ${tmdbId} (${mediaType}) for "${animeTitle}"`);
                        
                        // Use the TMDB ID for the streaming source
                        if (season && episode && mediaType === 'tv') {
                            path = sourceConfig.tv(tmdbId, season, episode, null);
                        } else {
                            path = sourceConfig.movie(tmdbId, null);
                        }
                    } else {
                        throw new Error(`No TMDB entry found for "${animeTitle}" (MAL ID: ${malId})`);
                    }
                } catch (error) {
                    console.error(`[Stream URL] Error getting TMDB ID for anime: ${error.message}`);
                    
                    // For non-Videasy sources, try a different approach before giving up
                    if (currentSource !== 'videasy') {
                        console.warn(`[Stream URL] ${currentSource} requires TMDB ID but conversion failed for AniList ID ${anilistId}`);
                        console.log(`[Stream URL] Attempting to use AniList ID directly as fallback for ${currentSource}`);
                        
                        // Try using AniList ID directly with TV/movie endpoints as last resort
                        // Some sources might accept AniList IDs even though they prefer TMDB
                        if (season && episode) {
                            path = sourceConfig.tv(anilistId, season, episode, null);
                            console.log(`[Stream URL] Using TV endpoint with AniList ID ${anilistId} for ${currentSource}`);
                        } else {
                            path = sourceConfig.movie(anilistId, null);
                            console.log(`[Stream URL] Using movie endpoint with AniList ID ${anilistId} for ${currentSource}`);
                        }
                    } else {
                        // Fallback to using AniList ID directly for Videasy
                        console.log(`[Stream URL] Falling back to AniList ID for Videasy`);
                        if (season && episode) {
                           path = sourceConfig.anime(anilistId, season, episode);
                       } else {
                           path = sourceConfig.animeMovie(anilistId);
                       }
                    }
                }
            }
        }
        // For non-anime content, proceed as before
        else {
        // For vidsrc, try to get IMDb ID for better compatibility
            if (currentSource === 'vidsrc' && TMDB_API_KEY) {
            try {
                // Construct the correct TMDB API URL
                const externalIdsUrl = `https://api.themoviedb.org/3/${type}/${id}/external_ids?api_key=${TMDB_API_KEY}`;
                const tmdbRes = await fetch(externalIdsUrl);
                
                if (tmdbRes.ok) {
                    const externalIds = await tmdbRes.json();
                    if (externalIds.imdb_id) {
                        imdbId = externalIds.imdb_id;
                        console.log(`[Stream URL] Found IMDb ID for vidsrc: ${imdbId}`);
                    }
                }
            } catch (err) {
                console.error(`[Stream URL] Failed to fetch IMDb ID for ${type}/${id}:`, err.message);
            }
        }

        switch (type) {
            case 'movie':
                path = sourceConfig.movie(id, imdbId);
                break;
            case 'tv':
                if (!season || !episode) {
                    return res.status(400).json({ error: true, message: 'Missing "season" or "episode" for TV shows.' });
                }
                path = sourceConfig.tv(id, season, episode, imdbId);
                break;
            default:
                return res.status(400).json({ error: true, message: `Unsupported type: "${type}"` });
            }
        }

        if (!path) {
            return res.status(400).json({ error: true, message: 'Failed to generate stream path.' });
        }

        let finalUrl = sourceConfig.baseUrl + path;

        // --- Handle Query Parameters ---
        const params = new URLSearchParams();

        // Generic parameters (like 'dub' for anime) can be added here
        if (type === 'anime' && dub === 'true') {
            params.append('dub', 'true');
        }

        // Videasy-specific parameters for enhanced features
        if (currentSource === 'videasy') {
            if (progress && parseInt(progress) > 0) {
                params.append('progress', parseInt(progress));
            }
            if ((type === 'tv' || type === 'anime') && nextEpisode === 'true') {
                params.append('nextEpisode', 'true');
            }
            if ((type === 'tv' || type === 'anime') && episodeSelector === 'true') {
                params.append('episodeSelector', 'true');
            }
            if ((type === 'tv' || type === 'anime') && autoplayNextEpisode === 'true') {
                params.append('autoplayNextEpisode', 'true');
            }
        }
        
        // Example of other source-specific params
        if (currentSource === 'vidsrc' && autoplayNextEpisode === 'true') {
            params.append('autoplay', '1');
        }

        // Append parameters to URL if any exist
        if (params.toString()) {
            const separator = finalUrl.includes('?') ? '&' : '?';
            finalUrl += separator + params.toString();
        }

        console.log(`[Stream URL] Generated for ${type} ID ${id} (source: ${currentSource}): ${finalUrl}`);
        
        // Test the URL to make sure it's accessible
        try {
            const testResponse = await fetch(finalUrl, { 
                method: 'HEAD',
                signal: AbortSignal.timeout(5000)
            });
            console.log(`[Stream URL] URL test result: ${testResponse.status}`);
        } catch (error) {
            console.warn(`[Stream URL] URL test failed: ${error.message}`);
        }
        
        res.status(200).json({
            url: finalUrl,
            currentSource,
            availableSources: AVAILABLE_SOURCES,
            isDirectSource: false // All these sources use iframes
        });

    } catch (error) {
        console.error('[Stream URL] Error generating stream URL:', error);
        res.status(500).json({
            error: true,
            message: 'Failed to generate stream URL.',
            details: error.message
        });
    }
});


// 3. AniList API proxy
app.post('/anilist', async (req, res) => {
    try {
        const { query, variables } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }
        
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query,
                variables: variables || {}
            })
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => `Status: ${response.statusText}`);
            console.error('AniList API error:', { status: response.status, body: errorText.substring(0, 500) });
            return res.status(response.status).json({
                error: 'Error from AniList API',
                details: errorText.substring(0, 500)
            });
    }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('AniList proxy error:', error);
        res.status(500).json({ error: 'Failed to proxy AniList request', details: error.message });
    }
});

// 4. AniList to TMDB mapping endpoint
// This route is deprecated and no longer needed with the new consolidated anime handler.
// app.get('/anilist/from-tmdb/:tmdbId', ...);
// --- Helper for retries ---
const fetchWithRetry = async (url, options, retries = 3, delay = 500) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fetch(url, options);
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

// --- Health Check Endpoints ---
app.get('/health/:service', async (req, res) => {
    const { service } = req.params;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        if (service === 'anilist') {
            const query = `query { Media(id: 1) { id } }`; // Minimal, stable query
            const options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ query }),
                signal: controller.signal
            };

            const response = await fetchWithRetry('https://graphql.anilist.co', options);
            
            if (response.ok) {
                const data = await response.json();
                if (data.data?.Media?.id) {
                    res.status(200).json({ status: 'ok' });
                } else {
                    res.status(503).json({ status: 'unavailable', reason: 'Invalid data structure from AniList' });
                }
            } else {
                res.status(503).json({ status: 'unavailable', reason: `AniList API returned ${response.status}` });
            }

        } else {
             let url;
            switch (service) {
                case 'videasy':
                    url = 'https://player.videasy.net';
                    break;
                default:
                    return res.status(404).json({ error: 'Unknown service' });
            }
            const response = await fetch(url, { method: 'HEAD', signal: controller.signal });

            if (response.ok || response.status === 405) {
                res.status(200).json({ status: 'ok' });
            } else {
                res.status(503).json({ status: 'unavailable' });
            }
        }
    } catch (error) {
        console.error(`Health check for ${service} failed:`, error.message);
        res.status(503).json({ status: 'unavailable', error: error.message });
    } finally {
        clearTimeout(timeoutId);
    }
});

app.get('/tmdb/from-anilist/:anilistId', async (req, res) => {
    try {
        const { anilistId } = req.params;

        if (!TMDB_API_KEY) {
            return res.status(503).json({ error: 'TMDB API key is not configured on the server.' });
        }

        // 1. Get MAL ID from AniList
        const malQuery = `
            query ($id: Int) {
                Media (id: $id, type: ANIME) {
                    idMal
                }
            }
        `;
        const anilistResponse = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query: malQuery, variables: { id: anilistId } })
        });

        if (!anilistResponse.ok) {
            throw new Error(`Failed to fetch from AniList: ${anilistResponse.statusText}`);
        }
        const anilistData = await anilistResponse.json();
        const malId = anilistData?.data?.Media?.idMal;
        
        if (!malId) {
            return res.status(404).json({ error: 'Could not find MAL ID on AniList for the given AniList ID.' });
        }

        // 2. Use TMDB's find endpoint with MAL ID
        const findUrl = `https://api.themoviedb.org/3/find/${malId}?api_key=${TMDB_API_KEY}&external_source=myanimelist_id`;
        const findResponse = await fetch(findUrl);
        if (!findResponse.ok) {
            throw new Error(`Failed to fetch from TMDB find endpoint: ${findResponse.statusText}`);
        }
        const findData = await findResponse.json();
        
        const tvResult = findData.tv_results?.[0];
        const movieResult = findData.movie_results?.[0];

        if (tvResult) {
            res.json({ tmdbId: tvResult.id, type: 'tv' });
        } else if (movieResult) {
            res.json({ tmdbId: movieResult.id, type: 'movie' });
        } else {
            return res.status(404).json({ error: 'Could not find a matching TV show or movie on TMDB for the given MAL ID.' });
        }

    } catch (error) {
        console.error('TMDB from AniList mapping error:', error);
        res.status(500).json({ error: 'Failed to map AniList ID to TMDB ID', details: error.message });
    }
});

app.get('/anilist/from-tmdb/:type/:tmdbId', async (req, res) => {
    try {
        const { tmdbId, type } = req.params;

        if (!TMDB_API_KEY) {
            return res.status(503).json({ error: 'TMDB API key is not configured on the server.' });
        }

        // 1. Get details from TMDB to get the title
        const tmdbUrl = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
        const tmdbResponse = await fetch(tmdbUrl);
        if (!tmdbResponse.ok) {
            throw new Error(`Failed to fetch from TMDB: ${tmdbResponse.statusText}`);
        }
        const tmdbData = await tmdbResponse.json();
        const title = tmdbData.name || tmdbData.title;
        const originalTitle = tmdbData.original_name || tmdbData.original_title;

        if (!title) {
            return res.status(404).json({ error: 'Could not find a title for the given TMDB ID.' });
        }

        // 2. Search for the title on AniList
        const searchQuery = `
            query ($search: String) {
                Page(page: 1, perPage: 5) {
                    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
                    id
                    title {
                        romaji
                        english
                        native
                    }
                    }
            }
            }
        `;

        const searchOnAniList = async (searchTerm) => {
        const anilistResponse = await fetch('https://graphql.anilist.co', {
            method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ query: searchQuery, variables: { search: searchTerm } })
        });
        
        if (!anilistResponse.ok) {
                throw new Error(`Failed to fetch from AniList: ${anilistResponse.statusText}`);
            }
            return await anilistResponse.json();
        };

        let anilistData = await searchOnAniList(title);
        let media = anilistData?.data?.Page?.media;

        // If no good match, try original title
        if ((!media || media.length === 0) && originalTitle && originalTitle !== title) {
            anilistData = await searchOnAniList(originalTitle);
            media = anilistData?.data?.Page?.media;
        }

        if (!media || media.length === 0) {
            return res.status(404).json({ error: 'Could not find a matching anime on AniList.' });
        }
        
        // Simple matching logic: take the first result
        const anilistId = media[0].id;
        
        res.json({ anilistId: anilistId, tmdbId: tmdbId });

    } catch (error) {
        console.error('AniList from TMDB mapping error:', error);
        res.status(500).json({ error: 'Failed to map TMDB ID to AniList ID', details: error.message });
    }
});

// 3. Bulk TMDB Details Endpoint
app.post('/tmdb/bulk-episodes', async (req, res) => {
    const { requests } = req.body;

    if (!Array.isArray(requests) || requests.length === 0) {
        return res.status(400).json({ error: 'Invalid request body. Expected an array of requests.' });
    }

    if (!TMDB_API_KEY) {
        return res.status(503).json({ error: 'TMDB API key is not configured on the server.' });
    }

    try {
        const promises = requests.map(async (request) => {
            const { id, season, episode } = request;
            if (!id || !season || !episode) {
                return { success: false, id, season, episode, error: 'Missing id, season, or episode' };
            }

            try {
                const url = `https://api.themoviedb.org/3/tv/${id}/season/${season}/episode/${episode}?api_key=${TMDB_API_KEY}`;
                const response = await fetchWithRetry(url);
                if (!response.ok) {
                    const errorText = await response.text();
                    return { success: false, id, season, episode, error: `TMDB API error: ${response.status} - ${errorText}` };
                }
                const data = await response.json();
                return { success: true, id, season, episode, data };
            } catch (fetchError) {
                return { success: false, id, season, episode, error: fetchError.message };
            }
        });

        const results = await Promise.all(promises);
        res.status(200).json(results);

    } catch (error) {
        console.error('Bulk episode fetch error:', error);
        res.status(500).json({ error: 'Failed to process bulk episode request.' });
    }
});

app.post('/tmdb/bulk', async (req, res) => {
    const { requests } = req.body;

    if (!Array.isArray(requests) || requests.length === 0) {
        return res.status(400).json({ error: 'Invalid request body. Expected an array of requests.' });
    }

    if (!TMDB_API_KEY) {
        return res.status(503).json({ error: 'TMDB API key is not configured on the server.' });
    }

    try {
        const promises = requests.map(async (request) => {
            const { type, id } = request;
            if (!type || !id) {
                return { success: false, type, id, error: 'Missing type or id' };
            }

            try {
                const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits`;
                const response = await fetchWithRetry(url);
                if (!response.ok) {
                    const errorText = await response.text();
                    return { success: false, type, id, error: `TMDB API error: ${response.status} - ${errorText}` };
                }
                const data = await response.json();
                return { success: true, type, id, data };
            } catch (fetchError) {
                return { success: false, type, id, error: fetchError.message };
            }
        });

        const results = await Promise.all(promises);
        res.status(200).json(results);

    } catch (error) {
        console.error('Bulk TMDB fetch error:', error);
        res.status(500).json({ error: 'Failed to process bulk request.' });
    }
});


// 5. Direct AniList handlers for Anime
const handleAnimeRequest = async (req, res, subpath = '') => {
    try {
        const { anilistId } = req.params;
        
        if (!anilistId || isNaN(parseInt(anilistId))) {
            return res.status(400).json({ error: 'Invalid AniList ID provided', details: 'ID must be a number' });
        }
        
        const queryParams = req.query;
        const numericId = parseInt(anilistId);

        console.log(`[ANIME_HANDLER] Request for AniList ID ${numericId}, subpath: '${subpath}'`);

        // Base query for anime details
        let query = `
            query ($id: Int) {
                Media(id: $id, type: ANIME) {
                    id
                    idMal
                    title {
                        romaji
                        english
                        native
                    }
                    description
                    coverImage {
                        extraLarge
                        large
                        medium
                    }
                    bannerImage
                    startDate {
                        year
                        month
                        day
                    }
                    endDate {
                        year
                        month
                        day
                    }
                    season
                    seasonYear
                    format
                    status
                    episodes
                    duration
                    genres
                    averageScore
                    popularity
                    studios {
                        nodes {
                            name
                        }
                    }
                    nextAiringEpisode {
                        airingAt
                        timeUntilAiring
                        episode
                    }
                    relations {
                        edges {
                            relationType
                            node {
                                id
                                idMal
                                type
                            }
                        }
                    }
                }
            }
        `;

        // Modify query based on subpath
        if (subpath === 'recommendations') {
            query = `
                query ($id: Int) {
                    Media(id: $id, type: ANIME) {
                        id
                        recommendations(sort: RATING_DESC) {
                            nodes {
                                mediaRecommendation {
                                    id
                                    title {
                                        romaji
                                        english
                                    }
                                    coverImage {
                                        large
                                    }
                                    format
                                    status
                                    episodes
                                    meanScore
                                }
                            }
                        }
                    }
                }
            `;
        } else if (subpath === 'videos') {
            query = `
                query ($id: Int) {
                    Media(id: $id, type: ANIME) {
                        id
                        title {
                            romaji
                            english
                        }
                        trailer {
                            id
                            site
                            thumbnail
                        }
                    }
                }
            `;
        }

        try {
            // Make request to AniList GraphQL API
            console.log(`[ANIME_HANDLER] Sending GraphQL query to AniList for ID ${numericId}`);
            
            const response = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    query: query,
                    variables: { id: numericId }
                })
            });
    
            if (!response.ok) {
                throw new Error(`AniList API error: ${response.status}`);
            }
    
            const graphqlResponse = await response.json();
            
            // Check for GraphQL errors
            if (graphqlResponse.errors) {
                throw new Error(`GraphQL errors: ${JSON.stringify(graphqlResponse.errors)}`);
            }
            
            const media = graphqlResponse.data?.Media;
            
            if (!media) {
                // Instead of returning 404, use fallback data
                console.log(`[ANIME_HANDLER] No AniList data for ID ${numericId}, using fallback data`);
                return sendFallbackAnimeResponse(req, res, numericId, subpath);
            }
    
            // Attempt to convert AniList ID to TMDB ID via MyAnimeList ID
            // This is now done AFTER fetching the main data
            let tmdbId = null;

            if (media.idMal && (!subpath || subpath.startsWith('season'))) {
                try {
                    console.log(`[ANIME_HANDLER] Converting MAL ID ${media.idMal} to TMDB ID`);
                    const conversionResponse = await fetch(`https://api.themoviedb.org/3/find/${media.idMal}?api_key=${TMDB_API_KEY}&external_source=myanimelist_id`);
                    if (conversionResponse.ok) {
                        const conversionData = await conversionResponse.json();
                        const tvResult = conversionData.tv_results?.[0];
                        if (tvResult) {
                            console.log(`[ANIME_HANDLER] Found TMDB ID: ${tvResult.id}`);
                            tmdbId = tvResult.id;
                        } else {
                            console.log(`[ANIME_HANDLER] No TV result found for MAL ID ${media.idMal}`);
                        }
                    } else {
                        console.warn(`[ANIME_HANDLER] Failed to convert MAL ID ${media.idMal} to TMDB ID. Status: ${conversionResponse.status}`);
                    }
                } catch (e) {
                    console.error('[ANIME_HANDLER] Error during MAL to TMDB conversion:', e);
                }
            }

            // Format response based on subpath
            let formattedResponse;
            if (subpath === 'recommendations') {
                const recommendations = media.recommendations?.nodes?.map(node => {
                    const rec = node.mediaRecommendation;
                    if (!rec) return null;
                    return {
                        id: rec.id,
                        title: rec.title.english || rec.title.romaji,
                        poster_path: rec.coverImage?.large,
                        media_type: 'anime',
                        source: 'anilist',
                        vote_average: rec.meanScore ? rec.meanScore / 10 : 0,
                        year: rec.seasonYear,
                        status: rec.status,
                        episodes: rec.episodes,
                        format: rec.format
                    };
                }).filter(Boolean) || []; // Filter out nulls
                
                // Add a defensive check for recommendations
                if (!recommendations) {
                    console.warn(`[ANIME_HANDLER] No recommendations found for AniList ID ${numericId}`);
                }
                
                formattedResponse = { results: recommendations };
            } else if (subpath === 'videos') {
                const videos = [];
                if (media.trailer) {
                    const site = media.trailer.site?.toLowerCase();
                    if (site === 'youtube') {
                        videos.push({
                            name: `${media.title.english || media.title.romaji} Trailer`,
                            key: media.trailer.id,
                            site: 'YouTube',
                            type: 'Trailer',
                            official: true
                        });
                    }
                }
                
                formattedResponse = { results: videos };
            } else if (subpath.startsWith('season/')) {
                // Format season data to match TMDB format
                const seasonNumber = parseInt(req.params.seasonNumber) || 1;
                
                // Try to get TMDB episode data if TMDB ID is available
                let tmdbEpisodes = null;
                if (tmdbId && TMDB_API_KEY) {
                    try {
                        console.log(`[ANIME_HANDLER] Attempting to fetch TMDB episode data for TMDB ID ${tmdbId}, season ${seasonNumber}`);
                        const tmdbSeasonUrl = `https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`;
                        const tmdbResponse = await fetch(tmdbSeasonUrl);
                        if (tmdbResponse.ok) {
                            const tmdbSeasonData = await tmdbResponse.json();
                            tmdbEpisodes = tmdbSeasonData.episodes;
                            console.log(`[ANIME_HANDLER] Successfully fetched ${tmdbEpisodes?.length || 0} TMDB episodes`);
                        } else {
                            console.log(`[ANIME_HANDLER] TMDB season request failed with status ${tmdbResponse.status}`);
                        }
                    } catch (error) {
                        console.error(`[ANIME_HANDLER] Error fetching TMDB episode data: ${error.message}`);
                    }
                }
                
                // Create episode list
                const episodes = [];
                const totalEpisodes = media.episodes || 0;
                
                // Create episode objects
                for (let i = 1; i <= totalEpisodes; i++) {
                    // Create episode with proper name mapping for frontend compatibility
                    const episodeName = `Episode ${i}`;
                    const animeTitle = media.title?.english || media.title?.romaji || 'Unknown Anime';
                    
                    // Use TMDB episode data if available, otherwise fall back to AniList data
                    const tmdbEpisode = tmdbEpisodes?.find(ep => ep.episode_number === i);
                    let stillPath;
                    let episodeOverview;
                    let episodeTitle;
                    
                    if (tmdbEpisode) {
                        // Use TMDB episode data with proper still_path
                        stillPath = tmdbEpisode.still_path || `/placeholder/episode_${i}.jpg`;
                        episodeOverview = tmdbEpisode.overview || `Episode ${i} of ${animeTitle}`;
                        episodeTitle = tmdbEpisode.name || episodeName;
                        console.log(`[ANIME_HANDLER] Using TMDB data for episode ${i}: still_path=${stillPath}`);
                    } else {
                        // Fall back to AniList images
                        stillPath = media.bannerImage ? `/anilist_images/${encodeURIComponent(media.bannerImage)}` :
                                   media.coverImage?.large ? `/anilist_images/${encodeURIComponent(media.coverImage.large)}` :
                                   `/placeholder/episode_${i}.jpg`;
                        episodeOverview = `Episode ${i} of ${animeTitle}`;
                        episodeTitle = episodeName;
                    }
                    
                    episodes.push({
                        id: `${media.id}_${seasonNumber}_${i}`,
                        name: episodeTitle,
                        title: episodeTitle, // Add title field for frontend compatibility
                        episode_number: i,
                        season_number: seasonNumber,
                        overview: episodeOverview,
                        still_path: stillPath
                    });
                }
                
                formattedResponse = {
                    id: media.id,
                    name: `Season ${seasonNumber}`,
                    season_number: seasonNumber,
                    episodes: episodes,
                    _air_date: media.startDate ? `${media.startDate.year}-${media.startDate.month || '01'}-${media.startDate.day || '01'}` : null,
                    _tmdb_data_used: tmdbEpisodes ? true : false // Add flag to indicate if TMDB data was used
                };
            } else {
                // Format basic anime details to match TMDB format
                formattedResponse = {
                    id: media.id,
                    title: media.title.english || media.title.romaji,
                    name: media.title.english || media.title.romaji,
                    original_name: media.title.native,
                    overview: media.description ? media.description.replace(/<[^>]*>/g, '') : '',
                    poster_path: media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium,
                    backdrop_path: media.bannerImage,
                    vote_average: media.averageScore / 10,
                    popularity: media.popularity,
                    first_air_date: media.startDate ? `${media.startDate.year}-${media.startDate.month || '01'}-${media.startDate.day || '01'}` : '',
                    last_air_date: media.endDate && media.endDate.year ? `${media.endDate.year}-${media.endDate.month || '01'}-${media.endDate.day || '01'}` : '',
                    status: media.status,
                    genres: media.genres.map(genre => ({ id: genre, name: genre })),
                    number_of_seasons: 1,
                    number_of_episodes: media.episodes,
                    episode_run_time: [media.duration],
                    seasons: [
                        {
                            id: `${media.id}_season_1`,
                            name: 'Season 1',
                            season_number: 1,
                            episode_count: media.episodes,
                            poster_path: media.coverImage?.large || media.coverImage?.medium
                        }
                    ],
                    studios: media.studios?.nodes?.map(studio => studio.name) || [],
                    next_episode_to_air: media.nextAiringEpisode ? {
                        episode_number: media.nextAiringEpisode.episode,
                        air_date: new Date(media.nextAiringEpisode.airingAt * 1000).toISOString().split('T')[0]
                    } : null,
                    // Add conversion data for the frontend
                    _conversion: {
                        tmdbId: tmdbId,
                        source: 'AniList'
                    }
                };
            }
    
            // Add AniList ID and TMDB conversion info to the response
            res.json({
                ...formattedResponse,
                anilist_id: numericId,
                source: 'anilist', // Add source at top level for frontend compatibility
                _conversion: {
                    anilistId: numericId,
                    source: 'anilist'
                }
            });
        } catch (error) {
            console.error(`[ANIME_HANDLER] AniList API error: ${error.message}`);
            return sendFallbackAnimeResponse(req, res, numericId, subpath);
        }
    } catch (error) {
        console.error(`[ANIME_HANDLER] Error for subpath '${subpath}':`, error);
        return sendFallbackAnimeResponse(req, res, parseInt(req.params.anilistId), subpath);
    }
};

// Helper function to send fallback anime data
const sendFallbackAnimeResponse = (req, res, animeId, subpath = '') => {
    console.log(`[ANIME_HANDLER] Using fallback data for ID ${animeId}, subpath: '${subpath}'`);
    
    // Create a generic anime response based on the ID
    const title = `Anime ${animeId}`;
    
    if (subpath === 'recommendations') {
        return res.json({
            results: getFallbackAnimeRecommendations()
        });
    } else if (subpath === 'videos') {
        return res.json({
            results: [] // Empty videos array
        });
    } else if (subpath.startsWith('season/')) {
        const seasonNumber = parseInt(req.params.seasonNumber) || 1;
        const episodes = [];
        
        // Create 12 generic episodes (common anime season length)
        for (let i = 1; i <= 12; i++) {
            episodes.push({
                id: `${animeId}_${seasonNumber}_${i}`,
                name: `Episode ${i}`,
                title: `Episode ${i}`,
                episode_number: i,
                season_number: seasonNumber,
                overview: `Episode ${i} of ${title}`,
                still_path: `/placeholder/episode_${i}.jpg`
            });
        }
        
        return res.json({
            id: animeId,
            name: `Season ${seasonNumber}`,
            season_number: seasonNumber,
            episodes: episodes,
            _air_date: "2023-01-01"
        });
    } else {
        // Basic anime details
        return res.json({
            id: animeId,
            anilist_id: animeId,
            title: title,
            name: title,
            original_name: title,
            overview: `This is a placeholder for anime with ID ${animeId}.`,
            poster_path: `/placeholder/anime_${animeId}.jpg`,
            backdrop_path: `/placeholder/anime_backdrop_${animeId}.jpg`,
            vote_average: 7.5,
            popularity: 100,
            first_air_date: '2023-01-01',
            status: 'RELEASING',
            genres: [{ id: 'Action', name: 'Action' }, { id: 'Adventure', name: 'Adventure' }],
            number_of_seasons: 1,
            number_of_episodes: 12,
            episode_run_time: [24],
            seasons: [
                {
                    id: `${animeId}_season_1`,
                    name: 'Season 1',
                    season_number: 1,
                    episode_count: 12
                }
            ],
            studios: ['Studio'],
            source: 'anilist', // Add source for fallback data
            _conversion: {
                anilistId: animeId,
                source: 'fallback'
            }
        });
    }
};

// Helper function for fallback recommendations
const getFallbackAnimeRecommendations = () => {
    return [
        {
            id: 1,
            title: 'One Piece',
            name: 'One Piece',
            poster_path: `/placeholder/anime_1.jpg`,
            vote_average: 8.7,
            media_type: 'anime'
        },
        {
            id: 5114,
            title: 'Fullmetal Alchemist: Brotherhood',
            name: 'Fullmetal Alchemist: Brotherhood',
            poster_path: `/placeholder/anime_5114.jpg`,
            vote_average: 9.1,
            media_type: 'anime'
        },
        {
            id: 21,
            title: 'One Piece',
            name: 'One Piece',
            poster_path: `/placeholder/anime_21.jpg`,
            vote_average: 8.5,
            media_type: 'anime'
        },
        {
            id: 16498,
            title: 'Attack on Titan',
            name: 'Attack on Titan',
            poster_path: `/placeholder/anime_16498.jpg`,
            vote_average: 8.9,
            media_type: 'anime'
        }
    ];
};

app.get('/tmdb/anime/:anilistId', (req, res) => handleAnimeRequest(req, res));
app.get('/tmdb/anime/:anilistId/videos', (req, res) => handleAnimeRequest(req, res, 'videos'));
app.get('/tmdb/anime/:anilistId/recommendations', (req, res) => handleAnimeRequest(req, res, 'recommendations'));
app.get('/tmdb/anime/:anilistId/season/:seasonNumber', (req, res) => handleAnimeRequest(req, res, `season/${req.params.seasonNumber}`));

// Enhanced Anime endpoint that combines AniList and TMDB data
app.get('/tmdb/anime/:anilistId/enhanced', async (req, res) => {
    try {
        const { anilistId } = req.params;
        
        if (!anilistId || isNaN(parseInt(anilistId))) {
            return res.status(400).json({ error: 'Invalid AniList ID', details: 'ID must be a number' });
        }

        console.log(`[ANIME_ENHANCED] Processing enhanced request for anime ID ${anilistId}`);
        
        // Define the GraphQL query with all the fields needed for enhanced data
        const query = `
            query ($id: Int) {
                Media(id: $id, type: ANIME) {
                    id
                    idMal
                    title {
                        romaji
                        english
                        native
                    }
                    description
                    coverImage {
                        extraLarge
                        large
                        medium
                    }
                    bannerImage
                    startDate {
                        year
                        month
                        day
                    }
                    endDate {
                        year
                        month
                        day
                    }
                    season
                    seasonYear
                    format
                    status
                    episodes
                    duration
                    genres
                    averageScore
                    popularity
                    studios {
                        nodes {
                            name
                            isAnimationStudio
                        }
                    }
                    nextAiringEpisode {
                        airingAt
                        timeUntilAiring
                        episode
                    }
                    trailer {
                        id
                        site
                        thumbnail
                    }
                    characters(sort: ROLE, perPage: 6) {
                        edges {
                            node {
                                id
                                name {
                                    full
                                }
                                image {
                                    medium
                                }
                            }
                            role
                        }
                    }
                    staff(sort: RELEVANCE, perPage: 4) {
                        edges {
                            node {
                                id
                                name {
                                    full
                                }
                                image {
                                    medium
                                }
                            }
                            role
                        }
                    }
                    tags {
                        name
                        rank
                    }
                }
            }
        `;

        try {
            // Make request to AniList GraphQL API with error handling
            const response = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    query: query,
                    variables: { id: parseInt(anilistId) }
                }),
                timeout: 8000 // 8 second timeout
            }).catch(err => {
                console.error(`[ANIME_ENHANCED] AniList fetch error: ${err.message}`);
                throw new Error(`AniList API request failed: ${err.message}`);
            });
            
            if (!response || !response.ok) {
                throw new Error(`AniList API returned status ${response?.status || 'unknown'}`);
            }
            
            const graphqlResponse = await response.json().catch(err => {
                console.error(`[ANIME_ENHANCED] JSON parse error: ${err.message}`);
                throw new Error('Failed to parse AniList response');
            });
            
            // Check for GraphQL errors
            if (graphqlResponse.errors) {
                console.error(`[ANIME_ENHANCED] GraphQL errors:`, graphqlResponse.errors);
                throw new Error(`GraphQL errors: ${JSON.stringify(graphqlResponse.errors)}`);
            }
            
            const media = graphqlResponse.data?.Media;
            
            if (!media) {
                console.log(`[ANIME_ENHANCED] No data found for anime ID ${anilistId}`);
                return sendFallbackAnimeResponse(req, res, parseInt(anilistId));
            }
            
            // Try to fetch TMDB ID via MAL ID if available
            let tmdbId = null;
            if (media.idMal) {
                try {
                    const tmdbMappingUrl = `https://api.themoviedb.org/3/find/${media.idMal}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
                    const tmdbResponse = await fetch(tmdbMappingUrl).catch(() => null);
                    if (tmdbResponse && tmdbResponse.ok) {
                        const tmdbData = await tmdbResponse.json().catch(() => null);
                        if (tmdbData && tmdbData.tv_results && tmdbData.tv_results.length > 0) {
                            tmdbId = tmdbData.tv_results[0].id;
                        }
                    }
                } catch (error) {
                    console.error(`[ANIME_ENHANCED] Error finding TMDB ID: ${error.message}`);
                    // Continue without TMDB ID
                }
            }
            
            // Extract videos data
            const videos = [];
            if (media.trailer) {
                const site = media.trailer.site?.toLowerCase();
                if (site === 'youtube') {
                    videos.push({
                        name: `${media.title.english || media.title.romaji} Trailer`,
                        key: media.trailer.id,
                        site: 'YouTube',
                        type: 'Trailer',
                        official: true
                    });
                }
            }
            
            // Format basic anime details to match TMDB format with enhanced fields
            const enhancedResponse = {
                id: media.id,
                tmdb_id: tmdbId,
                title: media.title.english || media.title.romaji,
                name: media.title.english || media.title.romaji,
                original_name: media.title.native,
                overview: media.description ? media.description.replace(/<[^>]*>/g, '') : '',
                // Handle image paths properly using the special anilist_images format
                poster_path: media.coverImage?.extraLarge ? `/anilist_images/${encodeURIComponent(media.coverImage.extraLarge)}` :
                            media.coverImage?.large ? `/anilist_images/${encodeURIComponent(media.coverImage.large)}` :
                            media.coverImage?.medium ? `/anilist_images/${encodeURIComponent(media.coverImage.medium)}` : null,
                backdrop_path: media.bannerImage ? `/anilist_images/${encodeURIComponent(media.bannerImage)}` : null,
                vote_average: media.averageScore / 10,
                popularity: media.popularity,
                first_air_date: media.startDate ? `${media.startDate.year}-${media.startDate.month || '01'}-${media.startDate.day || '01'}` : '',
                last_air_date: media.endDate && media.endDate.year ? `${media.endDate.year}-${media.endDate.month || '01'}-${media.endDate.day || '01'}` : '',
                status: media.status,
                genres: media.genres.map(genre => ({ id: genre, name: genre })),
                number_of_seasons: 1,
                number_of_episodes: media.episodes,
                episode_run_time: [media.duration],
                seasons: [
                    {
                        id: `${media.id}_season_1`,
                        name: 'Season 1',
                        season_number: 1,
                        episode_count: media.episodes
                    }
                ],
                // Enhanced fields
                studios: media.studios?.nodes?.map(studio => ({ 
                    name: studio.name, 
                    isMain: studio.isAnimationStudio 
                })) || [],
                characters: media.characters?.edges?.map(edge => ({
                    id: edge.node.id,
                    name: edge.node.name.full,
                    image: edge.node.image?.medium ? `/anilist_images/${encodeURIComponent(edge.node.image.medium)}` : null,
                    role: edge.role
                })) || [],
                staff: media.staff?.edges?.map(edge => ({
                    id: edge.node.id,
                    name: edge.node.name.full,
                    image: edge.node.image?.medium ? `/anilist_images/${encodeURIComponent(edge.node.image.medium)}` : null,
                    role: edge.role
                })) || [],
                tags: media.tags?.map(tag => ({
                    name: tag.name,
                    rank: tag.rank
                })) || [],
                nextAiringEpisode: media.nextAiringEpisode ? {
                    episode_number: media.nextAiringEpisode.episode,
                    air_date: new Date(media.nextAiringEpisode.airingAt * 1000).toISOString().split('T')[0],
                    time_until_airing: media.nextAiringEpisode.timeUntilAiring
                } : null,
                videos: { results: videos },
                format: media.format,
                season: media.season,
                seasonYear: media.seasonYear
            };
            
            // Send the enhanced response
            res.json({
                ...enhancedResponse,
                anilist_id: parseInt(anilistId),
                source: 'anilist', // Add source at top level for frontend compatibility
                _conversion: {
                    anilistId: parseInt(anilistId),
                    tmdbId: tmdbId,
                    source: 'anilist'
                }
            });
            
        } catch (error) {
            console.error(`[ANIME_ENHANCED] AniList API error: ${error.message}`);
            // Use fallback response if AniList API fails
            return sendFallbackAnimeResponse(req, res, parseInt(anilistId));
        }
    } catch (error) {
        console.error(`[ANIME_ENHANCED] Unexpected error:`, error);
        res.status(500).json({ 
            error: 'Internal server error processing enhanced anime data',
            message: error.message
        });
    }
});

// 6. Generic TMDB API Proxy (for everything else) WITH CACHING
// IMPORTANT: This MUST come AFTER specific routes like /tmdb/anime/:id
app.get('/tmdb/*', async (req, res) => {
    if (!ensureTMDBKey()) {
        return res.status(500).json({ error: "TMDB API key not configured" });
    }

    try {
        let tmdbPath = req.url.substring(req.url.indexOf('/tmdb/') + 6);
        
        // Check cache first
        const cacheKey = getCacheKey('tmdb', tmdbPath);
        const cachedData = getFromCache(cacheKey);
        if (cachedData) {
          return res.json(cachedData);
        }
        
        const tmdbApiUrl = `https://api.themoviedb.org/3/${tmdbPath}`;
        
        const finalUrl = new URL(tmdbApiUrl);
        finalUrl.searchParams.append('api_key', TMDB_API_KEY);
        
        // Add language parameter if provided
        if (req.query.language) {
            finalUrl.searchParams.append('language', req.query.language);
        }

        console.log(`[TMDB_PROXY] Fetching from TMDB: ${tmdbPath}`);
        
        const response = await fetch(finalUrl);
        
        if (!response.ok) {
            console.error(`[TMDB_PROXY] TMDB API error: ${response.status} for path ${tmdbPath}`);
            return res.status(response.status).json({ error: `TMDB API error: ${response.statusText}` });
        }
        
        const data = await response.json();
        
        // Add source property for frontend compatibility
        const enhancedData = {
            ...data,
            source: 'tmdb'
        };
        
        // Determine cache duration based on endpoint type
        let cacheDuration = CACHE_DURATION.TMDB_DETAILS; // Default
        if (tmdbPath.includes('trending')) {
          cacheDuration = CACHE_DURATION.TMDB_TRENDING;
        } else if (tmdbPath.includes('search')) {
          cacheDuration = CACHE_DURATION.TMDB_SEARCH;
        } else if (tmdbPath.includes('season')) {
          cacheDuration = CACHE_DURATION.TMDB_SEASON;
        }
        
        // Cache the response
        setInCache(cacheKey, enhancedData, cacheDuration);
        
        res.json(enhancedData);
    } catch (error) {
        console.error('[TMDB_PROXY] Proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch from TMDB API', details: error.message });
    }
});


// 8. Consumet API Proxy for Anime
app.get('/consumet/anime/:category', async (req, res) => {
    const { category } = req.params;
    const { page = 1, perPage = 20, query } = req.query;

    // Map our frontend categories to Consumet API endpoints based on documentation
    // Using simpler endpoints that are more likely to work
    const categoryMapping = {
        'trending': 'anime/gogoanime/top-airing',
        'recent-episodes': 'anime/gogoanime/recent-episodes',
        'popular-airing': 'anime/gogoanime/top-airing',
        'popular': 'anime/gogoanime/top-airing',
        'top-rated': 'anime/gogoanime/top-airing',
        'search': 'anime/gogoanime'
    };

    // Get the endpoint from our mapping or use a default
    let endpoint = categoryMapping[category] || 'anime/gogoanime/top-airing';
    
    // Get the base URL from environment variables or fallback, ensuring it has proper protocol
    let consumetBaseUrl = process.env.VITE_CONSUMET_API_URL || 'api.consumet.org';
    
    // Add protocol if missing
    if (!consumetBaseUrl.startsWith('http://') && !consumetBaseUrl.startsWith('https://')) {
        consumetBaseUrl = `https://${consumetBaseUrl}`;
    }
    
    // Prepare URL
    let url;
    try {
        url = new URL(`${consumetBaseUrl}/${endpoint}`);
        
        // Add common query parameters
        if (!endpoint.includes('?')) {
            url.searchParams.append('page', page);
        }
        
        // Add search query if needed
        if (category === 'search' && query) {
            // For GogoAnime search, we need to add the query to the path
            endpoint = `${endpoint}/${encodeURIComponent(query)}`;
            url = new URL(`${consumetBaseUrl}/${endpoint}`);
            url.searchParams.append('page', page);
        }
        
        console.log(`[CONSUMET] Fetching from ${url.toString()}`);
        
        const response = await fetch(url.toString(), {
            headers: { 
                'Accept': 'application/json',
                'User-Agent': 'Fylm/1.0' 
            },
            timeout: 8000 // 8 second timeout
        });

        if (!response.ok) {
            console.error(`[CONSUMET] Error: ${response.status}`);
            return res.status(response.status).json({ 
                error: `Consumet API error: ${response.statusText}`,
                url: url.toString()
            });
        }

        const data = await response.json();
        
        // Transform GogoAnime format to match our expected format
        let results = data;
        
        // Ensure we have a consistent response format
        if (!data.results && Array.isArray(data)) {
            results = {
                results: data,
                hasNextPage: false,
                currentPage: parseInt(page)
            };
        } else if (!data.results && typeof data === 'object') {
            results = {
                results: [data],
                hasNextPage: false,
                currentPage: parseInt(page)
            };
        }
        
        res.json(results);
    } catch (error) {
        console.error('[CONSUMET] Proxy error:', error);
        
        // Return empty results instead of error to allow UI to show fallback content
        res.json({
            results: [],
            hasNextPage: false,
            currentPage: parseInt(page),
            error: error.message
        });
    }
});

// Add a unified search endpoint that queries both AniList and TMDB
app.get('/search/unified', async (req, res) => {
    try {
        const { query, type = 'all', language = 'en-US', sort_by = 'popularity.desc' } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        // Initialize results containers with empty arrays for all properties
        const results = {
            tmdb: { movies: [], tv: [] },
            anilist: [],
            combined: []
        };

        const fetchWithTimeout = (url, options, timeout = 5000) => {
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    reject(new Error('Request timed out'));
                }, timeout);

                fetch(url, options)
                    .then(response => {
                        clearTimeout(timer);
                        resolve(response);
                    })
                    .catch(err => {
                        clearTimeout(timer);
                        reject(err);
                    });
            });
        };

        const searchPromises = [];

        // Search TMDB if type is 'all', 'movie', or 'tv'
        if (['all', 'movie', 'tv'].includes(type) && TMDB_API_KEY) {
            const tmdbTypes = type === 'all' ? ['movie', 'tv'] : [type];
            
            tmdbTypes.forEach(mediaType => {
                const tmdbUrl = `https://api.themoviedb.org/3/search/${mediaType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=${encodeURIComponent(language)}`;
                searchPromises.push(
                    fetchWithTimeout(tmdbUrl)
                        .then(response => response.ok ? response.json() : Promise.resolve({ results: [] }))
                        .then(data => ({
                            source: 'tmdb',
                            type: mediaType,
                            data: (data.results || []).map(item => ({
                                ...item,
                                media_type: mediaType,
                                source: 'tmdb'
                            }))
                        }))
                        .catch(error => {
                            console.error(`TMDB search error for ${mediaType}:`, error.message);
                            return { source: 'tmdb', type: mediaType, data: [] };
                        })
                );
            });
        }

        // Search AniList if type is 'all' or 'anime'
        if (['all', 'anime'].includes(type)) {
            const anilistUrl = `https://graphql.anilist.co`;
            const anilistQuery = `
                query ($search: String) {
                    Page(page: 1, perPage: 20) {
                        media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
                            id
                            title { romaji english native }
                            coverImage { extraLarge large medium color }
                            bannerImage
                            format
                            type
                            status
                            episodes
                            seasonYear
                            averageScore
                            genres
                        }
                    }
                }
            `;
            const variables = { search: query };
            searchPromises.push(
                fetchWithTimeout(anilistUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ query: anilistQuery, variables })
                })
                .then(response => response.ok ? response.json() : Promise.resolve({ data: { Page: { media: [] } } }))
                .then(data => ({
                    source: 'anilist',
                    data: (data.data?.Page?.media || []).map(item => ({
                        id: item.id,
                        title: item.title.english || item.title.romaji,
                        poster_path: item.coverImage.extraLarge || item.coverImage.large,
                        media_type: 'anime',
                        source: 'anilist',
                        vote_average: item.averageScore,
                        genres: item.genres,
                        episodes: item.episodes,
                        year: item.seasonYear,
                        banner_path: item.bannerImage
                    }))
                }))
                .catch(error => {
                    console.error(`AniList search error:`, error.message);
                    return { source: 'anilist', data: [] };
                })
            );
        }

        const allResults = await Promise.all(searchPromises);

        allResults.forEach(result => {
            if (result.source === 'tmdb') {
                results.tmdb[result.type === 'movie' ? 'movies' : 'tv'] = result.data;
            } else if (result.source === 'anilist') {
                results.anilist = result.data;
            }
        });

        // Combine and sort results
        const combinedResults = [
            ...results.tmdb.movies,
            ...results.tmdb.tv,
            ...results.anilist
        ];

        const [sortField, sortOrder] = sort_by.split('.');

        combinedResults.sort((a, b) => {
            let valA, valB;

            switch (sortField) {
                case 'release_date':
                    valA = a.release_date || a.year ? new Date(a.release_date || `${a.year}-01-01`).getTime() : 0;
                    valB = b.release_date || b.year ? new Date(b.release_date || `${b.year}-01-01`).getTime() : 0;
                    break;
                case 'vote_average':
                    valA = a.vote_average || (a.averageScore ? a.averageScore / 10 : 0) || 0;
                    valB = b.vote_average || (b.averageScore ? b.averageScore / 10 : 0) || 0;
                    break;
                default: // popularity
                    valA = a.popularity || 0;
                    valB = b.popularity || 0;
                    break;
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        results.combined = combinedResults;

        res.json(results);
    } catch (error) {
        console.error('Unified search error:', error);
        // Always return a valid structure even on error
        res.status(500).json({ 
            error: 'Failed to perform unified search', 
            details: error.message,
            tmdb: { movies: [], tv: [] },
            anilist: [],
            combined: []
        });
    }
});

// Fetch trending anime from both AniList and TMDB
app.get('/trending/anime/combined', async (req, res) => {
    try {
        // Initialize results container with empty arrays for all expected properties
        const results = {
            anilist: [],
            tmdb: { 
                movies: [], 
                tv: [] 
            },
            seasonal: [],
            combined: []
        };
        
        // Fetch trending anime from AniList
        const anilistQuery = `
            query {
                trending: Page(page: 1, perPage: 20) {
                    media(type: ANIME, sort: TRENDING_DESC) {
                        id
                        idMal
                        title {
                            romaji
                            english
                            native
                        }
                        coverImage {
                            large
                        }
                        bannerImage
                        format
                        episodes
                        description
                        averageScore
                        popularity
                        status
                        startDate {
                            year
                            month
                            day
                        }
                        genres
                    }
                }
                
                season: Page(page: 1, perPage: 20) {
                    media(type: ANIME, sort: POPULARITY_DESC, season: CURRENT) {
                        id
                        idMal
                        title {
                            romaji
                            english
                            native
                        }
                        coverImage {
                            large
                        }
                        bannerImage
                        format
                        episodes
                        description
                        averageScore
                        popularity
                        status
                        startDate {
                            year
                            month
                            day
                        }
                        genres
                    }
                }
            }
        `;

        // Fetch from AniList
        try {
            const anilistResponse = await fetch('https://graphql.anilist.co', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ query: anilistQuery })
            });

            if (anilistResponse.ok) {
                const data = await anilistResponse.json();
                
                // Process trending anime
                if (data?.data?.trending?.media) {
                    results.anilist = data.data.trending.media.map(item => ({
                        id: item.id,
                        anilist_id: item.id, // Store AniList ID explicitly
                        title: item.title.english || item.title.romaji,
                        name: item.title.english || item.title.romaji,
                        original_name: item.title.native,
                        overview: item.description ? item.description.replace(/<[^>]*>/g, '') : '',
                        poster_path: item.coverImage?.large,
                        backdrop_path: item.bannerImage,
                        vote_average: item.averageScore ? item.averageScore / 10 : 0,
                        first_air_date: item.startDate?.year ? `${item.startDate.year}-${item.startDate.month || '01'}-${item.startDate.day || '01'}` : '',
                        popularity: item.popularity,
                        genres: item.genres.map(genre => ({ id: genre, name: genre })),
                        media_type: 'anime',
                        source: 'anilist',
                        trending_source: 'trending',
                        format: item.format,
                        episodes: item.episodes,
                        idMal: item.idMal
                    }));
                }
                
                // Process seasonal anime as a separate category
                if (data?.data?.season?.media) {
                    results.seasonal = data.data.season.media.map(item => ({
                        id: item.id,
                        anilist_id: item.id, // Store AniList ID explicitly
                        title: item.title.english || item.title.romaji,
                        name: item.title.english || item.title.romaji,
                        original_name: item.title.native,
                        overview: item.description ? item.description.replace(/<[^>]*>/g, '') : '',
                        poster_path: item.coverImage?.large,
                        backdrop_path: item.bannerImage,
                        vote_average: item.averageScore ? item.averageScore / 10 : 0,
                        first_air_date: item.startDate?.year ? `${item.startDate.year}-${item.startDate.month || '01'}-${item.startDate.day || '01'}` : '',
                        popularity: item.popularity,
                        genres: item.genres.map(genre => ({ id: genre, name: genre })),
                        media_type: 'anime',
                        source: 'anilist',
                        trending_source: 'seasonal',
                        format: item.format,
                        episodes: item.episodes,
                        idMal: item.idMal
                    }));
                }
            }
        } catch (error) {
            console.error('AniList trending fetch error:', error);
            // Continue with partial results
        }

        // Fetch anime from TMDB if API key is available
        if (TMDB_API_KEY) {
            try {
                const tmdbPromises = [
                    fetch(`https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&with_keywords=210024&sort_by=popularity.desc&page=1`),
                    fetch(`https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_keywords=210024&sort_by=popularity.desc&page=1`)
                ];
                
                const [tvResponse, movieResponse] = await Promise.all(tmdbPromises);
                const tvData = tvResponse.ok ? await tvResponse.json() : { results: [] };
                const movieData = movieResponse.ok ? await movieResponse.json() : { results: [] };
                
                // Process TMDB results
                const tvResults = tvData.results ? tvData.results.map(item => ({ ...item, media_type: 'tv' })) : [];
                const movieResults = movieData.results ? movieData.results.map(item => ({ ...item, media_type: 'movie' })) : [];
                
                // Store separated by type
        results.tmdb.tv = tvResults.map(item => ({
            ...item,
            source: 'tmdb',
            trending_source: 'popular',
            poster_path: item.poster_path, // Pass raw path
            backdrop_path: item.backdrop_path, // Pass raw path
            tmdb_id: item.id, // Store original TMDB ID
            media_type: 'tv' // Ensure media type is preserved
        }));
        
        results.tmdb.movies = movieResults.map(item => ({
            ...item,
            source: 'tmdb',
            trending_source: 'popular',
            poster_path: item.poster_path, // Pass raw path
            backdrop_path: item.backdrop_path, // Pass raw path
            tmdb_id: item.id, // Store original TMDB ID
            media_type: 'movie' // Ensure media type is preserved
        }));
                
                // Add all to flat array for combined sort
                const tmdbResults = [...tvResults, ...movieResults];
                tmdbResults.sort((a, b) => b.popularity - a.popularity);
            } catch (error) {
                console.error('TMDB anime fetch error:', error);
                // Continue with partial results
            }
        }

        // Create combined results from both sources
        const uniqueIds = new Set();
        
        // First add all AniList results
        results.combined = [...results.anilist];
        
        // Track all AniList IDs to avoid duplicates
        results.anilist.forEach(item => uniqueIds.add(`anilist-${item.id}`));
        
        // Add TMDB TV results
        for (const item of results.tmdb.tv || []) {
            const tmdbId = item.id;
            
            // Skip if we've already added this TMDB ID
            if (uniqueIds.has(`tmdb-${tmdbId}`)) continue;
            
            uniqueIds.add(`tmdb-${tmdbId}`);
            results.combined.push(item);
        }
        
        // Add TMDB movie results
        for (const item of results.tmdb.movies || []) {
            const tmdbId = item.id;
            
            // Skip if we've already added this TMDB ID
            if (uniqueIds.has(`tmdb-${tmdbId}`)) continue;
            
            uniqueIds.add(`tmdb-${tmdbId}`);
            results.combined.push(item);
        }
        
        // Sort by popularity - prioritize TMDB over AniList
        results.combined.sort((a, b) => {
            // Give TMDB results priority over AniList
            const aPriority = a.source === 'tmdb' ? 1000 : 0;
            const bPriority = b.source === 'tmdb' ? 1000 : 0;
            
            // First sort by source priority (TMDB first)
            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }
            
            // Then sort by popularity within each source
            return b.popularity - a.popularity;
        });
        
        res.json(results);
        
    } catch (error) {
        console.error('Combined trending anime error:', error);
        // Always return a valid structure even on error
        res.status(500).json({ 
            error: 'Failed to fetch trending anime', 
            details: error.message,
            anilist: [],
            tmdb: { movies: [], tv: [] },
            seasonal: [],
            combined: []
        });
    }
});

// Catch-all for 404 API routes
app.all('*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});


// Vercel exports the Express app
export default app;

// --- Local Development ---
if (process.env.NODE_ENV === 'development') {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`🚀 API server ready at http://localhost:${PORT}`);
    });
}

// Add new Shikimori API routes

// Shikimori API handling
app.get('/shikimori/anime/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[SHIKIMORI] Fetching anime details for ID ${id}`);
        
        const response = await fetch(`https://shikimori.one/api/animes/${id}`, {
            headers: { 
                'User-Agent': 'Fylm Streaming App/1.0',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Shikimori API error: ${response.status}`);
        }
        
        const animeData = await response.json();
        
        // Transform to standardized format
        const transformedData = {
            id: animeData.id,
            title: animeData.russian || animeData.name,
            name: animeData.russian || animeData.name,
            original_title: animeData.name,
            overview: animeData.description,
            poster_path: animeData.image?.original || animeData.image?.preview,
            backdrop_path: null, // Shikimori doesn't provide backdrop images
            vote_average: animeData.score,
            first_air_date: animeData.aired_on,
            status: animeData.status,
            episodes_count: animeData.episodes,
            episodes_aired: animeData.episodes_aired,
            kind: animeData.kind,
            source_provider: API_PROVIDERS.SHIKIMORI,
            seasons: [
                {
                    id: 1,
                    name: 'Season 1',
                    season_number: 1,
                    episode_count: animeData.episodes || 0
                }
            ]
        };
        
        res.json(transformedData);
    } catch (error) {
        console.error(`[SHIKIMORI] Error fetching anime details: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.get('/shikimori/anime/:id/episodes', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[SHIKIMORI] Fetching episodes for anime ID ${id}`);
        
        const response = await fetch(`https://shikimori.one/api/animes/${id}/episodes`, {
            headers: { 
                'User-Agent': 'Fylm Streaming App/1.0',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Shikimori API error: ${response.status}`);
        }
        
        const episodesData = await response.json();
        
        // Transform to standardized format
        const transformedEpisodes = episodesData.map(episode => ({
            id: `${id}-${episode.episode}`,
            name: episode.name || `Episode ${episode.episode}`,
            episode_number: episode.episode,
            season_number: 1, // Shikimori treats all as season 1
            overview: '',
            still_path: episode.image || null,
            air_date: episode.airdate
        }));
        
        res.json({
            season_number: 1,
            name: "Season 1",
            episodes: transformedEpisodes
        });
    } catch (error) {
        console.error(`[SHIKIMORI] Error fetching episodes: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.get('/shikimori/anime/:id/recommendations', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[SHIKIMORI] Fetching recommendations for anime ID ${id}`);
        
        const response = await fetch(`https://shikimori.one/api/animes/${id}/similar`, {
            headers: { 
                'User-Agent': 'Fylm Streaming App/1.0',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Shikimori API error: ${response.status}`);
        }
        
        const recommendationsData = await response.json();
        
        // Transform to standardized format
        const transformedRecommendations = recommendationsData.map(anime => ({
            id: anime.id,
            title: anime.russian || anime.name,
            name: anime.russian || anime.name,
            poster_path: anime.image?.original || anime.image?.preview,
            media_type: 'anime',
            source_provider: API_PROVIDERS.SHIKIMORI,
            vote_average: anime.score
        }));
        
        res.json({ results: transformedRecommendations });
    } catch (error) {
        console.error(`[SHIKIMORI] Error fetching recommendations: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

app.get('/shikimori/search', async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }
        
        console.log(`[SHIKIMORI] Searching for anime: ${query}`);
        
        const response = await fetch(`https://shikimori.one/api/animes?search=${encodeURIComponent(query)}&limit=20`, {
            headers: { 
                'User-Agent': 'Fylm Streaming App/1.0',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Shikimori API error: ${response.status}`);
        }
        
        const searchResults = await response.json();
        
        // Transform to standardized format
        const transformedResults = searchResults.map(anime => ({
            id: anime.id,
            title: anime.russian || anime.name,
            name: anime.russian || anime.name,
            poster_path: anime.image?.original || anime.image?.preview,
            media_type: 'anime',
            source_provider: API_PROVIDERS.SHIKIMORI,
            vote_average: anime.score
        }));
        
        res.json({ results: transformedResults });
    } catch (error) {
        console.error(`[SHIKIMORI] Error searching for anime: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// ID mapping service
app.get('/mapping/anilist-to-shikimori/:anilistId', async (req, res) => {
    try {
        const { anilistId } = req.params;
        console.log(`[MAPPING] Mapping AniList ID ${anilistId} to Shikimori ID`);
        
        const response = await fetch(`https://find-my-anime.dtimur.de/api/anilist/${anilistId}`, {
            headers: { 
                'User-Agent': 'Fylm Streaming App/1.0',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Mapping API error: ${response.status}`);
        }
        
        const mappingData = await response.json();
        
        if (!mappingData.shikimori) {
            return res.status(404).json({ error: 'No Shikimori ID found for this AniList ID' });
        }
        
        res.json({ 
            anilist_id: parseInt(anilistId),
            shikimori_id: mappingData.shikimori,
            other_mappings: mappingData
        });
    } catch (error) {
        console.error(`[MAPPING] Error mapping IDs: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Existing code continues below...