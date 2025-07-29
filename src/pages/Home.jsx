import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { useStore } from '../store';
import MovieCard from '../components/MovieCard';
import { getContinueWatching } from '../utils/watchHistory';
import { useAuth } from '../context/Auth';
import { API_BASE_URL } from '../config';
import FeaturesShowcase from '../components/FeaturesShowcase';
import LoadingSpinner from '../components/LoadingSpinner';
import WelcomeMessage from '../components/WelcomeMessage';
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
    isFavorited
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

    const renderSection = (title, items, media_type) => {
        // A loading placeholder can be shown here if you have a generic loading state
        if (!items || items.length === 0) {
            return null;
        }
        
        const uniqueItems = items.filter((item, index, self) =>
            index === self.findIndex((t) => t.id === item.id)
        );

        return (
            <section class="home-section">
                <h2>{title}</h2>
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
                prime: '9',       // Amazon Prime Video  
                hbo: '1899',      // HBO Max
                disney: '337',    // Disney Plus
                apple: '350',     // Apple TV+
                paramount: '531'  // Paramount+
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
                    const [movieResponse, tvResponse] = await Promise.all([
                        fetch(`${API_BASE_URL}/tmdb/discover/movie?with_watch_providers=${providerId}&watch_region=US&sort_by=popularity.desc&page=1`),
                        fetch(`${API_BASE_URL}/tmdb/discover/tv?with_watch_providers=${providerId}&watch_region=US&sort_by=popularity.desc&page=1`)
                    ]);
                    
                    console.log(`Movie response status: ${movieResponse.status}, TV response status: ${tvResponse.status}`);
                    
                    if (!movieResponse.ok || !tvResponse.ok) {
                        throw new Error(`Failed to fetch content from TMDB - Movie: ${movieResponse.status}, TV: ${tvResponse.status}`);
                    }
                    
                    const movieData = await movieResponse.json();
                    const tvData = await tvResponse.json();
                    
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
                const response = await fetch(`${API_BASE_URL}/tmdb/discover/${mediaType}?with_watch_providers=${providerId}&watch_region=US&sort_by=popularity.desc&page=1`);
                
                console.log(`${mediaType} response status: ${response.status}`);
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${mediaType} content from TMDB - Status: ${response.status}`);
                }
                
                const data = await response.json();
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

            {mediaType === 'all' && renderSection('Trending This Week', trending)}
            
            {mediaType !== 'tv' && renderSection("Popular Movies", popularMovies, 'movie')}
            {mediaType !== 'tv' && renderSection("Now Playing Movies", nowPlayingMovies, 'movie')}
            {mediaType !== 'movie' && renderSection("Popular TV Shows", popularTv, 'tv')}
            
            {(mediaType === 'all' || mediaType === 'movie') && renderSection('Top Rated Movies', topRatedMovies, 'movie')}
            {(mediaType === 'all' || mediaType === 'movie') && renderSection('Upcoming Movies', upcomingMovies, 'movie')}
            
            {(mediaType === 'all' || mediaType === 'tv') && renderSection('Top Rated TV Shows', topRatedTv, 'tv')}
            {(mediaType === 'all' || mediaType === 'tv') && renderSection('Airing Today', airingTodayTv, 'tv')}
        </div>
    );
};

export default Home;
