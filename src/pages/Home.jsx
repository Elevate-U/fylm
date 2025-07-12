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

    useEffect(() => {
        if (props.path === '/movies') {
            setMediaType('movie');
        } else if (props.path === '/tv') {
            setMediaType('tv');
        } else {
            setMediaType('all');
        }
    }, [props.path]);

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
        return (
            <section class="home-section">
                <h2>{title}</h2>
                <div class="scrolling-row">
                    {items.map(item => (
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

            {mediaType === 'all' && renderSection('Trending This Week', trending, 'movie')}
            
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
