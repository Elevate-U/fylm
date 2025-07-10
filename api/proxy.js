const express = require('express');
const fetch = require('node-fetch');
const NodeCache = require('node-cache');
const app = express();
const port = 3001;

const API_KEY = process.env.TMDB_API_KEY || 'c1fcdb4fd429f4908bd731c904c37c68';
const API_BASE_URL = 'https://api.themoviedb.org/3';

// Initialize cache:
// - stdTTL: (default time-to-live) seconds for cache entries. 1 hour.
// - checkperiod: How often to check for and delete expired entries. 10 minutes.
const tmdbCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
// Cache to store the resolved media type for anime IDs ('tv' or 'movie')
const animeTypeCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });
const consumetCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
const animeInfoCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });
const anilistIdCache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });


const getAnilistId = async (tmdbDetails) => {
    const tmdbId = tmdbDetails.id;
    const cacheKey = `anilist-id-${tmdbId}`;
    const cachedId = anilistIdCache.get(cacheKey);
    if (cachedId) {
        console.log(`[ANILIST ID CACHE HIT] for TMDB ID ${tmdbId}: ${cachedId}`);
        return cachedId;
    }

    try {
        const originalTmdbTitle = tmdbDetails.name || tmdbDetails.title;
        let searchTitle = originalTmdbTitle;
        if (searchTitle.includes(':')) {
            searchTitle = searchTitle.split(':')[0].trim();
        }

        const searchUrl = `${CONSUMET_API_BASE}/meta/anilist/${encodeURIComponent(searchTitle)}`;
        console.log(`[ANILIST ID] Searching for anime with URL: ${searchUrl}`);
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) {
            console.error(`[ANILIST ID] Failed to search for title "${searchTitle}". Status: ${searchRes.status}`);
            return null;
        }
        const searchResults = await searchRes.json();
        
        if (!searchResults.results || searchResults.results.length === 0) {
            console.error(`[ANILIST ID] No results found on Consumet/Anilist for title: ${searchTitle}`);
            return null;
        }
        
        let animeDetails = searchResults.results.find(r => 
            (r.title.english && r.title.english.toLowerCase() === originalTmdbTitle.toLowerCase()) ||
            (r.title.romaji && r.title.romaji.toLowerCase() === originalTmdbTitle.toLowerCase())
        );

        if (!animeDetails) {
            let bestMatch = null;
            let highestScore = -1;
            const originalTitleWords = new Set(originalTmdbTitle.toLowerCase().split(/[\s:-]+/));
            const tmdbYear = tmdbDetails.release_date ? new Date(tmdbDetails.release_date).getFullYear() : (tmdbDetails.first_air_date ? new Date(tmdbDetails.first_air_date).getFullYear() : null);
            const availableResults = searchResults.results.filter(r => r.status && r.status.toLowerCase() !== 'not yet aired');

            for (const result of availableResults) {
                const titleToTest = result.title.english || result.title.romaji || '';
                if (!titleToTest) continue;
                const resultWords = new Set(titleToTest.toLowerCase().split(/[\s:-]+/));
                const intersection = new Set([...originalTitleWords].filter(x => resultWords.has(x)));
                let score = intersection.size;

                if (tmdbYear && result.releaseDate && tmdbYear === result.releaseDate) {
                    score += 5;
                }

                if (score > highestScore) {
                    highestScore = score;
                    bestMatch = result;
                }
            }
            animeDetails = bestMatch;
        }

        if (animeDetails && animeDetails.id) {
            console.log(`[ANILIST ID CACHE SET] TMDB ID ${tmdbId} -> Anilist ID ${animeDetails.id}`);
            anilistIdCache.set(cacheKey, animeDetails.id);
            return animeDetails.id;
        } else {
            console.error(`[ANILIST ID] No good match found on Consumet/Anilist for title: ${originalTmdbTitle}`);
            return null;
        }
    } catch (error) {
        console.error(`[ANILIST ID] Error fetching Anilist ID for "${tmdbDetails.name || tmdbDetails.title}":`, error);
        return null;
    }
};

const mediaIsAnime = async (id, type) => {
    if (type !== 'tv' && type !== 'movie') return { isAnime: false, details: null };

    const cacheKey = `${type}-${id}`;
    const cachedResult = animeInfoCache.get(cacheKey);
    if (cachedResult !== undefined) {
        // If we have a cached result, we still need the details.
        const detailsRes = await fetchAndCache(`${API_BASE_URL}/${type}/${id}?api_key=${API_KEY}`, `/${type}/${id}?api_key=${API_KEY}`);
        return { isAnime: cachedResult, details: detailsRes.ok ? detailsRes.data : null };
    }
    
    try {
        const detailsRes = await fetchAndCache(`${API_BASE_URL}/${type}/${id}?api_key=${API_KEY}`, `/${type}/${id}?api_key=${API_KEY}`);
        if (!detailsRes.ok) {
            animeInfoCache.set(cacheKey, false);
            return { isAnime: false, details: null };
        }
        const details = detailsRes.data;
        const isAnimation = details.genres && details.genres.some(g => g.name === 'Animation');
        const isJapanese = details.original_language === 'ja';
        const result = isAnimation && isJapanese;

        animeInfoCache.set(cacheKey, result);
        return { isAnime: result, details: details };
    } catch (e) {
        console.error("Error in mediaIsAnime:", e);
        return { isAnime: false, details: null };
    }
};

const discoverAndGetAnimeDetails = async (animeId) => {
    const cachedType = animeTypeCache.get(animeId);
    if (cachedType) {
        console.log(`[ANIME TYPE CACHE HIT] ID: ${animeId} is a '${cachedType}'`);
        const url = `${API_BASE_URL}/${cachedType}/${animeId}?api_key=${API_KEY}`;
        return fetchAndCache(url, `/${cachedType}/${animeId}?api_key=${API_KEY}`);
    }

    console.log(`[ANIME TYPE CACHE MISS] ID: ${animeId}. Discovering type...`);
    const tvUrl = `${API_BASE_URL}/tv/${animeId}?api_key=${API_KEY}`;
    const movieUrl = `${API_BASE_URL}/movie/${animeId}?api_key=${API_KEY}`;
    
    const response = await fetchFirstSuccessful([tvUrl, movieUrl]);

    if (response.ok) {
        const determinedType = response.url.includes('/tv/') ? 'tv' : 'movie';
        console.log(`[ANIME TYPE CACHE SET] ID: ${animeId} is a '${determinedType}'`);
        animeTypeCache.set(animeId, determinedType);
        
        // Use a consistent cache key format
        const cacheKey = `/${determinedType}/${animeId}?api_key=${API_KEY}`;
        tmdbCache.set(cacheKey, response);
    }
    
    return response;
};

app.use(express.json());

// Helper function to make and cache requests
const fetchAndCache = async (url, cacheKey) => {
    const cachedResponse = tmdbCache.get(cacheKey);
    if (cachedResponse) {
        console.log(`[CACHE HIT] for key: ${cacheKey}`);
        return cachedResponse;
    }

    console.log(`[CACHE MISS] for key: ${cacheKey}. Fetching from ${url}`);
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok) {
        tmdbCache.set(cacheKey, { ok: true, status: response.status, data });
    }

    return { ok: response.ok, status: response.status, data };
};

const CONSUMET_API_BASE = process.env.CONSUMET_API_URL || 'http://127.0.0.1:3000';

const getConsumetAnimeStream = async (tmdbDetails, season, episode) => {
    const tmdbId = tmdbDetails.id;
    const cacheKey = `consumet-${tmdbId}-s${season}-e${episode}`;
    const cached = consumetCache.get(cacheKey);
    if (cached) {
        console.log(`[CONSUMET CACHE HIT] for key: ${cacheKey}`);
        return cached;
    }

    try {
        const anilistId = await getAnilistId(tmdbDetails);

        if (!anilistId) {
            console.error(`[CONSUMET] Could not get Anilist ID for TMDB ID: ${tmdbId}`);
            return null;
        }

        console.log(`[CONSUMET] Best match found with Anilist ID: ${anilistId}`);

        // 3. Get anime episode list from Consumet
        const consumetDetailsUrl = `${CONSUMET_API_BASE}/meta/anilist/info/${anilistId}?provider=gogoanime`;
        console.log(`[CONSUMET] Fetching anime details from: ${consumetDetailsUrl}`);
        const consumetDetailsRes = await fetch(consumetDetailsUrl);
        const consumetDetails = await consumetDetailsRes.json();

        if (consumetDetails.status === 'Not yet aired' || !consumetDetails.episodes || consumetDetails.episodes.length === 0) {
            console.error(`[CONSUMET] Content "${tmdbDetails.name || tmdbDetails.title}" is not yet aired or has no episodes available on Consumet.`);
            return null;
        }

        const targetEpisode = consumetDetails.type === 'MOVIE' 
            ? consumetDetails.episodes[0]
            : consumetDetails.episodes.find(ep => Number(ep.number) === Number(episode));

        if (!targetEpisode) {
            console.error(`Could not find episode ${episode} for ${tmdbDetails.name || tmdbDetails.title} on Consumet.`);
            return null;
        }

        // 4. Get stream URLs for the episode
        const streamUrl = `${CONSUMET_API_BASE}/meta/anilist/watch/${targetEpisode.id}`;
        console.log(`[CONSUMET] Fetching stream URL from: ${streamUrl}`);
        const streamRes = await fetch(streamUrl);
        const streamData = await streamRes.json();
        console.log(`[CONSUMET] Stream data:`, JSON.stringify(streamData, null, 2));

        const result = {
            url: streamData.sources.find(s => s.quality === 'default' || s.quality === 'auto')?.url,
            isDirectSource: true,
            sources: streamData.sources,
            subtitles: streamData.subtitles,
            defaultSubtitle: streamData.subtitles?.find(s => s.lang === 'English'),
        };
        consumetCache.set(cacheKey, result);
        return result;

    } catch (error) {
        console.error("Error in getConsumetAnimeStream:", error);
        return null;
    }
};


app.get('/api/image/*', (req, res) => {
    const imagePath = req.path.replace('/api/image', '');

    if (imagePath.endsWith('undefined') || imagePath.endsWith('null')) {
        return res.status(400).send('Invalid image path');
    }
    
    const imageUrl = `https://image.tmdb.org${imagePath}`;

    fetch(imageUrl)
        .then(fetchRes => {
            if (!fetchRes.ok) {
                return res.status(fetchRes.status).send(fetchRes.statusText);
            }
            res.setHeader('Content-Type', fetchRes.headers.get('content-type'));
            res.setHeader('Content-Length', fetchRes.headers.get('content-length'));
            fetchRes.body.pipe(res);
        })
        .catch(error => {
            console.error('Image proxy error:', error);
            res.status(500).json({ message: 'Internal Server Error' });
        });
});

const STREAMING_SERVERS = {
    'videasy': {
        movie: (id) => `https://player.videasy.net/movie/${id}`,
        tv: (id, s, e) => `https://player.videasy.net/tv/${id}/${s}/${e}`,
        anime: (id, e, dub) => e ? `https://player.videasy.net/anime/${id}/${e}?dub=${dub}` : `https://player.videasy.net/anime/${id}?dub=${dub}`,
    },
    'vidsrc': {
        movie: (id) => `https://vidsrc.to/embed/movie/${id}`,
        tv: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
    },
    'superembed': {
        movie: (id) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`,
        tv: (id, s, e) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${s}&e=${e}`,
    },
    'autoembed': {
        movie: (id) => `https://autoembed.co/movie/tmdb/${id}`,
        tv: (id, s, e) => `https://autoembed.co/tv/tmdb/${id}-${s}-${e}`,
    },
};

// This endpoint provides the streaming URL for a given media type, ID, and source.
// It returns the stream URL and a list of available sources.
// Query Parameters:
// - type: 'movie' or 'tv' or 'anime'
// - id: The TMDB ID of the movie or TV show
// - season: (for TV shows) The season number
// - episode: (for TV shows) The episode number
// - source: The streaming source to use (e.g., 'vidsrc', 'superembed'). Defaults to 'videasy'.
app.get('/api/stream-url', async (req, res) => {
    const { type, id, season, episode, source = 'videasy', dub = 'false' } = req.query;

    if (!type || !id) {
        return res.status(400).json({ message: 'Missing or invalid required query parameters: type and id are required.' });
    }
    
    // The original type might be different from the resolved type for anime.
    const { isAnime, details: mediaDetails } = await mediaIsAnime(id, type);
    
    if (!mediaDetails) {
        return res.status(404).json({ message: 'Could not retrieve details for the given ID.' });
    }

    const allSources = [...Object.keys(STREAMING_SERVERS)];
    if (isAnime) {
        allSources.push('consumet');
    }

    if (source === 'consumet') {
        if (!isAnime) {
            return res.status(400).json({ message: 'Consumet source is only available for anime content.' });
        }
        const e = episode || 1;
        const s = season || 1;
        const streamData = await getConsumetAnimeStream(mediaDetails, s, e);

        if (streamData) {
            return res.json({ ...streamData, availableSources: allSources, currentSource: 'consumet' });
        } else {
            console.error(`[CONSUMET ANIME] Failed to get stream for TMDB ID: ${id}, S: ${s}, E: ${e}`);
            const fallbackSource = 'videasy'; 
            const server = STREAMING_SERVERS[fallbackSource];
            let fallbackStreamUrl = '';

            if (server && server.anime) {
                const anilistId = await getAnilistId(mediaDetails);
                if (anilistId) {
                    fallbackStreamUrl = server.anime(anilistId, e, dub);
                }
            }
            
            return res.json({
                url: fallbackStreamUrl,
                isDirectSource: false,
                error: 'Consumet source failed, fell back to Videasy.',
                currentSource: fallbackSource,
                availableSources: allSources
            });
        }
    }

    const server = STREAMING_SERVERS[source];
    if (!server) {
        return res.status(400).json({ message: 'Invalid source specified' });
    }

    let streamUrl;
    try {
        if (isAnime && server.anime) {
            console.log(`[STREAM URL] Detected anime for source '${source}'. TMDB ID: ${id}`);
            const anilistId = await getAnilistId(mediaDetails);
            if (anilistId) {
                const e = mediaDetails.number_of_episodes === 1 ? null : (episode || 1);
                streamUrl = server.anime(anilistId, e, dub);
                console.log(`[STREAM URL] Generated Videasy anime URL: ${streamUrl}`);
            } else {
                console.error(`[STREAM URL] Could not find Anilist ID for TMDB ID: ${id}. Cannot generate Videasy URL.`);
                // Do not fallback to movie/tv for anime if anilist ID fails, as it will be incorrect
            }
        } else if (type === 'movie' && server.movie) {
            streamUrl = server.movie(id);
        } else if (type === 'tv' && server.tv) {
            const s = season || 1;
            const e = episode || 1;
            streamUrl = server.tv(id, s, e);
        }
    } catch (error) {
        console.error(`Error generating stream URL for ${type} id ${id}:`, error);
        return res.status(500).json({ message: 'Internal Server Error while generating stream URL' });
    }

    if (!streamUrl) {
        return res.status(404).json({ message: `Could not generate a stream URL for the given parameters. The source '${source}' may not support the type '${type}' or required IDs could not be found.` });
    }
    
    res.json({ url: streamUrl, isDirectSource: false, availableSources: allSources, currentSource: source });
});

app.get('/api/tmdb/*', async (req, res) => {
    const path = req.path.replace('/api/tmdb', '');
    const searchParams = new URLSearchParams(req.query);
    searchParams.append('api_key', API_KEY);

    const cacheKey = `${path}?${searchParams.toString()}`;

    // Check cache first
    const cachedData = tmdbCache.get(cacheKey);
    if (cachedData) {
        console.log(`[CACHE HIT] for key: ${cacheKey}`);
        return res.status(cachedData.status).json(cachedData.data);
    }
    
    console.log(`[CACHE MISS] for key: ${cacheKey}`);

    try {
        const url = `${API_BASE_URL}${path}?${searchParams.toString()}`;
        const response = await fetch(url);
        const data = await response.json();
        const responseData = { ok: response.ok, status: response.status, data };

        if (responseData.ok) {
            tmdbCache.set(cacheKey, responseData);
        }
        
        res.status(responseData.status).json(responseData.data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Fetches a list of URLs in parallel and returns the first successful one.
const fetchFirstSuccessful = async (urls) => {
    try {
        const responses = await Promise.all(urls.map(url => fetch(url).then(res => ({res, url}))));
        
        const successfulResponse = responses.find(r => r.res.ok);
        const first404Response = responses.find(r => r.res.status === 404);
        
        const targetResponse = successfulResponse || first404Response || responses[0];

        if (!targetResponse) {
             return { ok: false, status: 404, data: { message: 'Not found on TMDB as movie or TV.' } };
        }

        const data = await targetResponse.res.json();
        return { ok: targetResponse.res.ok, status: targetResponse.res.status, data, url: targetResponse.url };

    } catch (error) {
        console.error("Error in fetchFirstSuccessful:", error);
        return { ok: false, status: 500, data: { message: 'Internal Server Error while fetching from TMDB.' } };
    }
};


app.listen(port, () => {
    console.log(`Proxy server listening at http://localhost:${port}`);
}); 
 