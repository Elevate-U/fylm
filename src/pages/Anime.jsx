import { h } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import { route } from 'preact-router';
import { useStore } from '../store';
import MovieCard from '../components/MovieCard';
import { getLastWatchedEpisodeWithProgress } from '../utils/watchHistory';
import { useAuth } from '../context/Auth';
import { API_BASE_URL } from '../config';
import LoadingSpinner from '../components/LoadingSpinner';
import './Home.css';
import './Anime.css';

const Anime = () => {
    const [loading, setLoading] = useState(true);
    const [trending, setTrending] = useState([]);
    const [airingToday, setAiringToday] = useState([]);
    const [onTheAir, setOnTheAir] = useState([]);
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

	const fetchTmdbData = useCallback(async (endpoint, retries = 3) => {
	    try {
	        const response = await fetch(`${API_BASE_URL}/tmdb/discover/tv?with_genres=16&${endpoint}`);
	        if (!response.ok) {
	            throw new Error(`TMDB API error: ${response.status}`);
	        }
	        const data = await response.json();
	        return data.results.map(item => ({ ...item, media_type: 'tv' }));
	    } catch (error) {
	        console.error(`Error fetching from TMDB endpoint ${endpoint}:`, error);
	        if (retries > 0) {
	            await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
	            return fetchTmdbData(endpoint, retries - 1);
	        }
	        return []; // Return empty array on failure
	    }
	}, []);

    const handleAnimeClick = useCallback(async (animeItem) => {
        if (user) {
            const nextEpisode = await getLastWatchedEpisodeWithProgress(user.id, animeItem.id);
            if (nextEpisode) {
                route(`/watch/tv/${animeItem.id}/season/${nextEpisode.season}/episode/${nextEpisode.episode}`);
            } else {
                // Default to S1E1 if no history
                route(`/watch/tv/${animeItem.id}/season/1/episode/1`);
            }
        } else {
            // Fallback for non-logged-in users
            route(`/tv/${animeItem.id}`);
        }
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
                const [
                    trendingData,
                    airingTodayData,
                    onTheAirData,
                    popularData,
                    topRatedData
                ] = await Promise.all([
                    fetchTmdbData('sort_by=popularity.desc&page=1'), // Trending
                    fetchTmdbData('air_date.gte=2024-01-01&sort_by=popularity.desc'), // Airing Today (example)
                    fetchTmdbData('sort_by=popularity.desc&page=2'), // On The Air (example)
                    fetchTmdbData('sort_by=popularity.desc&page=3'), // Popular
                    fetchTmdbData('sort_by=vote_average.desc&vote_count.gte=100') // Top Rated
                ]);

                setTrending(trendingData);
                setAiringToday(airingTodayData);
                setOnTheAir(onTheAirData);
                setPopular(popularData);
                setTopRated(topRatedData);

            } catch (error) {
                console.error('Error fetching anime data from TMDB:', error);
                setError('Failed to load anime data. Please refresh the page.');
            } finally {
                setLoading(false);
            }
        };

        fetchAllAnimeData();
    }, [fetchTmdbData]);

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
            
            {renderSection('Trending Now', trending)}
            {renderSection('Airing Today', airingToday)}
            {renderSection('Currently On The Air', onTheAir)}
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