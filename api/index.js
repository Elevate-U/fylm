import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import { URL } from 'url'; // For robust URL handling
import { Readable } from 'node:stream';

// Load environment variables
dotenv.config();

const app = express();

// --- Source Configuration ---
const SOURCES_CONFIG = {
    'videasy': {
        baseUrl: 'https://player.videasy.net',
        movie: (id) => `/movie/${id}`,
        tv: (id, s, e) => `/tv/${id}/${s}/${e}`,
        anime: (id, s, e) => `/anime/${id}/${s}/${e}`,
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


// --- Environment Variable Checks ---
const TMDB_API_KEY = process.env.TMDB_API_KEY;
if (!TMDB_API_KEY) {
    console.error("🔴 Fatal: TMDB_API_KEY is not defined in the environment. The application cannot start.");
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1); // Exit if the key is missing in non-production environments
    }
} else {
    console.log("✅ TMDB API key loaded successfully");
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
        
        const svg = `<svg width="500" height="281" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="${randomColor}" />
            <text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">
                ${imageUrl.split('/').pop().replace('.jpg', '')}
            </text>
        </svg>`;
        
        return res.send(svg);
    }

    // Regular image URL handling
    try {
        const url = new URL(imageUrl);
        if (!['http:', 'https:',].includes(url.protocol)) {
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
            console.error(`Image proxy failed to fetch image. Status: ${response.status}`, { url: imageUrl, body: errorText.substring(0, 500) });
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
        console.error('Image proxy error:', { url: imageUrl, message: error.message });
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
                if (episode) {
                    path = sourceConfig.anime(anilistId, season, episode);
                    console.log(`[Stream URL] Using AniList ID ${anilistId} for anime series on Videasy, episode ${episode}`);
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
                        if (episode) {
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
                const response = await fetch(url);
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
        const queryParams = req.query;

        console.log(`[ANIME_HANDLER] Request for AniList ID ${anilistId}, subpath: '${subpath}'`);

        // Base query for anime details
        let query = `
            query ($id: Int) {
                Media(id: $id, type: ANIME) {
                    id
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
                                    averageScore
                                    genres
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
                        trailer {
                            id
                            site
                            thumbnail
                        }
                    }
                }
            `;
        } else if (subpath.startsWith('season/')) {
            // For season requests, we'll use the episodes data from AniList
            query = `
                query ($id: Int) {
                    Media(id: $id, type: ANIME) {
                        id
                        idMal
                        title {
                            romaji
                            english
                            native
                        }
                        episodes
                        coverImage {
                            extraLarge
                            large
                            medium
                        }
                        bannerImage
                        airingSchedule {
                            nodes {
                                episode
                                airingAt
                                timeUntilAiring
                            }
                        }
                    }
                }
            `;
        }

        // Fetch data from AniList
        const anilistResponse = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: query,
                variables: { id: parseInt(anilistId) }
            }),
        });

        if (!anilistResponse.ok) {
            throw new Error(`AniList API error: ${anilistResponse.status}`);
        }
        
        const anilistData = await anilistResponse.json();
        
        if (anilistData.errors) {
            console.error('AniList GraphQL errors:', anilistData.errors);
            return res.status(500).json({
                error: 'GraphQL errors in response',
                details: anilistData.errors
            });
        }

        if (!anilistData.data || !anilistData.data.Media) {
            return res.status(404).json({ error: 'Anime not found' });
        }

        const media = anilistData.data.Media;

        // Format response based on subpath
        let formattedResponse;
        
        if (subpath === 'recommendations') {
            // Format recommendations to match TMDB format
            const recommendations = media.recommendations?.nodes || [];
            formattedResponse = {
                results: recommendations.map(rec => ({
                    id: rec.mediaRecommendation.id,
                    title: rec.mediaRecommendation.title.english || rec.mediaRecommendation.title.romaji,
                    name: rec.mediaRecommendation.title.english || rec.mediaRecommendation.title.romaji,
                    // Use a special format for poster_path that the image proxy can handle
                    poster_path: `/anilist_images/${encodeURIComponent(rec.mediaRecommendation.coverImage.large)}`,
                    vote_average: rec.mediaRecommendation.averageScore / 10,
                    media_type: 'anime',
                    anilist_id: rec.mediaRecommendation.id
                }))
            };
        } else if (subpath === 'videos') {
            // Format videos to match TMDB format
            const trailer = media.trailer;
            formattedResponse = {
                results: trailer ? [{
                    id: trailer.id,
                    key: trailer.id,
                    site: trailer.site,
                    type: 'Trailer',
                    name: 'Official Trailer',
                    thumbnail: trailer.thumbnail
                }] : []
            };
        } else if (subpath.startsWith('season/')) {
            // Format season data to match TMDB format
            const seasonNumber = parseInt(req.params.seasonNumber) || 1;
            
            // Create episode list
            const episodes = [];
            const totalEpisodes = media.episodes || 0;
            
            // Get airing schedule if available
            const airingSchedule = media.airingSchedule?.nodes || [];
            
            // Try to get TMDB episode data if we can map this anime to TMDB
            let tmdbEpisodes = [];
            try {
                if (TMDB_API_KEY && media.idMal) {
                    // Get TMDB ID from MAL ID
                    const findResponse = await fetch(`https://api.themoviedb.org/3/find/${media.idMal}?api_key=${TMDB_API_KEY}&external_source=myanimelist_id`);
                    
                    if (findResponse.ok) {
                        const findData = await findResponse.json();
                        const tvResult = findData.tv_results?.[0];
                        
                        if (tvResult) {
                            // Get TMDB season data with episode images and names
                            const tmdbSeasonResponse = await fetch(`https://api.themoviedb.org/3/tv/${tvResult.id}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`);
                            
                            if (tmdbSeasonResponse.ok) {
                                const tmdbSeasonData = await tmdbSeasonResponse.json();
                                tmdbEpisodes = tmdbSeasonData.episodes || [];
                                console.log(`[ANIME_HANDLER] Found ${tmdbEpisodes.length} TMDB episodes for anime ${anilistId}`);
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn(`[ANIME_HANDLER] Could not fetch TMDB episode data for anime ${anilistId}:`, error.message);
            }
            
            // Create episode objects
            for (let i = 1; i <= totalEpisodes; i++) {
                const airingInfo = airingSchedule.find(node => node.episode === i);
                const tmdbEpisode = tmdbEpisodes.find(ep => ep.episode_number === i);
                
                // Determine the best image source with improved fallback logic
                let still_path;
                if (tmdbEpisode?.still_path) {
                    // Use TMDB episode image if available (just the path, not full URL)
                    still_path = tmdbEpisode.still_path;
                } else if (media.bannerImage) {
                    // Use anime's banner image as fallback
                    still_path = `/anilist_images/${encodeURIComponent(media.bannerImage)}`;
                } else if (media.coverImage?.extraLarge) {
                    // Use highest quality cover image
                    still_path = `/anilist_images/${encodeURIComponent(media.coverImage.extraLarge)}`;
                } else if (media.coverImage?.large) {
                    // Use large cover image as fallback
                    still_path = `/anilist_images/${encodeURIComponent(media.coverImage.large)}`;
                } else if (media.coverImage?.medium) {
                    // Use medium cover image as final AniList fallback
                    still_path = `/anilist_images/${encodeURIComponent(media.coverImage.medium)}`;
                } else {
                    // Use placeholder as last resort
                    still_path = `/placeholder/episode_${i}.jpg`;
                }
                
                // Create episode with proper name mapping for frontend compatibility
                const episodeName = tmdbEpisode?.name || `Episode ${i}`;
                const animeTitle = media.title?.english || media.title?.romaji || 'Unknown Anime';
                
                episodes.push({
                    id: `${media.id}_${seasonNumber}_${i}`,
                    name: episodeName,
                    title: episodeName, // Add title field for frontend compatibility
                    episode_number: i,
                    season_number: seasonNumber,
                    air_date: tmdbEpisode?.air_date || (airingInfo ? new Date(airingInfo.airingAt * 1000).toISOString().split('T')[0] : null),
                    overview: tmdbEpisode?.overview || `Episode ${i} of ${animeTitle}`,
                    still_path: still_path,
                    runtime: tmdbEpisode?.runtime || null,
                    vote_average: tmdbEpisode?.vote_average || null
                });
            }
            
            formattedResponse = {
                id: media.id,
                name: `Season ${seasonNumber}`,
                season_number: seasonNumber,
                episodes: episodes,
                _air_date: media.startDate ? `${media.startDate.year}-${media.startDate.month || '01'}-${media.startDate.day || '01'}` : null
            };
        } else {
            // Format basic anime details to match TMDB format
            formattedResponse = {
                id: media.id,
                title: media.title.english || media.title.romaji,
                name: media.title.english || media.title.romaji,
                original_name: media.title.native,
                overview: media.description ? media.description.replace(/<[^>]*>/g, '') : '',
                // Use a special format for image paths that the image proxy can handle
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
                studios: media.studios?.nodes?.map(studio => studio.name) || [],
                next_episode_to_air: media.nextAiringEpisode ? {
                    episode_number: media.nextAiringEpisode.episode,
                    air_date: new Date(media.nextAiringEpisode.airingAt * 1000).toISOString().split('T')[0]
                } : null
            };
        }

        // Add AniList ID and TMDB conversion info to the response
        res.json({
            ...formattedResponse,
            anilist_id: parseInt(anilistId),
            _conversion: {
                anilistId: parseInt(anilistId),
                source: 'anilist'
            }
        });

    } catch (error) {
        console.error(`[ANIME_HANDLER] Error for subpath '${subpath}':`, error);
        res.status(500).json({ error: 'Failed to process anime request.', details: error.message });
    }
};

app.get('/tmdb/anime/:anilistId', (req, res) => handleAnimeRequest(req, res));
app.get('/tmdb/anime/:anilistId/videos', (req, res) => handleAnimeRequest(req, res, 'videos'));
app.get('/tmdb/anime/:anilistId/recommendations', (req, res) => handleAnimeRequest(req, res, 'recommendations'));
app.get('/tmdb/anime/:anilistId/season/:seasonNumber', (req, res) => handleAnimeRequest(req, res, `season/${req.params.seasonNumber}`));


// 6. Generic TMDB API Proxy (for everything else)
// IMPORTANT: This MUST come AFTER specific routes like /tmdb/anime/:id
app.get('/tmdb/*', async (req, res) => {
    if (!TMDB_API_KEY) {
        console.warn('TMDB API key not configured, blocking request.');
        return res.status(500).json({ error: "TMDB API key not configured" });
    }

    try {
        let tmdbPath = req.url.substring(req.url.indexOf('/tmdb/') + 6);
        const tmdbApiUrl = `https://api.themoviedb.org/3/${tmdbPath}`;
        
        const finalUrl = new URL(tmdbApiUrl);
        finalUrl.searchParams.append('api_key', TMDB_API_KEY);

        console.log(`[TMDB_PROXY] Proxying to TMDB URL: ${finalUrl}`);
        
        const response = await fetch(finalUrl);
        
        if (!response.ok) {
            console.error(`[TMDB_PROXY] TMDB API error: ${response.status} for path ${tmdbPath}`);
            return res.status(response.status).json({ error: `TMDB API error: ${response.statusText}` });
        }
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('[TMDB_PROXY] Proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch from TMDB API', details: error.message });
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