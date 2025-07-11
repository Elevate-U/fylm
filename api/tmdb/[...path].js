export default async function handler(req, res) {
    // Set CORS headers for all requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS requests (preflight)
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        console.log('TMDB Handler - Request received:', {
            method: req.method,
            url: req.url,
            query: req.query,
            headers: req.headers
        });

        // Check if API key is available
        const API_KEY = process.env.TMDB_API_KEY;
        if (!API_KEY) {
            console.error('TMDB_API_KEY environment variable is not set');
            return res.status(500).json({ 
                error: 'TMDB_API_KEY not configured',
                message: 'Please set TMDB_API_KEY environment variable in Vercel project settings',
                debug: {
                    url: req.url,
                    query: req.query,
                    method: req.method
                }
            });
        }

        // Extract path from Vercel's dynamic routing
        const { path } = req.query;
        let tmdbPath;
        
        console.log('Path extracted from query:', path);
        
        if (Array.isArray(path)) {
            tmdbPath = '/' + path.join('/');
        } else if (path) {
            tmdbPath = `/${path}`;
        } else {
            // If no path in query, try to extract from URL
            const urlPath = req.url.replace('/api/tmdb', '');
            if (urlPath && urlPath !== '/') {
                tmdbPath = urlPath;
            } else {
                console.error('No path provided in query or URL');
                return res.status(400).json({ 
                    error: 'No path provided',
                    debug: {
                        url: req.url,
                        query: req.query,
                        extractedPath: urlPath
                    }
                });
            }
        }

        // Build TMDB API URL
        const url = new URL(`https://api.themoviedb.org/3${tmdbPath}`);
        url.searchParams.set('api_key', API_KEY);

        // Forward any additional query params from the original request
        for (const [key, value] of Object.entries(req.query)) {
            if (key !== 'path') {
                url.searchParams.set(key, value);
            }
        }

        console.log(`Forwarding TMDB request to: ${url.toString()}`);

        // Make request to TMDB API
        const fetch = (await import('node-fetch')).default;
        const tmdbResponse = await fetch(url.toString(), {
            headers: {
                'User-Agent': 'FreeStream-App/1.0',
                'Accept': 'application/json'
            },
            timeout: 15000
        });
        
        if (!tmdbResponse.ok) {
            console.error(`TMDB API error: ${tmdbResponse.status} ${tmdbResponse.statusText}`);
            return res.status(tmdbResponse.status).json({ 
                error: 'TMDB API error', 
                status: tmdbResponse.status,
                message: tmdbResponse.statusText,
                requestedUrl: url.toString()
            });
        }

        const data = await tmdbResponse.json();
        
        // Set cache headers for better performance
        res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache
        
        console.log(`TMDB request successful for path: ${tmdbPath}`);
        return res.status(200).json(data);
    } catch (error) {
        console.error('TMDB proxy error:', error);
        return res.status(500).json({ 
            message: 'Internal Server Error', 
            error: error.message,
            timestamp: new Date().toISOString(),
            debug: {
                url: req.url,
                query: req.query,
                method: req.method
            }
        });
    }
} 