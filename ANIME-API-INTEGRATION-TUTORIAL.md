# Anime API Integration Tutorial: Handling AniList and TMDB IDs

This tutorial explains how to properly integrate multiple anime databases (AniList and TMDB) in a React application, with proper ID differentiation and routing.

## Problem Overview

When building an anime streaming application, you often need to integrate multiple data sources:
- **AniList**: Anime-specific database with detailed anime metadata
- **TMDB (The Movie Database)**: General entertainment database that includes some anime content

The main challenge is that these databases use different ID systems, and mixing them can cause routing and data fetching issues.

## Solution Architecture

### 1. API Layer - Data Source Identification

In your API endpoint (`api/index.js`), explicitly mark the source of each item:

```javascript
// For AniList items
const anilistItem = {
    id: anilistData.id,
    anilist_id: anilistData.id, // Explicit AniList ID
    source: 'anilist',
    title: anilistData.title.romaji || anilistData.title.english,
    // ... other fields
};

// For TMDB items
const tmdbItem = {
    id: `tmdb-${tmdbData.id}`, // Prefixed to avoid conflicts
    tmdb_id: tmdbData.id, // Explicit TMDB ID
    media_type: tmdbData.media_type, // 'tv' or 'movie'
    source: 'tmdb',
    title: tmdbData.name || tmdbData.title,
    // ... other fields
};
```

### 2. Component Layer - Smart Routing

In your card components (`AnimeCard.jsx`), implement conditional routing based on the source:

```javascript
const handleCardClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    let link;
    
    if (item.source === 'tmdb') {
        // For TMDB content, route to the appropriate media type
        const mediaType = item.media_type || 'tv';
        const tmdbId = item.tmdb_id || item.id;
        link = `/watch/${mediaType}/${tmdbId}`;
        
        // For TV shows, add season/episode
        if (mediaType === 'tv') {
            link += `/season/1/episode/1`;
        }
    } else {
        // For AniList content, use anime route with AniList ID
        const animeId = item.anilist_id || item.id;
        link = `/watch/anime/${animeId}/season/1/episode/1`;
    }
    
    route(link);
};
```

### 3. Page Layer - Conditional Data Handling

In your anime listing page (`Anime.jsx`), handle different ID types when routing:

```javascript
const handleAnimeClick = useCallback(async (animeItem) => {
    let mediaType, itemId, routePath;
    
    if (animeItem.source === 'tmdb') {
        // For TMDB content
        mediaType = animeItem.media_type || 'tv';
        itemId = animeItem.tmdb_id || animeItem.id;
        routePath = `/watch/${mediaType}/${itemId}`;
        
        if (mediaType === 'tv') {
            // Check watch history with TMDB ID
            const nextEpisode = await getLastWatchedEpisodeWithProgress(user.id, itemId, mediaType);
            if (nextEpisode) {
                routePath += `/season/${nextEpisode.season}/episode/${nextEpisode.episode}`;
            } else {
                routePath += `/season/1/episode/1`;
            }
        }
    } else {
        // For AniList content
        mediaType = 'anime';
        itemId = animeItem.anilist_id || animeItem.id;
        routePath = `/watch/anime/${itemId}`;
        
        const nextEpisode = await getLastWatchedEpisodeWithProgress(user.id, itemId, 'anime');
        if (nextEpisode) {
            routePath += `/season/${nextEpisode.season}/episode/${nextEpisode.episode}`;
        } else {
            routePath += `/season/1/episode/1`;
        }
    }
    
    route(routePath);
}, [user]);
```

### 4. Watch Component - API Endpoint Selection

In your watch component (`Watch.jsx`), use different API endpoints based on the route type:

```javascript
useEffect(() => {
    if (type === 'anime') {
        // For anime route, use AniList ID with enhanced endpoint
        setMediaType('anime');
        setTmdbId(null);
    } else if (type === 'tv' || type === 'movie') {
        // For TMDB content, use TMDB ID directly
        setTmdbId(id);
        setMediaType(type);
    }
}, [id, type]);

// API calls
const detailsUrl = type === 'anime' 
    ? `${API_BASE_URL}/tmdb/anime/${id}/enhanced` // Uses AniList ID
    : `${API_BASE_URL}/tmdb/${mediaType}/${tmdbId}`; // Uses TMDB ID
```

## Key Implementation Points

### 1. ID Prefixing Strategy
- Use clear prefixes for combined data: `anilist-${id}` or `tmdb-${id}`
- Store original IDs in separate fields: `anilist_id`, `tmdb_id`
- Include `source` field to identify data origin

### 2. Route Structure
- Anime (AniList): `/watch/anime/{anilist_id}/season/{s}/episode/{e}`
- TV Shows (TMDB): `/watch/tv/{tmdb_id}/season/{s}/episode/{e}`
- Movies (TMDB): `/watch/movie/{tmdb_id}`

### 3. API Endpoint Mapping
- AniList content: Use enhanced endpoints that can convert IDs
- TMDB content: Use standard TMDB API endpoints
- Implement fallback mechanisms for ID conversion

### 4. Watch History Considerations
- Store watch history with the correct ID type
- When fetching history, use the appropriate ID for the content source
- Consider implementing ID mapping for cross-platform continuity

## Enhanced Features

### ID Conversion Service
Implement a service to convert between different ID systems:

```javascript
// In your API
app.get('/mapping/anilist-to-tmdb/:anilistId', async (req, res) => {
    try {
        const mapping = await findIdMapping(req.params.anilistId);
        res.json({ tmdb_id: mapping.tmdbId });
    } catch (error) {
        res.status(404).json({ error: 'Mapping not found' });
    }
});
```

### Unified Search
Implement search that works across both databases:

```javascript
const searchAllSources = async (query) => {
    const [anilistResults, tmdbResults] = await Promise.all([
        searchAniList(query),
        searchTMDB(query + ' anime')
    ]);
    
    return {
        anilist: anilistResults.map(item => ({ ...item, source: 'anilist' })),
        tmdb: tmdbResults.map(item => ({ ...item, source: 'tmdb' }))
    };
};
```

## Testing Your Implementation

1. **Test AniList Content**: Navigate to an anime from AniList data
2. **Test TMDB Content**: Navigate to an anime from TMDB data
3. **Test Watch History**: Ensure progress is saved with correct IDs
4. **Test Cross-Navigation**: Switch between different content sources
5. **Test Error Handling**: Verify fallbacks when ID conversion fails

## Common Pitfalls to Avoid

1. **ID Confusion**: Always check the source before using an ID
2. **Route Conflicts**: Ensure route patterns don't overlap
3. **API Mismatches**: Don't use AniList IDs with TMDB endpoints
4. **Watch History Mixing**: Keep track of which ID system was used for history
5. **Missing Fallbacks**: Always have fallback mechanisms for failed conversions

## Conclusion

By implementing proper ID differentiation and source tracking, you can successfully integrate multiple anime databases while maintaining clean routing and data consistency. The key is to always know the source of your data and route accordingly.