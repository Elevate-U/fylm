import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { useStore } from '../store';
import MovieCard from '../components/MovieCard';
import { getContinueWatching } from '../utils/watchHistory';
import { useAuth } from '../context/Auth';
import { API_BASE_URL } from '../config';
import FeaturesShowcase from '../components/FeaturesShowcase';
import LoadingSpinner from '../components/LoadingSpinner';
import WelcomeMessage from '../components/WelcomeMessage';
import SkeletonCard from '../components/SkeletonCard';
import './Home.css';

const Home = (props) => {
    const { 
        trending, 
        popularMovies, 
        popularTv, 
        topRatedMovies, 
        topRatedTv,
        upcomingMovies,
        nowPlayingMovies,
        airingTodayTv,
        fetchTrending,
        fetchPopularMovies,
        fetchPopularTv,
        fetchTopRatedMovies,
        fetchTopRatedTv,
        fetchUpcomingMovies,
        fetchNowPlayingMovies,
        fetchAiringTodayTv,
        continueWatching,
        continueWatchingFetched,
        fetchContinueWatching,
        fetchFavorites,
        favoritesFetched,
        isFavorited,
        trendingLoading,
        popularMoviesLoading,
        popularTvLoading,
        topRatedMoviesLoading,
        topRatedTvLoading,
        upcomingMoviesLoading,
        nowPlayingMoviesLoading,
        airingTodayTvLoading
    } = useStore();
    
    const { user } = useAuth(); // Add auth context
    const [mediaType, setMediaType] = useState('all');
    const [activeStreamingService, setActiveStreamingService] = useState('netflix');
    const [streamingContent, setStreamingContent] = useState({});
    const [loadingStreaming, setLoadingStreaming] = useState(false);
    const [activeGenre, setActiveGenre] = useState('28'); // Action genre ID
    const [genreContent, setGenreContent] = useState({});
    const [loadingGenre, setLoadingGenre] = useState(false);
    const [genres, setGenres] = useState([]);

    useEffect(() => {
        if (props.path === '/movies') {
            setMediaType('movie');
        } else if (props.path === '/tv') {
            setMediaType('tv');
        } else {
            setMediaType('all');
        }
    }, [props.path]);

    // Fetch genres when media type changes
    useEffect(() => {
        fetchGenres();
    }, [mediaType]);

    // Fetch content when active genre changes
    useEffect(() => {
        if (activeGenre) {
            fetchContentByGenre(activeGenre);
        }
    }, [activeGenre, mediaType]);

    // Fetch content when active streaming service changes
    useEffect(() => {
        if (activeStreamingService) {
            fetchContentByStreamingService(activeStreamingService);
        }
    }, [activeStreamingService, mediaType]);

    useEffect(() => {
        // Fetch initial data if not already in store
        fetchTrending();
        fetchPopularMovies();
        fetchPopularTv();
        fetchTopRatedMovies();
        fetchTopRatedTv();
        fetchUpcomingMovies();
        fetchNowPlayingMovies();
        fetchAiringTodayTv();
    }, [fetchTrending, fetchPopularMovies, fetchPopularTv, fetchTopRatedMovies, fetchTopRatedTv, fetchUpcomingMovies, fetchNowPlayingMovies, fetchAiringTodayTv]);

    useEffect(() => {
        if (user && !continueWatchingFetched) {
            fetchContinueWatching();
        }
    }, [user, continueWatchingFetched, fetchContinueWatching]);

    useEffect(() => {
        if (user && !favoritesFetched) {
            fetchFavorites();
        }
    }, [user, favoritesFetched, fetchFavorites]);

    const getCategoryFromTitle = (title) => {
        const titleMap = {
            'Trending This Week': 'trending',
            'Trending Movies': 'trending',
            'Popular Movies': 'popular',
            'Top Rated Movies': 'top-rated',
            'Upcoming Movies': 'upcoming',
            'Now Playing Movies': 'now-playing',
            'Trending TV Shows': 'trending',
            'Popular TV Shows': 'popular',
            'Top Rated TV Shows': 'top-rated',
            'Airing Today': 'airing-today',
            'On The Air': 'on-the-air'
        };
        return titleMap[title] || 'popular';
    };

    const handleSectionClick = (title, media_type) => {
        const category = getCategoryFromTitle(title);
        // Default to 'movie' if media_type is undefined, or use current mediaType state
        const type = media_type || (mediaType === 'all' ? 'movie' : mediaType);
        route(`/browse/${type}/${category}`);
    };

    const renderSection = (title, items, media_type, loading) => {
        if (loading) {
            return (
                <section class="home-section">
                    <div class="section-header">
                        <h2>{title}</h2>
                        <button class="view-all-btn" disabled>
                            View All <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                    <div class="scrolling-row">
                        {Array.from({ length: 10 }).map((_, index) => (
                            <SkeletonCard key={`skeleton-${title}-${index}`} />
                        ))}
                    </div>
                </section>
            );
        }

        if (!items || items.length === 0) {
            return null;
        }
        
        const uniqueItems = items.filter((item, index, self) =>
            index === self.findIndex((t) => t.id === item.id)
        );

        return (
            <section class="home-section">
                <div 
                    class="section-header clickable-header" 
                    onClick={() => handleSectionClick(title, media_type)}
                >
                    <h2>{title}</h2>
                    <button 
                        class="view-all-btn" 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSectionClick(title, media_type);
                        }}
                    >
                        View All <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div class="scrolling-row">
                    {uniqueItems.map(item => (
                        <MovieCard 
                            key={`${title}-${item.id}`} 
                            item={item} 
                            type={media_type || item.media_type}
                        />
                    ))}
                </div>
            </section>
        );
    };

    const getStreamingServiceName = (service) => {
        const serviceNames = {
            netflix: 'Netflix',
            prime: 'Prime Video',
            hbo: 'Max',
            disney: 'Disney+',
            apple: 'Apple TV+',
            paramount: 'Paramount+'
        };
        return serviceNames[service] || service;
    };

    // Fetch genres from TMDB
    const fetchGenres = async () => {
        try {
            // Use 'movie' or 'tv' for genre endpoint, not 'all'
            const genreType = mediaType === 'all' ? 'movie' : mediaType;
            const response = await fetch(`${API_BASE_URL}/tmdb/genre/${genreType}/list`);
            const data = await response.json();
            setGenres(data.genres || []);
            // Set first genre as active if none selected
            if (data.genres && data.genres.length > 0 && !activeGenre) {
                setActiveGenre(data.genres[0].id.toString());
            }
        } catch (error) {
            console.error('Error fetching genres:', error);
            setGenres([]);
        }
    };

    // Fetch content by genre
    const fetchContentByGenre = async (genreId) => {
        const cacheKey = `${mediaType}-${genreId}`;
        if (genreContent[cacheKey]) return; // Already fetched
        
        setLoadingGenre(true);
        try {
            let results = [];
            
            if (mediaType === 'all') {
                // For 'all' media type, fetch both movies and TV shows
                const [movieResponse, tvResponse] = await Promise.all([
                    fetch(`${API_BASE_URL}/tmdb/discover/movie?with_genres=${genreId}&sort_by=popularity.desc&page=1`),
                    fetch(`${API_BASE_URL}/tmdb/discover/tv?with_genres=${genreId}&sort_by=popularity.desc&page=1`)
                ]);
                
                const movieData = await movieResponse.json();
                const tvData = await tvResponse.json();
                
                // Add media_type to each item and combine
                const movies = (movieData.results || []).map(item => ({ ...item, media_type: 'movie' }));
                const tvShows = (tvData.results || []).map(item => ({ ...item, media_type: 'tv' }));
                
                // Combine and sort by popularity
                results = [...movies, ...tvShows]
                    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
                    .slice(0, 20); // Limit to 20 items
            } else {
                // Use specific media type for discover endpoint
                const response = await fetch(`${API_BASE_URL}/tmdb/discover/${mediaType}?with_genres=${genreId}&sort_by=popularity.desc&page=1`);
                const data = await response.json();
                results = (data.results || []).map(item => ({ ...item, media_type: mediaType }));
            }
            
            setGenreContent(prev => ({
                ...prev,
                [cacheKey]: results
            }));
        } catch (error) {
            console.error('Error fetching content by genre:', error);
            setGenreContent(prev => ({
                ...prev,
                [cacheKey]: []
            }));
        } finally {
            setLoadingGenre(false);
        }
    };

    // Fetch content by streaming service
    const fetchContentByStreamingService = async (service) => {
        const cacheKey = `${mediaType}-${service}`;
        if (streamingContent[cacheKey]) return; // Already fetched
        
        setLoadingStreaming(true);
        try {
            // TMDB streaming provider IDs (verified from TMDB API)
            const providerIds = {
                netflix: '8',     // Netflix
                prime: '119',     // Amazon Prime Video  
                hbo: '384',       // Max (formerly HBO Max)
                disney: '337',    // Disney Plus
                apple: '350',     // Apple TV+
                paramount: '531'  // Paramount+
            };

            // Dynamic resolver for provider IDs in case TMDB renames/changes them
            const resolveProviderId = async (svc, typeForProviders) => {
                try {
                    const listUrl = `${API_BASE_URL}/tmdb/watch/providers/${typeForProviders}?watch_region=US`;
                    const resp = await fetch(listUrl);
                    if (!resp.ok) return null;
                    const data = await resp.json();
                    const providers = data.results || [];
                    const nameSynonyms = {
                        netflix: ['Netflix'],
                        prime: ['Prime Video', 'Amazon Prime Video'],
                        hbo: ['Max', 'HBO Max'],
                        disney: ['Disney+', 'Disney Plus'],
                        apple: ['Apple TV+', 'Apple TV Plus'],
                        paramount: ['Paramount+', 'Paramount Plus']
                    };
                    const targets = nameSynonyms[svc] || [svc];
                    const match = providers.find(p => targets.some(t => (p.provider_name || '').toLowerCase() === t.toLowerCase()));
                    return match ? String(match.provider_id) : null;
                } catch (_) {
                    return null;
                }
            };
            
            const providerId = providerIds[service];
            if (!providerId) {
                throw new Error(`Unknown streaming service: ${service}`);
            }
            
            let results = [];
            
            if (mediaType === 'all') {
                // For 'all' media type, try both movies and TV shows and combine results using TMDB Discover API
                try {
                    console.log(`Fetching content for ${service} (${providerId}) - both movies and TV`);
                    const monetization = encodeURIComponent('flatrate|ads|free');
                    let [movieResponse, tvResponse] = await Promise.all([
                        fetch(`${API_BASE_URL}/tmdb/discover/movie?with_watch_providers=${providerId}&with_watch_monetization_types=${monetization}&watch_region=US&sort_by=popularity.desc&page=1`),
                        fetch(`${API_BASE_URL}/tmdb/discover/tv?with_watch_providers=${providerId}&with_watch_monetization_types=${monetization}&watch_region=US&sort_by=popularity.desc&page=1`)
                    ]);
                    
                    console.log(`Movie response status: ${movieResponse.status}, TV response status: ${tvResponse.status}`);
                    
                    if (!movieResponse.ok || !tvResponse.ok) {
                        throw new Error(`Failed to fetch content from TMDB - Movie: ${movieResponse.status}, TV: ${tvResponse.status}`);
                    }
                    
                    const movieData = await movieResponse.json();
                    const tvData = await tvResponse.json();

                    // If nothing found, attempt dynamic provider id resolve and refetch once
                    if ((!movieData.results || movieData.results.length === 0) && (!tvData.results || tvData.results.length === 0)) {
                        const dynamicMovieId = await resolveProviderId(service, 'movie');
                        const dynamicTvId = await resolveProviderId(service, 'tv');
                        const finalMovieId = dynamicMovieId || providerId;
                        const finalTvId = dynamicTvId || providerId;
                        console.log(`Retrying with resolved provider IDs movie=${finalMovieId}, tv=${finalTvId}`);
                        [movieResponse, tvResponse] = await Promise.all([
                            fetch(`${API_BASE_URL}/tmdb/discover/movie?with_watch_providers=${finalMovieId}&with_watch_monetization_types=${monetization}&watch_region=US&sort_by=popularity.desc&page=1`),
                            fetch(`${API_BASE_URL}/tmdb/discover/tv?with_watch_providers=${finalTvId}&with_watch_monetization_types=${monetization}&watch_region=US&sort_by=popularity.desc&page=1`)
                        ]);
                        const [movieRetry, tvRetry] = await Promise.all([movieResponse.json(), tvResponse.json()]);
                        movieData.results = movieRetry.results || [];
                        tvData.results = tvRetry.results || [];
                    }
                    
                    console.log(`Found ${movieData.results?.length || 0} movies and ${tvData.results?.length || 0} TV shows for ${service}`);
                    
                    // Add media_type to each item and combine
                    const movies = (movieData.results || []).map(item => ({ ...item, media_type: 'movie' }));
                    const tvShows = (tvData.results || []).map(item => ({ ...item, media_type: 'tv' }));
                    
                    // Combine and sort by popularity
                    results = [...movies, ...tvShows]
                        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
                        .slice(0, 20); // Limit to 20 items
                } catch (error) {
                    console.error('Error fetching combined content:', error);
                    results = [];
                }
            } else {
                // For specific media type, use that type with TMDB Discover API
                console.log(`Fetching ${mediaType} content for ${service} (${providerId})`);
                const monetization = encodeURIComponent('flatrate|ads|free');
                let response = await fetch(`${API_BASE_URL}/tmdb/discover/${mediaType}?with_watch_providers=${providerId}&with_watch_monetization_types=${monetization}&watch_region=US&sort_by=popularity.desc&page=1`);
                
                console.log(`${mediaType} response status: ${response.status}`);
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${mediaType} content from TMDB - Status: ${response.status}`);
                }
                
                let data = await response.json();
                // If empty, try dynamic provider resolution once
                if (!data.results || data.results.length === 0) {
                    const dynamicId = await resolveProviderId(service, mediaType);
                    if (dynamicId && dynamicId !== providerId) {
                        console.log(`Retrying ${mediaType} with resolved provider ID ${dynamicId}`);
                        response = await fetch(`${API_BASE_URL}/tmdb/discover/${mediaType}?with_watch_providers=${dynamicId}&with_watch_monetization_types=${monetization}&watch_region=US&sort_by=popularity.desc&page=1`);
                        if (response.ok) {
                            data = await response.json();
                        }
                    }
                }
                console.log(`Found ${data.results?.length || 0} ${mediaType} items for ${service}`);
                results = (data.results || []).map(item => ({ ...item, media_type: mediaType }));
            }
            
            console.log(`Setting streaming content for ${cacheKey}:`, results);
            setStreamingContent(prev => ({
                ...prev,
                [cacheKey]: results
            }));
        } catch (error) {
            console.error('Error fetching content by streaming service:', error);
            setStreamingContent(prev => ({
                ...prev,
                [cacheKey]: []
            }));
        } finally {
            setLoadingStreaming(false);
        }
    };

    const renderStreamingContent = (service) => {
        const cacheKey = `${mediaType}-${service}`;
        const content = streamingContent[cacheKey] || [];
        
        console.log(`Rendering streaming content for ${cacheKey}:`, content.length, 'items');

        if (loadingStreaming) {
            return (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                </div>
            );
        }

        if (!content || content.length === 0) {
            return (
                <div className="no-content">
                    <p>No content available for {getStreamingServiceName(service)}</p>
                </div>
            );
        }

        return content.map((item) => (
            <MovieCard 
                key={`${service}-${item.id}`} 
                item={item} 
                type={mediaType === 'all' ? item.media_type : mediaType}
            />
        ));
    };

    const renderGenreContent = (genreId) => {
        const cacheKey = `${mediaType}-${genreId}`;
        const content = genreContent[cacheKey] || [];

        if (loadingGenre) {
            return (
                <div className="loading-spinner">
                    <div className="spinner"></div>
                </div>
            );
        }

        if (!content || content.length === 0) {
            return (
                <div className="no-content">
                    <p>No content available for this genre</p>
                </div>
            );
        }

        return content.map((item) => (
            <MovieCard 
                key={`genre-${genreId}-${item.id}`} 
                item={item} 
                type={mediaType === 'all' ? (item.media_type || 'movie') : mediaType}
            />
        ));
    };

    return (
        <div class="container home-page">
            <h1 class="main-title">
                {mediaType === 'movie' && 'Movies'}
                {mediaType === 'tv' && 'TV Shows'}
                {mediaType === 'all' && 'Discover'}
            </h1>

            {/* Show Features Showcase for non-logged-in users */}
            {!user && mediaType === 'all' && (
                <>
                    <div class="guest-info-banner" style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '24px',
                        textAlign: 'center'
                    }}>
                        <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                            🎬 Start Streaming Instantly
                        </h3>
                        <p style={{ margin: '0', color: 'var(--text-secondary)' }}>
                            No account required! Click any movie or TV show to start watching immediately. 
                            <a href="/login" style={{ color: 'var(--accent-color)', textDecoration: 'none', marginLeft: '4px' }}>
                                Sign up
                            </a> to save favorites, track progress, and continue watching across devices.
                        </p>
                    </div>
                    <FeaturesShowcase />
                </>
            )}
            
            {/* Show Welcome Message for logged-in users */}
            {user && mediaType === 'all' && (
                <WelcomeMessage />
            )}

            {!continueWatchingFetched ? (
                <LoadingSpinner text="Loading your continue watching..." />
            ) : continueWatching.length > 0 && (
                <section class="home-section">
                    <h2>Continue Watching</h2>
                    <div class="scrolling-row scrolling-row--compact">
                        {continueWatching.map(item => (
                            <MovieCard 
                                key={`continue-watching-${item.type}-${item.id}`} 
                                item={item} 
                                type={item.type} 
                                progress={item.progress_seconds}
                                duration={item.duration_seconds}
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Streaming Services Section */}
            {mediaType === 'all' && (
                <section class="home-section streaming-services-section">
                    <div class="streaming-services-header">
                        <h2>Series on <span class="streaming-service-name">{getStreamingServiceName(activeStreamingService)}</span></h2>
                        <button 
                            class="view-all-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                route('/browse/tv/streaming');
                            }}
                        >
                            View All <i class="fas fa-arrow-right"></i>
                        </button>
                    </div>
                    <div class="streaming-services-tabs">
                        {['netflix', 'prime', 'hbo', 'disney', 'apple', 'paramount'].map(service => (
                            <button 
                                key={service}
                                class={`streaming-tab ${activeStreamingService === service ? 'active' : ''}`}
                                onClick={() => setActiveStreamingService(service)}
                            >
                                {getStreamingServiceName(service)}
                            </button>
                        ))}
                    </div>
                    <div class="streaming-content">
                        {loadingStreaming ? (
                            <LoadingSpinner text={`Loading ${getStreamingServiceName(activeStreamingService)} content...`} />
                        ) : (
                            <div class="scrolling-row">
                                {/* Placeholder content - you can replace this with actual API calls */}
                                {renderStreamingContent(activeStreamingService)}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Genres Section */}
            <section class="home-section genres-section">
                <div class="section-header">
                    <h2>Browse by Genre</h2>
                    <span class="genre-name">
                        {genres.find(g => g.id.toString() === activeGenre)?.name || 'Loading...'}
                    </span>
                    <button 
                        class="view-all-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            route('/browse/movie/genres');
                        }}
                    >
                        View All <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                
                <div class="genre-tabs-container">
                    <div class="genre-tabs">
                        {genres.slice(0, 8).map((genre) => (
                            <button
                                key={genre.id}
                                class={`genre-tab ${activeGenre === genre.id.toString() ? 'active' : ''}`}
                                onClick={() => setActiveGenre(genre.id.toString())}
                            >
                                {genre.name}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div class="genre-content">
                    <div class="scrolling-row">
                        {renderGenreContent(activeGenre)}
                    </div>
                </div>
            </section>

            {mediaType === 'all' && renderSection('Trending This Week', trending, undefined, trendingLoading)}
            
            {mediaType !== 'tv' && renderSection("Popular Movies", popularMovies, 'movie', popularMoviesLoading)}
            {mediaType !== 'tv' && renderSection("Now Playing Movies", nowPlayingMovies, 'movie', nowPlayingMoviesLoading)}
            {mediaType !== 'movie' && renderSection("Popular TV Shows", popularTv, 'tv', popularTvLoading)}
            
            {(mediaType === 'all' || mediaType === 'movie') && renderSection('Top Rated Movies', topRatedMovies, 'movie', topRatedMoviesLoading)}
            {(mediaType === 'all' || mediaType === 'movie') && renderSection('Upcoming Movies', upcomingMovies, 'movie', upcomingMoviesLoading)}
            
            {(mediaType === 'all' || mediaType === 'tv') && renderSection('Top Rated TV Shows', topRatedTv, 'tv', topRatedTvLoading)}
            {(mediaType === 'all' || mediaType === 'tv') && renderSection('Airing Today', airingTodayTv, 'tv', airingTodayTvLoading)}
        </div>
    );
};

export default Home;
