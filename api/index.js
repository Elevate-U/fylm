import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const apiRoutes = express.Router();

// TMDB Proxy Handler for local development
apiRoutes.all('/tmdb/*', async (req, res) => {
    console.log(`[LOCAL_PROXY_LOG] Received request: ${req.method} ${req.originalUrl}`);
    try {
        const API_KEY = process.env.TMDB_API_KEY;
        if (!API_KEY) {
            console.error('[LOCAL_PROXY_LOG] TMDB_API_KEY not configured');
            return res.status(500).json({ error: 'TMDB_API_KEY not configured' });
        }

        // Extract the path after /tmdb
        const tmdbPath = req.path.replace('/tmdb', '');
        console.log(`[LOCAL_PROXY_LOG] Constructed TMDB path: ${tmdbPath}`);

        const url = new URL(`https://api.themoviedb.org/3${tmdbPath}`);
        url.searchParams.set('api_key', API_KEY);

        // Forward query parameters
        for (const [key, value] of Object.entries(req.query)) {
            url.searchParams.set(key, value);
        }

        console.log(`[LOCAL_PROXY_LOG] Forwarding TMDB request to: ${url.toString()}`);

        const response = await fetch(url.toString());
        
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[LOCAL_PROXY_LOG] TMDB API error: ${response.status}`, errorBody);
            return res.status(response.status).json({ 
                error: 'TMDB API error', 
                status: response.status,
                details: errorBody
            });
        }

        const data = await response.json();
        console.log(`[LOCAL_PROXY_LOG] Successfully proxied request for: ${tmdbPath}. Status: 200.`);
        res.json(data);
    } catch (error) {
        console.error('[LOCAL_PROXY_LOG] TMDB proxy critical error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Stream URL route
const streamUrlModule = await import('./stream-url.js');
if (typeof streamUrlModule.default === 'function') {
    apiRoutes.all('/stream-url', streamUrlModule.default);
}

// Image proxy route for local development
const imageModule = await import('./image.js');
if (typeof imageModule.default === 'function') {
    app.all('/image-proxy', imageModule.default);
}

app.use('/api', apiRoutes);

// This will only run the server in a development environment.
// Vercel sets NODE_ENV to 'production' by default.
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`🚀 API server listening on port ${port}`);
    console.log(`📡 Frontend dev server should run on http://localhost:5173`);
    console.log(`🔑 Make sure TMDB_API_KEY is set in your .env file`);
  });
}

export default app; 