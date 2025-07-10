import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import Helmet from 'preact-helmet';
import MovieCard from '../components/MovieCard';
import './Home.css';
import { route } from 'preact-router';
import { getHistoryStore } from '../utils/watchHistory';

const MovieGrid = ({ title, items, mediaType }) => {
    if (!items || items.length === 0) return null;
    return (
        <section class="movie-grid-section">
            <h2>{title}</h2>
            <div class="movie-grid">
                {items.map(item => <MovieCard item={item} mediaType={item.media_type || mediaType} />)}
            </div>
        </section>
    );
};

const Home = (props) => {
    const [trendingMovies, setTrendingMovies] = useState([]);
    const [topRatedMovies, setTopRatedMovies] = useState([]);
    const [trendingTv, setTrendingTv] = useState([]);
    const [topRatedTv, setTopRatedTv] = useState([]);
    const [continueWatching, setContinueWatching] = useState([]);
    const [heroItem, setHeroItem] = useState(null);
    const [mediaType, setMediaType] = useState('movie');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const params = new URLSearchParams(props.url?.split('?')[1] || '');
        const type = params.get('type') || 'movie';
        if (['movie', 'tv'].includes(type)) {
            setMediaType(type);
        }
    }, [props.url]);

    useEffect(() => {
        const fetchAllContent = async () => {
            setLoading(true);
            try {
                // Fetch Continue Watching
                const history = getHistoryStore();
                const unprocessedItems = [];

                for (const key in history) {
                    const value = history[key];
                    // Series are identified by having a 'lastWatched' property.
                    if (value.lastWatched && (value.type === 'tv' || value.type === 'anime')) {
                        unprocessedItems.push({ ...value, id: key, media_type: value.type });
                    } 
                    // Movies are identified by being type 'movie' and having progress.
                    else if (value.type === 'movie' && value.progress > 0) {
                        unprocessedItems.push({ ...value, media_type: value.type });
                    }
                }

                const continueWatchingItems = unprocessedItems
                    .filter(item => {
                        if (item.type === 'movie') {
                            return item.progress > 60 && (item.progress / item.duration) < 0.95;
                        }
                        return true; // For TV shows, any started show will appear.
                    })
                    .sort((a, b) => new Date(b.watchedAt || b.lastWatched) - new Date(a.watchedAt || a.lastWatched));


                if (continueWatchingItems.length > 0) {
                    const detailedItems = await Promise.all(
                        continueWatchingItems.map(async (item) => {
                            try {
                                const res = await fetch(`/api/tmdb/${item.media_type}/${item.id}`);
                                if (res.ok) {
                                    const data = await res.json();
                                    return { ...data, media_type: item.media_type };
                                }
                                return null;
                            } catch {
                                return null;
                            }
                        })
                    );
                    setContinueWatching(detailedItems.filter(Boolean));
                }


                const [
                    trendingMovieData,
                    topRatedMovieData,
                    trendingTvData,
                    topRatedTvData,
                ] = await Promise.all([
                    fetch('/api/tmdb/trending/movie/week').then(res => res.json()),
                    fetch('/api/tmdb/movie/top_rated').then(res => res.json()),
                    fetch('/api/tmdb/trending/tv/week').then(res => res.json()),
                    fetch('/api/tmdb/tv/top_rated').then(res => res.json()),
                ]);

                setTrendingMovies(trendingMovieData.results || []);
                setTopRatedMovies(topRatedMovieData.results || []);
                setTrendingTv(trendingTvData.results || []);
                setTopRatedTv(topRatedTvData.results || []);
                
                const allTrending = [
                    ...(trendingMovieData.results || []).map(item => ({ ...item, media_type: 'movie' })),
                    ...(trendingTvData.results || []).map(item => ({ ...item, media_type: 'tv' }))
                ];
                if (allTrending.length > 0) {
                    setHeroItem(allTrending[Math.floor(Math.random() * allTrending.length)]);
                }
            } catch (error) {
                console.error("Error fetching content:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllContent();
    }, []);

    const renderContent = () => {
        if (loading) {
            return <div class="loading-spinner"></div>;
        }

        if (mediaType === 'movie') {
            return (
                <div>
                    <MovieGrid title="Trending Movies" items={trendingMovies} mediaType="movie" />
                    <MovieGrid title="Top Rated Movies" items={topRatedMovies} mediaType="movie" />
                </div>
            );
        } else if (mediaType === 'tv') {
            return (
                <div>
                    <MovieGrid title="Trending TV Shows" items={trendingTv} mediaType="tv" />
                    <MovieGrid title="Top Rated TV Shows" items={topRatedTv} mediaType="tv" />
                </div>
            );
        }
    };

    return (
        <div>
            <Helmet>
                <title>MyStream - Watch Movies & TV Shows Online</title>
            </Helmet>
            {heroItem && (
                <div class="hero-section" style={{backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.7) 30%, transparent), url(https://image.tmdb.org/t/p/original${heroItem.backdrop_path})`}}>
                    <div class="hero-content">
                        <h1>{heroItem.title || heroItem.name}</h1>
                        <p>{heroItem.overview}</p>
                        <a href={`/watch?id=${heroItem.id}&type=${heroItem.media_type}`} class="btn btn-primary">▶ Watch Now</a>
                    </div>
                </div>
            )}
            <div class="container">
                <div class="media-type-switcher">
                    <button onClick={() => route('/?type=movie')} class={mediaType === 'movie' ? 'active' : ''}>Movies</button>
                    <button onClick={() => route('/?type=tv')} class={mediaType === 'tv' ? 'active' : ''}>TV Shows</button>
                </div>
                <MovieGrid title="Continue Watching" items={continueWatching} />
                {renderContent()}
            </div>
        </div>
    );
};

export default Home; 