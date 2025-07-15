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
        anime: (id, s, e) => `/anime/${id}/${e}`, // Videasy uses just the episode for anime shows
        animeMovie: (id) => `/movie/${id}` // Videasy treats anime movies as regular movies
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
            case 'anime':
                if (season && episode) { // This indicates an anime series with episodes
                    path = sourceConfig.anime(id, season, episode, imdbId);
                } else { // This indicates an anime movie
                    path = sourceConfig.animeMovie(id, imdbId);
                }
                break;
            default:
                return res.status(400).json({ error: true, message: `Unsupported type: "${type}"` });
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


// 3. Robust TMDB Catch-all Proxy
app.get('/tmdb/*', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');

    if (!TMDB_API_KEY) {
        return res.status(503).json({ error: true, message: "Server is not configured: Missing TMDB API key." });
    }

    try {
        const tmdbPath = req.params[0];
        const params = new URLSearchParams(req.query);
        params.set('api_key', TMDB_API_KEY);
        if (!params.has('language')) {
            params.set('language', 'en-US');
        }
        
        const tmdbUrl = `https://api.themoviedb.org/3/${tmdbPath}?${params.toString()}`;
        console.log(`[TMDB Proxy] Requesting: ${tmdbUrl}`);

        const tmdbResponse = await fetch(tmdbUrl);

        res.status(tmdbResponse.status);
        tmdbResponse.headers.forEach((value, name) => {
            if (!['content-encoding', 'transfer-encoding'].includes(name.toLowerCase())) {
                res.setHeader(name, value);
            }
        });

        const responseBody = await tmdbResponse.text();
        
        if (!tmdbResponse.ok) {
            console.error(`[TMDB Proxy] Upstream error from TMDB. Status: ${tmdbResponse.status}`, { url: tmdbUrl, body: responseBody.substring(0, 500) });
        }
        
        res.send(responseBody);

    } catch (error) {
        console.error('[TMDB Proxy] Fatal proxy error:', { message: error.message });
        res.status(500).json({
            error: true,
            message: 'An internal error occurred in the TMDB proxy.',
            details: error.message,
        });
    }
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