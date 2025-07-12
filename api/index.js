import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import { URL } from 'url'; // For robust URL handling
import { Readable } from 'node:stream';

// Load environment variables
dotenv.config();

const app = express();

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

const STREAMING_PROVIDER_URL = process.env.STREAMING_PROVIDER_URL || 'https://player.videasy.net';
console.log(`✅ Streaming provider URL set to: ${STREAMING_PROVIDER_URL}`);


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

        let finalUrl;
        const baseUrl = STREAMING_PROVIDER_URL.endsWith('/') ? STREAMING_PROVIDER_URL.slice(0, -1) : STREAMING_PROVIDER_URL;

        switch (type) {
            case 'movie':
                finalUrl = `${baseUrl}/movie/${id}`;
                break;
            case 'tv':
                if (!season || !episode) {
                    return res.status(400).json({ error: true, message: 'Missing "season" or "episode" for TV shows.' });
                }
                finalUrl = `${baseUrl}/tv/${id}/${season}/${episode}`;
                break;
            case 'anime':
                 if (!episode) {
                    return res.status(400).json({ error: true, message: 'Missing "episode" for anime.' });
                }
                finalUrl = `${baseUrl}/anime/${id}/${episode}`;
                if (dub === 'true') {
                    finalUrl += '?dub=true';
                }
                break;
            default:
                return res.status(400).json({ error: true, message: `Unsupported type: "${type}"` });
        }

        // Add Videasy-specific parameters for enhanced features
        const params = new URLSearchParams();
        
        // Add existing dub parameter for anime if it wasn't already added
        if (type === 'anime' && dub === 'true' && !finalUrl.includes('?dub=true')) {
            params.append('dub', 'true');
        }
        
        // Add progress parameter for resume functionality
        if (progress && parseInt(progress) > 0) {
            params.append('progress', parseInt(progress));
        }
        
        // Add next episode button for TV shows and anime
        if ((type === 'tv' || type === 'anime') && nextEpisode === 'true') {
            params.append('nextEpisode', 'true');
        }
        
        // Add episode selector for TV shows and anime
        if ((type === 'tv' || type === 'anime') && episodeSelector === 'true') {
            params.append('episodeSelector', 'true');
        }
        
        // Add autoplay next episode for TV shows and anime
        if ((type === 'tv' || type === 'anime') && autoplayNextEpisode === 'true') {
            params.append('autoplayNextEpisode', 'true');
        }

        // Append parameters to URL
        if (params.toString()) {
            const separator = finalUrl.includes('?') ? '&' : '?';
            finalUrl += separator + params.toString();
        }

        console.log(`[Stream URL] Generated for ${type} ID ${id}: ${finalUrl}`);
        res.status(200).json({ url: finalUrl });

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