import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import MovieCard from '../components/MovieCard';
import AnimeCard from '../components/AnimeCard';
import LoadingSpinner from '../components/LoadingSpinner';
import SkeletonCard from '../components/SkeletonCard';
import { useAuth } from '../context/Auth';
import { API_BASE_URL } from '../config';
import './Browse.css';

const Browse = ({ type, category, filter }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [genres, setGenres] = useState([]);
    const [selectedGenre, setSelectedGenre] = useState(category === 'genres' && filter ? filter : (category === 'genres' ? '28' : ''));
    const [selectedStreamingService, setSelectedStreamingService] = useState(category === 'streaming' && filter ? filter : 'netflix');
    const [selectedMediaType, setSelectedMediaType] = useState(type || 'movie');
    const { user } = useAuth();

    const categoryTitles = {
        'trending': 'Trending Now',
        'popular': 'Popular',
        'top-rated': 'Top Rated',
        'upcoming': 'Upcoming',
        'now-playing': 'Now Playing',
        'on-the-air': 'On The Air',
        'seasonal': 'This Season',
        'continue-watching': 'Continue Watching',
        'genres': 'Browse by Genre',
        'streaming': 'Browse by Streaming Service'
    };

    const streamingServices = [
        { id: 'netflix', name: 'Netflix', tmdbId: 8 },
        { id: 'prime', name: 'Prime Video', tmdbId: 119 },
        { id: 'hbo', name: 'Max', tmdbId: 384 },
        { id: 'disney', name: 'Disney+', tmdbId: 337 },
        { id: 'apple', name: 'Apple TV+', tmdbId: 350 },
        { id: 'paramount', name: 'Paramount+', tmdbId: 531 }
    ];

    const fetchGenres = async () => {
        try {
            const currentType = type === 'anime' ? type : selectedMediaType;
            const response = await fetch(`${API_BASE_URL}/tmdb/genre/${currentType}/list`);
            if (response.ok) {
                const data = await response.json();
                setGenres(data.genres || []);
            }
        } catch (err) {
            console.error('Error fetching genres:', err);
        }
    };

    const fetchItems = async (pageNum = 1, append = false) => {
        try {
            setLoading(true);
            let url;
            // Use selectedMediaType for all categories except anime
            const currentType = type === 'anime' ? type : selectedMediaType;
            
            if (category === 'genres' && selectedGenre) {
                // Fetch by genre
                url = `${API_BASE_URL}/tmdb/discover/${currentType}?with_genres=${selectedGenre}&page=${pageNum}`;
            } else if (category === 'genres' && !selectedGenre) {
                // Don't fetch anything if no genre is selected
                setLoading(false);
                return;
            } else if (category === 'streaming' && selectedStreamingService) {
                // Find the TMDB provider ID for the selected streaming service
                const service = streamingServices.find(s => s.id === selectedStreamingService);
                console.log(`[BROWSE] Streaming category - selectedStreamingService: ${selectedStreamingService}`);
                console.log(`[BROWSE] Found service:`, service);
                if (service) {
                    url = `${API_BASE_URL}/tmdb/discover/${currentType}?with_watch_providers=${service.tmdbId}&watch_region=US&page=${pageNum}`;
                    console.log(`[BROWSE] Fetching ${currentType} content for ${service.name} (ID: ${service.tmdbId}):`, url);
                } else {
                    // Fallback to popular if service not found
                    console.log(`[BROWSE] Service not found, using fallback`);
                    url = `${API_BASE_URL}/tmdb/${currentType}/popular?page=${pageNum}`;
                }
            } else if (category === 'streaming' && !selectedStreamingService) {
                console.log(`[BROWSE] No streaming service selected`);
                setLoading(false);
                return;
            } else if (type === 'anime') {
                // Fetch anime data based on category
                switch (category) {
                    case 'trending':
                        url = `${API_BASE_URL}/anime/anilist/trending?page=${pageNum}&perPage=20`;
                        break;
                    case 'popular':
                        url = `${API_BASE_URL}/anime/anilist/popular?page=${pageNum}&perPage=20`;
                        break;
                    case 'top-rated':
                        url = `${API_BASE_URL}/anime/anilist/top-rated?page=${pageNum}&perPage=20`;
                        break;
                    case 'seasonal':
                        url = `${API_BASE_URL}/anime/anilist/seasonal?page=${pageNum}&perPage=20`;
                        break;
                    default:
                        throw new Error('Invalid anime category');
                }
            } else {
                // Fetch movie/TV data based on category using TMDB proxy
                switch (category) {
                    case 'trending':
                        url = `${API_BASE_URL}/tmdb/trending/${type}/week?page=${pageNum}`;
                        break;
                    case 'popular':
                        url = `${API_BASE_URL}/tmdb/${type}/popular?page=${pageNum}`;
                        break;
                    case 'top-rated':
                        url = `${API_BASE_URL}/tmdb/${type}/top_rated?page=${pageNum}`;
                        break;
                    case 'upcoming':
                        url = `${API_BASE_URL}/tmdb/${type}/upcoming?page=${pageNum}`;
                        break;
                    case 'now-playing':
                        url = `${API_BASE_URL}/tmdb/${type}/now_playing?page=${pageNum}`;
                        break;
                    case 'on-the-air':
                        url = `${API_BASE_URL}/tmdb/${type}/on_the_air?page=${pageNum}`;
                        break;
                    case 'airing-today':
                        url = `${API_BASE_URL}/tmdb/${type}/airing_today?page=${pageNum}`;
                        break;
                    default:
                        throw new Error('Invalid category');
                }
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${category} ${type}`);
            }

            const data = await response.json();
            const newItems = data.results || data.data || [];
            
            if (append) {
                setItems(prev => [...prev, ...newItems]);
            } else {
                setItems(newItems);
            }
            
            // Check if there are more pages
            setHasMore(newItems.length === 20 && pageNum < (data.total_pages || 50));
            
        } catch (err) {
            console.error('Error fetching items:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (type && category) {
            setItems([]);
            setPage(1);
            setError(null);
            
            if (category === 'genres') {
                fetchGenres();
                // Don't fetch items initially for genres - wait for user selection
            } else {
                fetchItems(1, false);
            }
        }
    }, [type, category]);

    useEffect(() => {
        if (category === 'genres' && selectedGenre) {
            setItems([]);
            setPage(1);
            fetchItems(1, false);
        }
    }, [selectedGenre]);

    useEffect(() => {
        console.log(`[BROWSE] Streaming service changed to: ${selectedStreamingService}`);
        if (category === 'streaming') {
            console.log(`[BROWSE] Resetting items and fetching for streaming service: ${selectedStreamingService}`);
            setItems([]);
            setPage(1);
            fetchItems(1, false);
        }
    }, [selectedStreamingService]);

    useEffect(() => {
        console.log(`[BROWSE] Media type changed to: ${selectedMediaType}`);
        if (category !== 'anime') {
            console.log(`[BROWSE] Resetting items and fetching for media type: ${selectedMediaType}`);
            setItems([]);
            setPage(1);
            if (category === 'genres' && selectedGenre) {
                fetchItems(1, false);
            } else if (category === 'streaming' && selectedStreamingService) {
                fetchItems(1, false);
            } else if (category !== 'genres') {
                fetchItems(1, false);
            }
        }
    }, [selectedMediaType]);

    useEffect(() => {
        if (type !== 'anime') {
            setItems([]);
            setPage(1);
            setError(null);
            
            if (category === 'genres') {
                fetchGenres();
                if (selectedGenre) {
                    fetchItems(1, false);
                }
            } else {
                fetchItems(1, false);
            }
        }
    }, [selectedMediaType]);

    const loadMore = () => {
        if (!loading && hasMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchItems(nextPage, true);
        }
    };

    const handleItemClick = (item) => {
        if (type === 'anime') {
            // Handle anime click
            let mediaType, itemId, routePath;
            
            if (item.source === 'tmdb') {
                mediaType = item.media_type || 'tv';
                itemId = item.tmdb_id || item.id;
                routePath = `/watch/${mediaType}/${itemId}`;
                
                if (mediaType === 'tv') {
                    routePath += `/season/1/episode/1`;
                }
            } else {
                mediaType = 'anime';
                itemId = item.anilist_id || item.id;
                routePath = `/watch/anime/${itemId}/season/1/episode/1`;
            }
            
            route(routePath);
        } else {
            // Handle movie/TV click
            const mediaId = item.id;
            let link = `/watch/${type}/${mediaId}`;
            
            if (type === 'tv') {
                link += `/season/1/episode/1`;
            }
            
            route(link);
        }
    };

    if (error) {
        return (
            <div className="browse-page">
                <div className="browse-header">
                    <button className="back-button" onClick={() => window.history.back()}>
                        <i className="fas fa-arrow-left"></i> Back
                    </button>
                    <h1>Error</h1>
                </div>
                <div className="error-message">
                    <p>{error}</p>
                    <button onClick={() => fetchItems(1, false)}>Try Again</button>
                </div>
            </div>
        );
    }

    return (
        <div className="browse-page">
            <div className="browse-header">
                <button className="back-button" onClick={() => window.history.back()}>
                    <i className="fas fa-arrow-left"></i> Back
                </button>
                <h1 className="page-title">
                    {categoryTitles[category] || category}
                    {type !== 'anime' && (
                        <span className="media-type-indicator">
                            {' - '}{selectedMediaType === 'movie' ? 'Movies' : 'TV Shows'}
                        </span>
                    )}
                </h1>
            </div>
            
            {/* Media Type Switcher for all non-anime categories */}
            {type !== 'anime' && (
                <div className="filter-section">
                    <h3>Content Type:</h3>
                    <div className="media-type-switcher">
                        <button
                            className={`media-type-btn ${selectedMediaType === 'movie' ? 'active' : ''}`}
                            onClick={() => setSelectedMediaType('movie')}
                        >
                            Movies
                        </button>
                        <button
                            className={`media-type-btn ${selectedMediaType === 'tv' ? 'active' : ''}`}
                            onClick={() => setSelectedMediaType('tv')}
                        >
                            TV Shows
                        </button>
                    </div>
                </div>
            )}
            
            {/* Genre Selection */}
            {category === 'genres' && (
                <div className="filter-section">
                    <h3>Select Genre:</h3>
                    <div className="genre-selector">
                        <select 
                            value={selectedGenre} 
                            onChange={(e) => setSelectedGenre(e.target.value)}
                            className="genre-select"
                        >
                            <option value="">Choose a genre...</option>
                            {genres.map(genre => (
                                <option key={genre.id} value={genre.id}>
                                    {genre.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
            
            {/* Streaming Service Selection */}
            {category === 'streaming' && (
                <div className="filter-section">
                    <h3>Select Streaming Service:</h3>
                    <div className="streaming-selector">
                        {streamingServices.map(service => (
                            <button
                                key={service.id}
                                className={`streaming-service-btn ${selectedStreamingService === service.id ? 'active' : ''}`}
                                onClick={() => setSelectedStreamingService(service.id)}
                            >
                                {service.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="browse-content">
                {loading && items.length === 0 ? (
                    <div className="items-grid">
                        {Array.from({ length: 20 }).map((_, index) => (
                            <SkeletonCard key={`skeleton-${index}`} />
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="items-grid">
                            {items.map((item, index) => (
                                type === 'anime' ? (
                                    <AnimeCard
                                        key={`${item.id}-${index}`}
                                        item={item}
                                        onClick={() => handleItemClick(item)}
                                    />
                                ) : (
                                    <MovieCard
                                        key={`${item.id}-${index}`}
                                        item={item}
                                        type={type === 'anime' ? type : selectedMediaType}
                                        onClick={() => handleItemClick(item)}
                                    />
                                )
                            ))}
                        </div>
                        
                        {hasMore && (
                            <div className="load-more-container">
                                <button 
                                    className="load-more-button" 
                                    onClick={loadMore}
                                    disabled={loading}
                                >
                                    {loading ? 'Loading...' : 'Load More'}
                                </button>
                            </div>
                        )}
                        
                        {!hasMore && items.length > 0 && (
                            <div className="end-message">
                                <p>You've reached the end!</p>
                            </div>
                        )}
                    </>
                )}
                
                {!loading && items.length === 0 && (
                    <div className="no-content">
                        <h3>No content available</h3>
                        <p>Please try again later.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Browse;