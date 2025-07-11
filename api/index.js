import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();

// --- Middleware ---
// Flexible CORS for development, strict for production
const isDevelopment = process.env.NODE_ENV === 'development';
const corsOptions = {
  origin: (origin, callback) => {
    if (isDevelopment) {
      // Allow all localhost origins in development
      const allowed = !origin || /^http:\/\/localhost(:\d+)?$/.test(origin);
      if (allowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // Use environment variable for production origins
      const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes

// Middleware to strip '/api' prefix for Vercel and local dev consistency
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    req.url = req.url.replace('/api', '');
  }
  next();
});

app.use(express.json());

// --- Environment Variables ---
const TMDB_API_KEY = process.env.TMDB_API_KEY;
if (!TMDB_API_KEY) {
    console.error("🔴 TMDB API key is missing. Please set TMDB_API_KEY in your environment.");
} else {
    console.log("✅ TMDB API key loaded successfully");
}

// --- API Routes ---

// 1. Image Proxy
app.get('/image-proxy', async (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) {
        return res.status(400).json({ error: 'Image URL is required' });
    }
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            // Try to get error text, but don't fail if it's not there
            const errorText = await response.text().catch(() => 'No error text available');
            console.error(`Image proxy failed to fetch image. Status: ${response.status}`, { url: imageUrl, error: errorText });
            return res.status(response.status).json({ error: `Failed to fetch image: ${response.statusText}`, details: errorText });
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        res.set('Content-Type', response.headers.get('content-type'));
        res.send(buffer);
    } catch (error) {
        console.error('Image proxy error:', { url: imageUrl, error: error.message });
        res.status(500).json({ error: 'Failed to proxy image', details: error.message });
    }
});


// 2. Stream URL Generator
app.get('/stream-url', async (req, res) => {
    try {
        const { id, s, e } = req.query;
        if (!id) {
            return res.status(400).json({ error: true, message: 'Missing "id" parameter (TMDB ID).' });
        }

        let streamUrl = `https://www.videasy.net/player?id=${id}`;
        if (s && e) {
            streamUrl += `&s=${s}&e=${e}`;
        }

        console.log(`[Stream URL] Generated for TMDB ID ${id}: ${streamUrl}`);
        res.status(200).json({ url: streamUrl });

    } catch (error) {
        console.error('[Stream URL] Error generating stream URL:', error);
        res.status(500).json({
            error: true,
            message: 'Failed to generate stream URL.',
            details: error.message
        });
    }
});


// 3. TMDB Catch-all Proxy
app.get('/tmdb/*', async (req, res) => {
    // Ensure response is always JSON
    res.setHeader('Content-Type', 'application/json');

    if (!TMDB_API_KEY) {
        return res.status(500).json({ error: true, message: "Server is missing TMDB API key." });
    }

    try {
        const urlParts = req.url.split('?');
        const tmdbPath = urlParts[0].replace('/tmdb/', '');
        const queryString = urlParts.length > 1 ? urlParts[1] : '';
        
        const params = new URLSearchParams(queryString);
        params.set('api_key', TMDB_API_KEY);
        if (!params.has('language')) {
            params.set('language', 'en-US');
        }

        const tmdbUrl = `https://api.themoviedb.org/3/${tmdbPath}?${params.toString()}`;
        console.log(`[TMDB Proxy] Forwarding to: ${tmdbUrl}`);

        const tmdbResponse = await fetch(tmdbUrl);
        const responseText = await tmdbResponse.text();
        const { status, headers } = tmdbResponse;
        const contentType = headers.get('content-type');

        console.log(`[TMDB Proxy] Upstream Status: ${status}`);
        console.log(`[TMDB Proxy] Upstream Content-Type: ${contentType}`);
        console.log(`[TMDB Proxy] Upstream Body (first 300 chars): ${responseText.substring(0, 300)}`);
        
        if (!tmdbResponse.ok) {
             console.error(`[TMDB Proxy] Upstream error. Status: ${status}`, { url: tmdbUrl, response: responseText });
        }

        // Always attempt to parse, but have a fallback
        try {
            const data = JSON.parse(responseText);
            return res.status(status).json(data);
        } catch (e) {
            console.error('[TMDB Proxy] Response was not JSON, sending error payload.', { body: responseText });
            // If parsing fails, it means TMDB returned non-JSON (like an HTML error page)
            return res.status(status || 502).json({
                error: true,
                message: 'The TMDB API returned an unexpected, non-JSON response.',
                upstream_status: status,
                details: responseText.substring(0, 500) // Include a snippet of the response
            });
        }

    } catch (error) {
        console.error('[TMDB Proxy] Fatal proxy error:', error);
        res.status(500).json({ 
            error: true, 
            message: 'A fatal error occurred in the TMDB proxy.', 
            details: error.message 
        });
    }
});


// Vercel exports the Express app
export default app;

// --- Local Development ---
// This block will only run if the script is executed directly (e.g., `node api/index.js`)
// It will not run when imported by Vercel for serverless deployment.
if (process.env.NODE_ENV === 'development') {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
        console.log(`🚀 API server ready at http://localhost:${PORT}`);
    });
} 