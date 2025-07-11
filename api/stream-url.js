export const runtime = 'edge';

// Named export for GET requests - Vercel requirement
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  const source = searchParams.get('source') || 'videasy';
  const season = searchParams.get('season');
  const episode = searchParams.get('episode');
  const dub = searchParams.get('dub');
  const progress = searchParams.get('progress');

  console.log('Stream URL request:', { type, id, source, season, episode, dub, progress });

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (!id || !type) {
    return new Response(JSON.stringify({ message: 'Missing required parameters: id and type' }), {
      status: 400,
      headers,
    });
  }

  try {
    let streamData = null;
    let availableSources = ['videasy', 'vidsrc', 'embedsu'];
    let lastError = null;

    const sourceFunctions = {
      videasy: getVideasyStream,
      vidsrc: getVidSrcStream,
      embedsu: getEmbedSuStream,
      consumet: getConsumetStream,
    };

    try {
      if (sourceFunctions[source]) {
        console.log(`Attempting to get stream from ${source}...`);
        streamData = await sourceFunctions[source](type, id, season, episode, dub, progress);
        console.log(`Successfully got stream from ${source}`);
      } else {
        throw new Error(`Source '${source}' is not supported.`);
      }
    } catch (error) {
      console.error(`Error with primary source ${source}:`, error.message);
      lastError = error;

      const fallbackSources = availableSources.filter(s => s !== source);
      for (const fallbackSource of fallbackSources) {
        try {
          console.log(`Trying fallback source: ${fallbackSource}...`);
          streamData = await sourceFunctions[fallbackSource](type, id, season, episode, dub, progress);
          if (streamData) {
            console.log(`Successfully got stream from fallback source: ${fallbackSource}`);
            break;
          }
        } catch (fallbackError) {
          console.error(`Fallback source ${fallbackSource} also failed:`, fallbackError.message);
          lastError = fallbackError;
        }
      }
    }

    if (!streamData) {
      return new Response(JSON.stringify({
        message: 'All streaming sources are currently unavailable. Please try again later.',
        availableSources,
        currentSource: source,
        error: lastError?.message || 'Unknown error',
        retryAfter: 300,
      }), {
        status: 503,
        headers,
      });
    }

    return new Response(JSON.stringify({
      ...streamData,
      currentSource: source,
      availableSources
    }), {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error('Stream URL error:', error);
    return new Response(JSON.stringify({ 
      message: 'Internal Server Error', 
      error: error.message,
      retryAfter: 60,
    }), {
      status: 500,
      headers,
    });
  }
}

// Handle OPTIONS requests (preflight)
export async function OPTIONS(req) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

async function getConsumetStream(type, id, season, episode, dub) {
  try {
    // Use an environment variable for the Consumet API URL.
    // Fallback to localhost for local development if not set.
    const consumetBaseUrl = process.env.VITE_CONSUMET_API_URL || 'http://localhost:3000';
    let url;

    // This logic assumes a similar URL structure to the other providers.
    // This may need to be adjusted based on the actual consumet API routes.
    if (type === 'movie') {
        url = `${consumetBaseUrl}/movies/flixhq/${id}`;
    } else if (type === 'anime') {
        // Example: /anime/gogoanime/watch/spy-x-family-episode-1?server=gogocdn
        // This requires more specific logic based on anime title which we don't have here.
        // For now, we will construct a placeholder URL that needs to be verified.
        // A more robust solution would involve searching consumet by TMDB ID.
        url = `${consumetBaseUrl}/anime/gogoanime/watch/${id}-episode-${episode}`;
    } else { // tv
        url = `${consumetBaseUrl}/movies/flixhq/watch?episodeId=${episode}&mediaId=${id}&server=upcloud`
    }
    
    // We can't directly use the consumet stream URL as it provides JSON data.
    // This function should ideally fetch that JSON, extract the video URL,
    // and return it as a direct source. This is a simplified placeholder.
    console.log(`Generated Consumet URL (requires further processing): ${url}`);
    
    // For now, let's assume we need to fetch the real stream URL from consumet
    const consumetResponse = await fetch(url);
    const data = await consumetResponse.json();

    if (data.sources && data.sources.length > 0) {
      return {
        url: data.sources[0].url, // Return the first source URL
        isDirectSource: true,
        qualities: data.sources.map(s => ({ quality: s.quality, url: s.url })),
        provider: 'consumet'
      };
    } else {
      throw new Error('Consumet did not return any valid sources.');
    }

  } catch (error) {
    console.error('Error generating Consumet stream:', error);
    throw new Error(`Consumet stream generation failed: ${error.message}`);
  }
}

async function getVideasyStream(type, id, season, episode, dub, progress) {
  // Add timeout and error handling for Videasy
  const baseUrl = 'https://player.videasy.net';
  let url;
  
  try {
    if (type === 'movie') {
      url = `${baseUrl}/movie/${id}`;
    } else if (type === 'tv') {
      if (!season || !episode) {
        throw new Error('Season and episode required for TV shows');
      }
      url = `${baseUrl}/tv/${id}/${season}/${episode}`;
      
      // Add Videasy features for TV shows
      const params = new URLSearchParams({
        nextEpisode: 'true',
        autoplayNextEpisode: 'true', // Enable autoplay for seamless episode progression
        episodeSelector: 'true',
        color: 'e50914' // Netflix red
      });
      
      // Add progress parameter for resume functionality
      if (progress && parseInt(progress) > 0) {
        params.set('progress', progress);
        console.log(`Adding resume progress: ${progress} seconds`);
      }
      
      url += `?${params.toString()}`;
    } else if (type === 'anime') {
      if (episode) {
        url = `${baseUrl}/anime/${id}/${episode}`;
        const params = new URLSearchParams();
        
        if (dub === 'true') {
          params.set('dub', 'true');
        }
        
        // Add progress parameter for resume functionality
        if (progress && parseInt(progress) > 0) {
          params.set('progress', progress);
          console.log(`Adding resume progress: ${progress} seconds`);
        }
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
      } else {
        url = `${baseUrl}/anime/${id}`;
        const params = new URLSearchParams();
        
        if (dub === 'true') {
          params.set('dub', 'true');
        }
        
        if (progress && parseInt(progress) > 0) {
          params.set('progress', progress);
        }
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
      }
    }
    
    // Test if the URL is accessible (optional health check)
    // For now, we'll just return the URL without testing to avoid additional delays
    console.log(`Generated Videasy URL: ${url}`);
    
    return {
      url,
      isDirectSource: false,
      qualities: [],
      features: type === 'tv' ? ['nextEpisode', 'autoplayNextEpisode', 'episodeSelector'] : [],
      provider: 'videasy'
    };
  } catch (error) {
    console.error('Error generating Videasy stream:', error);
    throw new Error(`Videasy stream generation failed: ${error.message}`);
  }
}

async function getVidSrcStream(type, id, season, episode, progress) {
  try {
    const baseUrl = 'https://vidsrc.to/embed';
    let url;
    
    if (type === 'movie') {
      url = `${baseUrl}/movie/${id}`;
    } else {
      if (!season || !episode) {
        throw new Error('Season and episode required for TV shows');
      }
      url = `${baseUrl}/tv/${id}/${season}/${episode}`;
    }
    
    // Add progress parameter if available (VidSrc may or may not support it)
    if (progress && parseInt(progress) > 0) {
      const params = new URLSearchParams({ t: progress }); // 't' is a common parameter for time
      url += `?${params.toString()}`;
      console.log(`Added progress parameter to VidSrc: ${progress} seconds`);
    }
    
    console.log(`Generated VidSrc URL: ${url}`);
    
    return {
      url,
      isDirectSource: false,
      qualities: [],
      provider: 'vidsrc'
    };
  } catch (error) {
    console.error('Error generating VidSrc stream:', error);
    throw new Error(`VidSrc stream generation failed: ${error.message}`);
  }
}

async function getEmbedSuStream(type, id, season, episode, progress) {
  try {
    const baseUrl = 'https://embed.su/embed';
    let url;
    
    if (type === 'movie') {
      url = `${baseUrl}/movie/${id}`;
    } else {
      if (!season || !episode) {
        throw new Error('Season and episode required for TV shows');
      }
      url = `${baseUrl}/tv/${id}/${season}/${episode}`;
    }
    
    // Add progress parameter if available (EmbedSu may or may not support it)
    if (progress && parseInt(progress) > 0) {
      const params = new URLSearchParams({ time: progress }); // 'time' parameter for resume
      url += `?${params.toString()}`;
      console.log(`Added progress parameter to EmbedSu: ${progress} seconds`);
    }
    
    console.log(`Generated EmbedSu URL: ${url}`);
    
    return {
      url,
      isDirectSource: false,
      qualities: [],
      provider: 'embedsu'
    };
  } catch (error) {
    console.error('Error generating EmbedSu stream:', error);
    throw new Error(`EmbedSu stream generation failed: ${error.message}`);
  }
}

export default handler;