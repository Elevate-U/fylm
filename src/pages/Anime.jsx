import { h } from 'preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { route } from 'preact-router';
import { useStore } from '../store';
import MovieCard from '../components/MovieCard';
import { getContinueWatching } from '../utils/watchHistory';
import { useAuth } from '../context/Auth';
import { API_BASE_URL } from '../config';
import LoadingSpinner from '../components/LoadingSpinner';
import './Home.css';
import './Anime.css';

const Anime = () => {
    const [loading, setLoading] = useState(true);
    const [topAnime, setTopAnime] = useState([]);
    const [popularAnime, setPopularAnime] = useState([]);
    const [trendingAnime, setTrendingAnime] = useState([]);
    const [currentlyAiring, setCurrentlyAiring] = useState([]);
    const [upcomingAnime, setUpcomingAnime] = useState([]);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [audioPreference, setAudioPreference] = useState(() => {
        return localStorage.getItem('anime-audio-preference') || 'subbed';
    });
    const [selectedAnime, setSelectedAnime] = useState(null);
    const [animeDetails, setAnimeDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [videasyAvailable, setVideasyAvailable] = useState(true);
    const [anilistAvailable, setAnilistAvailable] = useState(true);
    
    // Rate limiting state
    const rateLimitRef = useRef({
        requests: [],
        maxRequests: 90, // AniList allows 90 requests per minute
        timeWindow: 60000 // 1 minute
    });
    
    const { user } = useAuth();
    const { 
        continueWatching, 
        continueWatchingFetched, 
        fetchContinueWatching 
    } = useStore();

    useEffect(() => {
        if (user && !continueWatchingFetched) {
            fetchContinueWatching();
        }
    }, [user, continueWatchingFetched, fetchContinueWatching]);

    // Filter continue watching for only anime content
    const animeWatchHistory = continueWatching.filter(item => item.type === 'anime');

    // Rate limiting function for AniList API
    const checkRateLimit = useCallback(() => {
        const now = Date.now();
        const { requests, maxRequests, timeWindow } = rateLimitRef.current;
        
        // Remove requests older than the time window
        const recentRequests = requests.filter(time => now - time < timeWindow);
        rateLimitRef.current.requests = recentRequests;
        
        if (recentRequests.length >= maxRequests) {
            const oldestRequest = Math.min(...recentRequests);
            const waitTime = timeWindow - (now - oldestRequest);
            return { allowed: false, waitTime };
        }
        
        // Add current request timestamp
        rateLimitRef.current.requests.push(now);
        return { allowed: true, waitTime: 0 };
    }, []);

    // Enhanced AniList data fetching with rate limiting and error handling
    const fetchAniListData = async (query, variables = {}, retries = 3) => {
        // Check rate limit
        const rateCheck = checkRateLimit();
        if (!rateCheck.allowed) {
            console.warn(`Rate limit exceeded. Waiting ${rateCheck.waitTime}ms`);
            await new Promise(resolve => setTimeout(resolve, rateCheck.waitTime));
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(`${API_BASE_URL}/anilist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    query: query,
                    variables: variables
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                if (response.status === 429) {
                    // Rate limited by server
                    const retryAfter = response.headers.get('Retry-After') || 60;
                    console.warn(`Server rate limit hit. Retrying after ${retryAfter}s`);
                    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                    if (retries > 0) {
                        return fetchAniListData(query, variables, retries - 1);
                    }
                }
                throw new Error(`AniList API error: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.errors) {
                console.error('AniList GraphQL errors:', data.errors);
                throw new Error('GraphQL errors in response');
            }

            setAnilistAvailable(true);
            return data;
        } catch (error) {
            console.error('Error fetching from AniList:', error);
            
            if (error.name === 'AbortError') {
                setError('Request timed out. Please check your connection.');
            } else if (retries > 0) {
                console.log(`Retrying AniList request. ${retries} attempts remaining.`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries))); // Exponential backoff
                return fetchAniListData(query, variables, retries - 1);
            } else {
                setAnilistAvailable(false);
                setError('AniList service temporarily unavailable. Some features may be limited.');
            }
            return null;
        }
    };

    // Enhanced mapping function with comprehensive metadata
    const mapAniListToTMDBFormat = (media) => {
        return {
            id: media.id,
            title: media.title.english || media.title.romaji,
            name: media.title.english || media.title.romaji,
            poster_path: media.coverImage.large,
            overview: media.description ? media.description.replace(/<[^>]*>/g, '') : '',
            vote_average: media.averageScore ? media.averageScore / 10 : 0,
            popularity: media.popularity || 0,
            first_air_date: media.startDate ? `${media.startDate.year}-${media.startDate.month || '01'}-${media.startDate.day || '01'}` : '',
            media_type: 'anime',
            anilist_id: media.id,
            seasons: media.format === 'MOVIE' ? [] : [{ season_number: 1 }],
            // Enhanced metadata
            genres: media.genres || [],
            studios: media.studios?.nodes || [],
            episodes: media.episodes,
            duration: media.duration,
            status: media.status,
            format: media.format,
            season: media.season,
            seasonYear: media.seasonYear,
            source: media.source,
            hashtag: media.hashtag,
            trailer: media.trailer,
            isAdult: media.isAdult,
            meanScore: media.meanScore,
            favourites: media.favourites,
            tags: media.tags || [],
            relations: media.relations?.edges || [],
            nextAiringEpisode: media.nextAiringEpisode
        };
    };

    // Conditional routing logic for anime content detection
    const handleAnimeClick = useCallback((animeItem) => {
        // Check if this is anime content and redirect accordingly
        if (animeItem.media_type === 'anime' || animeItem.type === 'anime') {
            // Use AniList ID for routing if available
            const animeId = animeItem.anilist_id || animeItem.id;
            
            // Check if Videasy is available for streaming
            if (videasyAvailable) {
                // Redirect to watch page with anime type and AniList ID
                route(`/watch/anime/${animeId}`);
            } else {
                // Show fallback options or error
                setError('Streaming service temporarily unavailable. Please try again later.');
            }
        }
    }, [videasyAvailable]);

    // Audio preference persistence
    const handleAudioPreferenceChange = useCallback((preference) => {
        setAudioPreference(preference);
        localStorage.setItem('anime-audio-preference', preference);
    }, []);

    // Fetch detailed anime information
    const fetchAnimeDetails = async (animeId) => {
        if (!anilistAvailable) return null;

        setDetailsLoading(true);
        const detailQuery = `
            query ($id: Int) {
                Media(id: $id, type: ANIME) {
                    id
                    title {
                        romaji
                        english
                        native
                    }
                    description
                    startDate {
                        year
                        month
                        day
                    }
                    endDate {
                        year
                        month
                        day
                    }
                    season
                    seasonYear
                    type
                    format
                    status
                    episodes
                    duration
                    chapters
                    volumes
                    genres
                    synonyms
                    source
                    isAdult
                    meanScore
                    averageScore
                    popularity
                    favourites
                    hashtag
                    countryOfOrigin
                    isLicensed
                    airingSchedule {
                        nodes {
                            airingAt
                            timeUntilAiring
                            episode
                        }
                    }
                    trailer {
                        id
                        site
                        thumbnail
                    }
                    coverImage {
                        extraLarge
                        large
                        medium
                        color
                    }
                    bannerImage
                    tags {
                        id
                        name
                        description
                        category
                        rank
                        isGeneralSpoiler
                        isMediaSpoiler
                        isAdult
                    }
                    relations {
                        edges {
                            id
                            relationType
                            node {
                                id
                                title {
                                    romaji
                                    english
                                }
                                format
                                type
                                status
                                coverImage {
                                    medium
                                }
                            }
                        }
                    }
                    studios {
                        edges {
                            isMain
                            node {
                                id
                                name
                            }
                        }
                    }
                    nextAiringEpisode {
                        airingAt
                        timeUntilAiring
                        episode
                    }
                }
            }
        `;

        try {
            const data = await fetchAniListData(detailQuery, { id: animeId });
            if (data?.data?.Media) {
                setAnimeDetails(data.data.Media);
                return data.data.Media;
            }
        } catch (error) {
            console.error('Error fetching anime details:', error);
        } finally {
            setDetailsLoading(false);
        }
        return null;
    };

    // Check service availability
    const checkServiceAvailability = async () => {
        try {
            // Check Videasy availability
            const videasyCheck = await fetch(`${API_BASE_URL}/health/videasy`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            setVideasyAvailable(videasyCheck.ok);

            // Check AniList availability
            const anilistCheck = await fetch(`${API_BASE_URL}/health/anilist`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            setAnilistAvailable(anilistCheck.ok);
        } catch (error) {
            console.warn('Service availability check failed:', error);
            // Assume services are available if health check fails
        }
    };

    useEffect(() => {
        checkServiceAvailability();
    }, []);

    useEffect(() => {
        const fetchAnimeData = async () => {
            setLoading(true);
            setError(null);
            
            // Enhanced GraphQL queries with comprehensive metadata
            const trendingQuery = `
                query {
                    Page(page: 1, perPage: 20) {
                        media(type: ANIME, sort: TRENDING_DESC) {
                            id
                            title {
                                romaji
                                english
                                native
                            }
                            coverImage {
                                large
                                medium
                                color
                            }
                            bannerImage
                            description
                            averageScore
                            meanScore
                            popularity
                            favourites
                            startDate {
                                year
                                month
                                day
                            }
                            endDate {
                                year
                                month
                                day
                            }
                            format
                            status
                            episodes
                            duration
                            genres
                            season
                            seasonYear
                            source
                            hashtag
                            isAdult
                            trailer {
                                id
                                site
                                thumbnail
                            }
                            studios {
                                nodes {
                                    id
                                    name
                                }
                            }
                            tags {
                                id
                                name
                                rank
                            }
                            nextAiringEpisode {
                                airingAt
                                timeUntilAiring
                                episode
                            }
                        }
                    }
                }
            `;
            
            const popularQuery = `
                query {
                    Page(page: 1, perPage: 20) {
                        media(type: ANIME, sort: POPULARITY_DESC) {
                            id
                            title {
                                romaji
                                english
                                native
                            }
                            coverImage {
                                large
                                medium
                                color
                            }
                            bannerImage
                            description
                            averageScore
                            meanScore
                            popularity
                            favourites
                            startDate {
                                year
                                month
                                day
                            }
                            endDate {
                                year
                                month
                                day
                            }
                            format
                            status
                            episodes
                            duration
                            genres
                            season
                            seasonYear
                            source
                            hashtag
                            isAdult
                            trailer {
                                id
                                site
                                thumbnail
                            }
                            studios {
                                nodes {
                                    id
                                    name
                                }
                            }
                            tags {
                                id
                                name
                                rank
                            }
                            nextAiringEpisode {
                                airingAt
                                timeUntilAiring
                                episode
                            }
                        }
                    }
                }
            `;
            
            const topRatedQuery = `
                query {
                    Page(page: 1, perPage: 20) {
                        media(type: ANIME, sort: SCORE_DESC) {
                            id
                            title {
                                romaji
                                english
                                native
                            }
                            coverImage {
                                large
                                medium
                                color
                            }
                            bannerImage
                            description
                            averageScore
                            meanScore
                            popularity
                            favourites
                            startDate {
                                year
                                month
                                day
                            }
                            endDate {
                                year
                                month
                                day
                            }
                            format
                            status
                            episodes
                            duration
                            genres
                            season
                            seasonYear
                            source
                            hashtag
                            isAdult
                            trailer {
                                id
                                site
                                thumbnail
                            }
                            studios {
                                nodes {
                                    id
                                    name
                                }
                            }
                            tags {
                                id
                                name
                                rank
                            }
                            nextAiringEpisode {
                                airingAt
                                timeUntilAiring
                                episode
                            }
                        }
                    }
                }
            `;
            
            const currentlyAiringQuery = `
                query {
                    Page(page: 1, perPage: 20) {
                        media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
                            id
                            title {
                                romaji
                                english
                                native
                            }
                            coverImage {
                                large
                                medium
                                color
                            }
                            bannerImage
                            description
                            averageScore
                            meanScore
                            popularity
                            favourites
                            startDate {
                                year
                                month
                                day
                            }
                            endDate {
                                year
                                month
                                day
                            }
                            format
                            status
                            episodes
                            duration
                            genres
                            season
                            seasonYear
                            source
                            hashtag
                            isAdult
                            trailer {
                                id
                                site
                                thumbnail
                            }
                            studios {
                                nodes {
                                    id
                                    name
                                }
                            }
                            tags {
                                id
                                name
                                rank
                            }
                            nextAiringEpisode {
                                airingAt
                                timeUntilAiring
                                episode
                            }
                        }
                    }
                }
            `;
            
            const upcomingQuery = `
                query {
                    Page(page: 1, perPage: 20) {
                        media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC) {
                            id
                            title {
                                romaji
                                english
                                native
                            }
                            coverImage {
                                large
                                medium
                                color
                            }
                            bannerImage
                            description
                            averageScore
                            meanScore
                            popularity
                            favourites
                            startDate {
                                year
                                month
                                day
                            }
                            endDate {
                                year
                                month
                                day
                            }
                            format
                            status
                            episodes
                            duration
                            genres
                            season
                            seasonYear
                            source
                            hashtag
                            isAdult
                            trailer {
                                id
                                site
                                thumbnail
                            }
                            studios {
                                nodes {
                                    id
                                    name
                                }
                            }
                            tags {
                                id
                                name
                                rank
                            }
                            nextAiringEpisode {
                                airingAt
                                timeUntilAiring
                                episode
                            }
                        }
                    }
                }
            `;

            try {
                if (!anilistAvailable) {
                    setError('AniList service is currently unavailable. Please try again later.');
                    setLoading(false);
                    return;
                }

                const [trendingData, popularData, topRatedData, currentlyAiringData, upcomingData] = await Promise.all([
                    fetchAniListData(trendingQuery),
                    fetchAniListData(popularQuery),
                    fetchAniListData(topRatedQuery),
                    fetchAniListData(currentlyAiringQuery),
                    fetchAniListData(upcomingQuery)
                ]);

                if (trendingData?.data) {
                    setTrendingAnime(trendingData.data.Page.media.map(mapAniListToTMDBFormat));
                }
                
                if (popularData?.data) {
                    setPopularAnime(popularData.data.Page.media.map(mapAniListToTMDBFormat));
                }
                
                if (topRatedData?.data) {
                    setTopAnime(topRatedData.data.Page.media.map(mapAniListToTMDBFormat));
                }
                
                if (currentlyAiringData?.data) {
                    setCurrentlyAiring(currentlyAiringData.data.Page.media.map(mapAniListToTMDBFormat));
                }
                
                if (upcomingData?.data) {
                    setUpcomingAnime(upcomingData.data.Page.media.map(mapAniListToTMDBFormat));
                }

                setRetryCount(0); // Reset retry count on success
            } catch (error) {
                console.error('Error fetching anime data:', error);
                if (retryCount < 3) {
                    setRetryCount(prev => prev + 1);
                    setTimeout(() => {
                        fetchAnimeData();
                    }, 2000 * (retryCount + 1)); // Exponential backoff
                } else {
                    setError('Failed to load anime data after multiple attempts. Please refresh the page.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchAnimeData();
    }, [anilistAvailable, retryCount]);

    // Enhanced section rendering with deep linking support
    const renderSection = (title, items) => {
        if (!items || items.length === 0) {
            return null;
        }
        
        return (
            <section class="home-section">
                <h2>{title}</h2>
                <div class="scrolling-row">
                    {items.map(item => (
                        <MovieCard 
                            key={`${title}-${item.id}`} 
                            item={item} 
                            type="anime"
                            onClick={() => handleAnimeClick(item)}
                        />
                    ))}
                </div>
            </section>
        );
    };

    // Service status indicator
    const ServiceStatusIndicator = () => (
        <div class="service-status">
            <div class={`status-indicator ${anilistAvailable ? 'online' : 'offline'}`}>
                <span class="status-dot"></span>
                AniList: {anilistAvailable ? 'Online' : 'Offline'}
            </div>
            <div class={`status-indicator ${videasyAvailable ? 'online' : 'offline'}`}>
                <span class="status-dot"></span>
                Videasy: {videasyAvailable ? 'Online' : 'Offline'}
            </div>
        </div>
    );

    // Audio preference selector
    const AudioPreferenceSelector = () => (
        <div class="audio-preference-selector">
            <label htmlFor="audio-preference">Default Audio:</label>
            <select
                id="audio-preference"
                value={audioPreference}
                onChange={(e) => handleAudioPreferenceChange(e.target.value)}
                class="audio-select"
            >
                <option value="subbed">Subtitled (Sub)</option>
                <option value="dubbed">Dubbed (Dub)</option>
            </select>
            <small class="preference-note">
                This preference will be applied when watching anime episodes
            </small>
        </div>
    );

    // Error boundary and retry mechanism
    const ErrorDisplay = ({ error, onRetry }) => (
        <div class="error-container">
            <div class="error-message">
                <h3>Something went wrong</h3>
                <p>{error}</p>
                <div class="error-actions">
                    <button onClick={onRetry} class="retry-button">
                        Try Again
                    </button>
                    <button 
                        onClick={() => window.location.reload()} 
                        class="refresh-button"
                    >
                        Refresh Page
                    </button>
                </div>
            </div>
            <ServiceStatusIndicator />
        </div>
    );

    // Loading state with service status
    if (loading) {
        return (
            <div class="container home-page anime-page">
                <h1 class="main-title">Anime</h1>
                <ServiceStatusIndicator />
                <LoadingSpinner text="Loading anime data..." />
                {retryCount > 0 && (
                    <p class="retry-info">
                        Retrying... (Attempt {retryCount + 1}/4)
                    </p>
                )}
            </div>
        );
    }

    // Error state
    if (error && !anilistAvailable) {
        return (
            <div class="container home-page anime-page">
                <h1 class="main-title">Anime</h1>
                <ErrorDisplay 
                    error={error} 
                    onRetry={() => {
                        setError(null);
                        setRetryCount(0);
                        checkServiceAvailability();
                    }} 
                />
            </div>
        );
    }

    return (
        <div class="container home-page anime-page">
            <h1 class="main-title">Anime</h1>
            
            <div class="anime-controls">
                <AudioPreferenceSelector />
                <ServiceStatusIndicator />
            </div>
            
            {error && (
                <div class="warning-message">
                    <p>{error}</p>
                </div>
            )}
            
            {animeWatchHistory.length > 0 && (
                <section class="home-section">
                    <h2>Continue Watching</h2>
                    <div class="scrolling-row scrolling-row--compact">
                        {animeWatchHistory.map(item => (
                            <MovieCard 
                                key={`continue-watching-${item.id}`} 
                                item={item} 
                                type="anime" 
                                progress={item.progress_seconds}
                                duration={item.duration_seconds}
                                onClick={() => handleAnimeClick(item)}
                            />
                        ))}
                    </div>
                </section>
            )}
            
            {renderSection('Trending Anime', trendingAnime)}
            {renderSection('Currently Airing', currentlyAiring)}
            {renderSection('Popular Anime', popularAnime)}
            {renderSection('Top Rated Anime', topAnime)}
            {renderSection('Upcoming Anime', upcomingAnime)}
            
            {!loading && 
             trendingAnime.length === 0 && 
             popularAnime.length === 0 && 
             topAnime.length === 0 && 
             currentlyAiring.length === 0 && 
             upcomingAnime.length === 0 && (
                <div class="no-content">
                    <h3>No anime content available</h3>
                    <p>Please check your connection and try again.</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        class="retry-button"
                    >
                        Refresh Page
                    </button>
                </div>
            )}
        </div>
    );
};

export default Anime;