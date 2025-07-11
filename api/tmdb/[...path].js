import fetch from 'node-fetch';

const API_KEY = process.env.TMDB_API_KEY;
const API_BASE_URL = 'https://api.themoviedb.org/3';

if (!API_KEY) {
    throw new Error('TMDB_API_KEY environment variable is not set.');
}

export default async function handler(req, res) {
    // Set CORS headers for all requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle OPTIONS requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Extract path from Vercel's dynamic routing
        const { path } = req.query;
        const tmdbPath = Array.isArray(path) ? '/' + path.join('/') : `/${path}`;

        const url = new URL(`${API_BASE_URL}${tmdbPath}`);
        url.searchParams.set('api_key', API_KEY);

        // Forward any additional query params from the original request
        for (const [key, value] of Object.entries(req.query)) {
            if (key !== 'path') {
                url.searchParams.set(key, value);
            }
        }

        console.log(`Forwarding TMDB request to: ${url}`);

        // Create timeout promise for compatibility
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('TMDB API request timeout')), 15000);
        });

        const fetchPromise = fetch(url.toString(), {
            headers: {
                'User-Agent': 'FreeStream-App/1.0'
            }
        });

        const tmdbResponse = await Promise.race([fetchPromise, timeoutPromise]);
        
        if (!tmdbResponse.ok) {
            console.error(`TMDB API error: ${tmdbResponse.status} ${tmdbResponse.statusText}`);
            return res.status(tmdbResponse.status).json({ 
                error: 'TMDB API error', 
                status: tmdbResponse.status,
                message: tmdbResponse.statusText 
            });
        }

        const data = await tmdbResponse.json();
        res.status(200).json(data);
    } catch (error) {
        console.error('TMDB proxy error:', error);
        res.status(500).json({ 
            message: 'Internal Server Error', 
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
} 