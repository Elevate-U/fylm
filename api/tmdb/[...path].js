export const runtime = 'edge';

function jsonResponse(status, data, headers = {}) {
    const defaultHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json',
    };
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...defaultHeaders, ...headers },
    });
}

// Named export for GET requests - this is the current Vercel requirement
export async function GET(req) {
    console.log(`[TMDB_PROXY_LOG] Received GET request: ${req.url}`);
    
    const headersObject = {};
    req.headers.forEach((value, key) => {
        headersObject[key] = value;
    });
    console.log('[TMDB_PROXY_LOG] Request headers:', JSON.stringify(headersObject, null, 2));

    try {
        const API_KEY = process.env.TMDB_API_KEY;
        if (!API_KEY) {
            console.error('TMDB_API_KEY environment variable is not set');
            return jsonResponse(500, {
                error: 'TMDB_API_KEY not configured on the server.',
                message: 'The TMDB_API_KEY environment variable must be set in the Vercel project settings.'
            });
        }

        const requestUrl = new URL(req.url);
        const tmdbPath = requestUrl.pathname.replace('/api/tmdb', '');

        if (!tmdbPath) {
            console.error('[TMDB_PROXY_LOG] Error: API path is missing in the URL.', { fullUrl: req.url });
            return jsonResponse(400, { error: 'No API path provided in the URL. Example: /api/tmdb/movie/popular' });
        }
        
        console.log(`[TMDB_PROXY_LOG] Constructed TMDB path: ${tmdbPath}`);

        // Build the final TMDB API URL
        const url = new URL(`https://api.themoviedb.org/3${tmdbPath}`);
        url.searchParams.set('api_key', API_KEY);

        // Forward all original query parameters to the TMDB API
        for (const [key, value] of requestUrl.searchParams.entries()) {
            url.searchParams.set(key, value);
        }

        console.log(`[TMDB_PROXY_LOG] Forwarding TMDB request to: ${url.toString()}`);
        console.log('[TMDB_PROXY_LOG] Request query:', requestUrl.search);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.error(`[TMDB_PROXY_LOG] Request to ${url.toString()} timed out after 9.5s.`);
            controller.abort();
        }, 9500);

        let tmdbResponse;
        try {
            tmdbResponse = await fetch(url.toString(), {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'FreeStream-App/1.0',
                    'Accept': 'application/json'
                }
            });
        } finally {
            clearTimeout(timeoutId);
        }

        // If the response from TMDB is not successful, parse its error and forward it
        if (!tmdbResponse.ok) {
            console.error(`[TMDB_PROXY_LOG] TMDB API error: ${tmdbResponse.status} ${tmdbResponse.statusText}`);
            let errorData;
            try {
                // TMDB often provides a JSON error body
                errorData = await tmdbResponse.json();
                console.error('[TMDB_PROXY_LOG] TMDB error body:', JSON.stringify(errorData, null, 2));
            } catch (e) {
                const textError = await tmdbResponse.text();
                console.error('[TMDB_PROXY_LOG] TMDB non-JSON error body:', textError);
                // If not, use the plain text body
                errorData = { message: textError || tmdbResponse.statusText };
            }

            return jsonResponse(tmdbResponse.status, {
                error: 'An error occurred with the upstream TMDB API.',
                tmdb_status: tmdbResponse.status,
                tmdb_error: errorData,
                requested_url: url.toString()
            });
        }

        const data = await tmdbResponse.json();

        // Set cache headers for successful responses
        const cacheHeaders = {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        };

        console.log(`[TMDB_PROXY_LOG] Successfully proxied request for: ${tmdbPath}. Status: 200.`);
        return jsonResponse(200, data, cacheHeaders);

    } catch (error) {
        console.error('[TMDB_PROXY_LOG] TMDB proxy handler critical error:', error);
        // This is a catch-all for any unexpected errors in the function
        return jsonResponse(500, {
            message: 'Internal Server Error in API proxy.',
            error: error.message,
        });
    }
}

// Handle OPTIONS requests (preflight)
export async function OPTIONS(req) {
    console.log('[TMDB_PROXY_LOG] Responding to OPTIONS preflight request.');
    return new Response(null, {
        status: 204, // Use 204 No Content for preflight responses
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400', // Cache preflight for 1 day
        },
    });
} 