import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { useStore } from '../store';
import MovieCard from '../components/MovieCard';
import { getWatchHistory } from '../utils/watchHistory';
import { API_BASE_URL } from '../config';
import './Home.css';

const Home = () => {
    const { 
        trending, 
        popularMovies, 
        popularTv, 
        topRatedMovies, 
        topRatedTv,
        fetchTrending,
        fetchPopularMovies,
        fetchPopularTv,
        fetchTopRatedMovies,
        fetchTopRatedTv 
    } = useStore();
    
    const [watchHistory, setWatchHistory] = useState({});
    const [continueWatching, setContinueWatching] = useState([]);
    const [loadingContinueWatching, setLoadingContinueWatching] = useState(true);

    useEffect(() => {
        // Fetch initial data if not already in store
        fetchTrending();
        fetchPopularMovies();
        fetchPopularTv();
        fetchTopRatedMovies();
        fetchTopRatedTv();
    }, [fetchTrending, fetchPopularMovies, fetchPopularTv, fetchTopRatedMovies, fetchTopRatedTv]);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoadingContinueWatching(true);
            const history = await getWatchHistory();
            if (!history) {
                setLoadingContinueWatching(false);
                return;
            };

            const historyMap = history.reduce((acc, item) => {
                const key = `${item.media_type}-${item.media_id}${item.media_type !== 'movie' ? '-s'+item.season_number+'-e'+item.episode_number : '' }`;
                acc[key] = item;
                if (item.media_type === 'tv' || item.media_type === 'anime') {
                    const seriesKey = `${item.media_type}-${item.id}`;
                    if (!acc[seriesKey] || new Date(item.watched_at) > new Date(acc[seriesKey].watched_at)) {
                         acc[seriesKey] = item;
                    }
                }
                return acc;
            }, {});
            setWatchHistory(historyMap);

            const inProgressItems = history
                .filter(item => {
                    if (item.duration_seconds > 0) {
                        return (item.progress_seconds / item.duration_seconds) < 0.95;
                    }
                    return true; // Keep if duration is not known
                })
                .sort((a, b) => new Date(b.watched_at) - new Date(a.watched_at));
            
            if (inProgressItems.length > 0) {
                 const detailedItems = await Promise.all(
                    inProgressItems.map(async (item) => {
                        try {
                            const res = await fetch(`${API_BASE_URL}/tmdb/${item.media_type}/${item.media_id}`);
                            if (res.ok) {
                                const data = await res.json();
                                // Combine TMDB data with our progress data
                                return { ...data, ...item, type: item.media_type };
                            }
                            return null;
                        } catch {
                            return null;
                        }
                    })
                );
                setContinueWatching(detailedItems.filter(Boolean));
            } else {
                setContinueWatching([]);
            }
            setLoadingContinueWatching(false);
        };
        fetchHistory();
    }, []);

    const renderSection = (title, items, type, loading) => {
        if (loading) {
            return (
                <section class="home-section">
                    <h2>{title}</h2>
                    <div class="movie-list-placeholder">
                        {[...Array(5)].map((_, i) => <div key={i} class="movie-card-placeholder" />)}
                    </div>
                </section>
            );
        }
        if (!items || items.length === 0) {
            // Don't render empty sections except for "Continue Watching"
            if (title !== "Continue Watching") {
                 return null;
            }
        }
        return (
            <section class="home-section">
                <h2>{title}</h2>
                <div class="movie-list">
                    {items.map(item => {
                        const itemType = item.media_type || type;
                        return (
                            <MovieCard 
                                key={item.id} 
                                item={{ ...item, type: itemType }} 
                                type={itemType} 
                                progress={watchHistory[`${itemType}-${item.id}`] || item}
                            />
                        );
                    })}
                </div>
            </section>
        );
    };

    return (
        <div class="container home-page">
            <h1 class="main-title">Discover</h1>
            {renderSection('Continue Watching', continueWatching, 'movie', loadingContinueWatching)}
            {renderSection('Trending This Week', trending, 'movie')}
            {renderSection('Popular Movies', popularMovies, 'movie')}
            {renderSection('Top Rated Movies', topRatedMovies, 'movie')}
            {renderSection('Popular TV Shows', popularTv, 'tv')}
            {renderSection('Top Rated TV Shows', topRatedTv, 'tv')}
        </div>
    );
};

export default Home; 