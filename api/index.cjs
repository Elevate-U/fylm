const express = require('express');
const fetch = require('node-fetch');
const app = express();

const API_KEY = process.env.TMDB_API_KEY || 'c1fcdb4fd429f4908bd731c904c37c68';
const API_BASE_URL = 'https://api.themoviedb.org/3';

// This will catch all requests, as vercel routes /api/tmdb/* here.
// The path in express will be /*
app.get('/*', async (req, res) => {
    const tmdbPath = req.path; // req.path will be like /movie/popular

    const url = new URL(`${API_BASE_URL}${tmdbPath}`);
    url.searchParams.set('api_key', API_KEY);
    
    // Forward any query params from the original request
    for (const key in req.query) {
        url.searchParams.set(key, req.query[key]);
    }

    console.log(`Forwarding request to: ${url}`);

    try {
        const tmdbResponse = await fetch(url.toString());
        const data = await tmdbResponse.json();

        // Forward TMDB's status code and response to the client
        res.status(tmdbResponse.status).json(data);
    } catch (error) {
        console.error('TMDB proxy error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Export the app instance for Vercel's serverless environment
module.exports = app; 