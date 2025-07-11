import cors from 'cors';
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = 3001;

// --- Middleware ---
app.use(cors({ 
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));
app.use(express.json());

// --- Environment Variables ---
const TMDB_API_KEY = process.env.TMDB_API_KEY;
if (!TMDB_API_KEY) {
    console.error("🔴 TMDB API key is missing. Please set TMDB_API_KEY in your environment.");
    console.error("🔴 Current TMDB_API_KEY value:", TMDB_API_KEY);
    // This is a fatal error for the server's functionality, but we won't process.exit
    // to allow the server to start and potentially serve other routes if any.
} else {
    console.log("✅ TMDB API key loaded successfully");
}

// --- API Routes ---

// 1. Image Proxy
app.get('/api/image-proxy', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) {
        return res.status(400).send('Image URL is required');
    }
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const buffer = await response.buffer();
        res.set('Content-Type', response.headers.get('content-type'));
        res.send(buffer);
    } catch (error) {
        console.error('Image proxy error:', error);
        res.status(500).send('Failed to proxy image');
    }
});

// 2. Stream URL
app.get('/api/stream-url', async (req, res) => {
    const { type, id, source, season, episode, dub } = req.query;
    const videasyUrl = `https://player.videasy.net/player?type=${type}&id=${id}&season=${season}&episode=${episode}&autonext=true&autoplay=true`;
    
    // For now, we only support Videasy in the local dev server.
    // This can be expanded later if needed.
    if (source !== 'videasy') {
        return res.status(400).json({ message: 'Only videasy source is supported in local development.' });
    }
    
    res.json({
        url: videasyUrl,
        isDirectSource: false,
        currentSource: 'videasy',
        availableSources: ['videasy']
    });
});

// 3. TMDB Catch-all Proxy
app.get('/api/tmdb/*', async (req, res) => {
    if (!TMDB_API_KEY) {
        return res.status(500).json({ message: "Server is missing TMDB API key." });
    }
    const path = req.params[0];
    const queryString = new URLSearchParams(req.query).toString();
    const tmdbUrl = `https://api.themoviedb.org/3/${path}?api_key=${TMDB_API_KEY}&language=en-US&${queryString}`;
    
    try {
        const response = await fetch(tmdbUrl);
        if (!response.ok) {
            // Forward the error response from TMDB
            const errorBody = await response.text();
            console.error(`TMDB API error on ${tmdbUrl}: ${response.status} ${response.statusText}`, errorBody);
            return res.status(response.status).send(errorBody);
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('TMDB proxy error:', error);
        res.status(500).json({ message: 'Failed to fetch from TMDB' });
    }
});


// --- Server ---
app.listen(port, () => {
    console.log(`🌲 Local development server listening at http://localhost:${port}`);
});

export default app; 