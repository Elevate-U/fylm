import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { route } from 'preact-router';
import { useStore } from '../store';
import MovieCard from '../components/MovieCard';
import AnimeCard from '../components/AnimeCard';
import { getLastWatchedEpisodeWithProgress } from '../utils/watchHistory';
import { useAuth } from '../context/Auth';
import { API_BASE_URL } from '../config';
import LoadingSpinner from '../components/LoadingSpinner';
import './Home.css';
import './Anime.css';

const Anime = () => {
    const [loading, setLoading] = useState(true);
    const [trending, setTrending] = useState([]);
    const [seasonal, setSeasonal] = useState([]);
    const [popular, setPopular] = useState([]);
    const [topRated, setTopRated] = useState([]);
    const [error, setError] = useState(null);
    const [videasyAvailable, setVideasyAvailable] = useState(true);

    const { user } = useAuth();
    const {
        continueWatching,
        continueWatchingFetched,
        fetchContinueWatching
    } = useStore();

    useEffect(() => {
        if (user && !continueWatchingFetched) {
            fetchContinueWatching(user.id);
        }
    }, [user, continueWatchingFetched, fetchContinueWatching]);

    const animeWatchHistory = continueWatching.filter(item => item.type === 'anime');

    const fetchCombinedAnimeData = useCallback(async (retries = 3) => {
	    try {
            const response = await fetch(`${API_BASE_URL}/trending/anime/combined`);
	        if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
	        }
            return response.json();
	    } catch (error) {
            console.error(`Error fetching combined anime data:`, error);
	        if (retries > 0) {
	            await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
                return fetchCombinedAnimeData(retries - 1);
	        }
            return null; // Return null on failure
	    }
	}, []);


    const handleAnimeClick = useCallback(async (animeItem) => {
        // Determine the correct routing based on source
        let mediaType, itemId, routePath;
        
        if (animeItem.source === 'tmdb') {
            // For TMDB content, use the appropriate media type and TMDB ID
            mediaType = animeItem.media_type || 'tv';
            itemId = animeItem.tmdb_id || animeItem.id;
            routePath = `/watch/${mediaType}/${itemId}`;
            
            // Only add season/episode for TV shows
            if (mediaType === 'tv') {
                if (user) {
                    const nextEpisode = await getLastWatchedEpisodeWithProgress(user.id, itemId, mediaType);
                    if (nextEpisode) {
                        routePath += `/season/${nextEpisode.season}/episode/${nextEpisode.episode}`;
                    } else {
                        routePath += `/season/1/episode/1`;
                    }
                } else {
                    routePath += `/season/1/episode/1`;
                }
            }
        } else {
            // For AniList content, use anime route with AniList ID
            mediaType = 'anime';
            itemId = animeItem.anilist_id || animeItem.id;
            routePath = `/watch/anime/${itemId}`;
            
            if (user) {
                const nextEpisode = await getLastWatchedEpisodeWithProgress(user.id, itemId, 'anime');
                if (nextEpisode) {
                    routePath += `/season/${nextEpisode.season}/episode/${nextEpisode.episode}`;
                } else {
                    routePath += `/season/1/episode/1`;
                }
            } else {
                routePath += `/season/1/episode/1`;
            }
        }
        
        route(routePath);
    }, [user]);

    const checkServiceAvailability = useCallback(async () => {
        try {
            const videasyCheck = await fetch(`${API_BASE_URL}/health/videasy`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });
            setVideasyAvailable(videasyCheck.ok);
        } catch (error) {
            console.warn('Videasy availability check failed:', error);
            setVideasyAvailable(false);
        }
    }, []);

    useEffect(() => {
        checkServiceAvailability();
    }, [checkServiceAvailability]);

    useEffect(() => {
        const fetchAllAnimeData = async () => {
            setLoading(true);
            setError(null);

            try {
                const combinedData = await fetchCombinedAnimeData();

                if (combinedData) {
                    // Filter out any items that don't have a poster
                    const filterValidItems = (items) => items.filter(item => item.poster_path);

                    setTrending(filterValidItems(combinedData.combined || []).slice(0, 20));
                    setSeasonal(filterValidItems(combinedData.seasonal || []));

                    // For popular and top-rated, we can sort the combined list
                    const allAnime = filterValidItems(combinedData.combined || []);
                    
                    // Sort by popularity
                    const popularAnime = [...allAnime].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
                    setPopular(popularAnime.slice(0, 20)); // Take top 20 popular

                    // Sort by vote average
                    const topRatedAnime = [...allAnime].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
                    setTopRated(topRatedAnime.slice(0, 20)); // Take top 20 rated
                } else {
                    throw new Error("Failed to fetch any anime data.");
                }

            } catch (error) {
                console.error('Error fetching anime data:', error);
                setError('Failed to load anime data. Please refresh the page.');
            } finally {
                setLoading(false);
            }
        };

        fetchAllAnimeData();
    }, [fetchCombinedAnimeData]);

    const getCategoryFromTitle = (title) => {
        const titleMap = {
            'Trending Now': 'trending',
            'This Season': 'seasonal',
            'Popular Anime': 'popular',
            'Top Rated Anime': 'top-rated'
        };
        return titleMap[title] || 'popular';
    };

    const handleSectionClick = (title) => {
        const category = getCategoryFromTitle(title);
        route(`/browse/anime/${category}`);
    };

    const renderSection = (title, items) => {
        if (!items || items.length === 0) {
            return null;
        }
        
        return (
            <section class="home-section">
                <div 
                    class="section-header clickable-header" 
                    onClick={() => handleSectionClick(title)}
                >
                    <h2>{title}</h2>
                    <button 
                        class="view-all-btn" 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSectionClick(title);
                        }}
                    >
                        View All <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div class="scrolling-row">
                    {items.map(item => (
                        <AnimeCard
                            key={`${title}-${item.id}`}
                            item={item}
                            onClick={() => handleAnimeClick(item)}
                        />
                    ))}
                </div>
            </section>
        );
    };

    const ServiceStatusIndicator = () => (
        <div class="service-status">
            <div class={`status-indicator ${videasyAvailable ? 'online' : 'offline'}`}>
                <span class="status-dot"></span>
                Videasy: {videasyAvailable ? 'Online' : 'Offline'}
            </div>
        </div>
    );

    const ErrorDisplay = ({ error, onRetry }) => (
        <div class="error-container">
            <div class="error-message">
                <h3>Something went wrong</h3>
                <p>{error}</p>
                <button onClick={onRetry} class="retry-button">Try Again</button>
            </div>
            <ServiceStatusIndicator />
        </div>
    );

    if (loading) {
        return (
            <div class="container home-page anime-page">
                <h1 class="main-title">Anime</h1>
                <ServiceStatusIndicator />
                <LoadingSpinner text={'Loading anime...'} />
            </div>
        );
    }

    if (error) {
        return (
            <div class="container home-page anime-page">
                <h1 class="main-title">Anime</h1>
                <ErrorDisplay
                    error={error}
                    onRetry={() => {
                        setError(null);
                        checkServiceAvailability();
                        // re-fetch data
                    }}
                />
            </div>
        );
    }

    return (
        <div class="container home-page anime-page">
            <h1 class="main-title">Anime</h1>
            
            <div class="anime-controls">
                <ServiceStatusIndicator />
            </div>
            
            {animeWatchHistory.length > 0 && (
                <section class="home-section">
                    <h2>Continue Watching</h2>
                    <div class="scrolling-row scrolling-row--compact">
                        {animeWatchHistory.map(item => (
                            <AnimeCard
                                key={`continue-watching-${item.id}`}
                                item={item}
                                progress={item.progress_seconds}
                                duration={item.duration_seconds}
                                onClick={() => handleAnimeClick(item)}
                            />
                        ))}
                    </div>
                </section>
            )}
            
            {renderSection('Trending Now', trending)}
            {renderSection('This Season', seasonal)}
            {renderSection('Popular Anime', popular)}
            {renderSection('Top Rated Anime', topRated)}
            
            {!loading &&
             trending.length === 0 &&
             popular.length === 0 &&
             topRated.length === 0 && (
                <div class="no-content">
                    <h3>No anime content available</h3>
                    <p>Please check your connection and try again.</p>
                </div>
            )}
        </div>
    );
};

export default Anime;