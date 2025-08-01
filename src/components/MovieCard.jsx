import { h } from 'preact';
import { useState, useCallback, useEffect, useRef } from 'preact/hooks';
import { route } from 'preact-router';
import { useStore } from '../store';
import { useAuth } from '../context/Auth';
import './MovieCard.css';
import { getProxiedImageUrl, IMAGE_BASE_URL } from '../config';

const MovieCard = ({ item, type, progress, duration, showDeleteButton, onDelete, onClick, useFullResolution = false }) => {
    // Destructure all needed properties from item
    const {
        id,
        title,
        name,
        poster_path,
        still_path,
        vote_average,
        episode_name,
        season_number,
        episode_number,
        first_air_date,
        release_date,
        number_of_seasons,
        // Enhanced anime properties
        status,
        episodes,
        format,
        nextAiringEpisode,
        studios,
        genres
    } = item;

    // Use episode still_path first, fallback to series poster_path for the image
    const imagePath = still_path || poster_path;
    const rawTitle = name || title;
    const seriesTitle = typeof rawTitle === 'object' && rawTitle !== null
        ? rawTitle.english || rawTitle.romaji || rawTitle.native
        : rawTitle;

    // Calculate progress percentage
    const progressPercent = (progress && duration > 0) ? (progress / duration) * 100 : 0;

    // Calculate year from release date
    const year = (release_date || first_air_date) ? new Date(release_date || first_air_date).getFullYear() : null;

    const { user } = useAuth();
    const { addFavorite, removeFavorite, isShowFavorited, favoritesFetched } = useStore();
    
    // Get favorited state - for anime, check using type 'anime'
    const favorited = isShowFavorited(item.id, type, item.season_number, item.episode_number);

    const handleFavoriteClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) return; // Prevent action if user is not logged in

        if (favorited) {
            // For anime content, need to try removing with both tv and anime types
            if (type === 'anime') {
                // Try removing with both possible media types
                removeFavorite(user.id, item.id, 'anime');
                removeFavorite(user.id, item.id, 'tv');
            } else {
                removeFavorite(user.id, item.id, type, item.season_number, item.episode_number);
            }
        } else {
            addFavorite(user.id, { ...item, type });
        }
    };

    // Enhanced click handler for all cards
    const handleCardClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (onClick) {
            // Use the custom onClick handler if provided (e.g., for the Anime page)
            onClick(item);
        } else {
            // Default navigation logic for other pages
            const mediaId = type === 'anime' && item.anilist_id ? item.anilist_id : item.id;
            let link = `/watch/${type}/${mediaId}`;
            
            if ((type === 'tv' || type === 'anime') && item.season_number && item.episode_number) {
                link += `/season/${item.season_number}/episode/${item.episode_number}`;
            } else if (type === 'anime') {
                // Default to season 1, episode 1 for anime with no specific episode info
                link += `/season/1/episode/1`;
            }
            route(link);
        }
    };
    
    const handleImageError = useCallback((e) => {
        // Replace broken image with placeholder
        const element = e.target;
        element.onerror = null; // Prevent infinite error loop
        element.src = 'https://via.placeholder.com/400x600/1a1a1a/ffffff?text=No+Image';
    }, []);

    // Enhanced subtitle text for anime
    const getSubtitleText = () => {
        if ((type === 'tv' || type === 'anime') && season_number && episode_number) {
            // This is a specific episode (from watch history/favorites)
            return `S${season_number} E${episode_number}${episode_name ? `: ${episode_name}` : ''}`;
        } else if (type === 'anime') {
            // Enhanced anime subtitle with episode count and status
            const parts = [];
            if (year) parts.push(year.toString());
            if (episodes) parts.push(`${episodes} episodes`);
            if (format && format !== 'TV') parts.push(format);
            return parts.length > 0 ? parts.join(' • ') : 'Anime';
        } else if (type === 'tv' && number_of_seasons) {
            // This is a TV show listing - show year and season count
            return `${year || 'Unknown'} • ${number_of_seasons} Season${number_of_seasons !== 1 ? 's' : ''}`;
        } else if (type === 'movie' && year) {
            // This is a movie - show just the year
            return year.toString();
        }
        return null;
    };

    const subtitleText = getSubtitleText();

    // Get anime status badge
    const getStatusBadge = () => {
        if (type !== 'anime' || !status) return null;
        
        const statusMap = {
            'RELEASING': { text: 'Airing', class: 'airing' },
            'FINISHED': { text: 'Completed', class: 'completed' },
            'NOT_YET_RELEASED': { text: 'Upcoming', class: 'upcoming' },
            'CANCELLED': { text: 'Cancelled', class: 'cancelled' },
            'HIATUS': { text: 'Hiatus', class: 'hiatus' }
        };
        
        const statusInfo = statusMap[status];
        if (!statusInfo) return null;
        
        return (
            <div className={`anime-status-badge ${statusInfo.class}`}>
                {statusInfo.text}
            </div>
        );
    };

    // Get next episode info for airing anime
    const getNextEpisodeInfo = () => {
        if (type !== 'anime' || !nextAiringEpisode) return null;
        
        const timeUntilAiring = nextAiringEpisode.timeUntilAiring;
        if (timeUntilAiring <= 0) return null;
        
        const days = Math.floor(timeUntilAiring / (24 * 60 * 60));
        const hours = Math.floor((timeUntilAiring % (24 * 60 * 60)) / (60 * 60));
        
        let timeText = '';
        if (days > 0) {
            timeText = `${days}d ${hours}h`;
        } else if (hours > 0) {
            timeText = `${hours}h`;
        } else {
            timeText = '<1h';
        }
        
        return (
            <div className="next-episode-info">
                Ep {nextAiringEpisode.episode} in {timeText}
            </div>
        );
    };

    const getFullImageUrl = useCallback((path, size = 'w500') => {
        if (!path) {
            return 'https://via.placeholder.com/500x750/1a1a1a/ffffff?text=No+Image';
        }
        if (path.startsWith('http')) {
            return getProxiedImageUrl(path);
        }
        const baseUrl = IMAGE_BASE_URL.replace('w500', size);
        return getProxiedImageUrl(`${baseUrl}${path}`);
    }, []);

    // State for visibility-based image quality
    const [isVisible, setIsVisible] = useState(false);
    const [imageUrl, setImageUrl] = useState(() => 
        getFullImageUrl(imagePath, useFullResolution ? 'w500' : 'w200')
    );
    const cardRef = useRef(null);

    // Intersection Observer for lazy loading high quality images
    useEffect(() => {
        if (!cardRef.current || useFullResolution) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !isVisible) {
                        setIsVisible(true);
                        setImageUrl(getFullImageUrl(imagePath, 'w500'));
                    }
                });
            },
            {
                rootMargin: '50px', // Start loading when card is 50px away from viewport
                threshold: 0.1 // Trigger when 10% of the card is visible
            }
        );

        observer.observe(cardRef.current);

        return () => {
            if (cardRef.current) {
                observer.unobserve(cardRef.current);
            }
        };
    }, [imagePath, getFullImageUrl, useFullResolution, isVisible]);

    // Update image URL when imagePath changes
    useEffect(() => {
        if (useFullResolution) {
            setImageUrl(getFullImageUrl(imagePath, 'w500'));
        } else {
            setImageUrl(getFullImageUrl(imagePath, isVisible ? 'w500' : 'w200'));
        }
    }, [imagePath, getFullImageUrl, useFullResolution, isVisible]);

    // Enhanced card with anime-specific features
    const cardContent = (
        <div
            className={`poster-wrapper ${type === 'anime' ? 'anime-card-enhanced' : ''}`}
        >
            <img
                src={imageUrl}
                alt={seriesTitle}
                loading="lazy"
                width="400"
                height="600"
                onError={handleImageError}
            />
            {/* Gradient overlay for text readability */}
            <div className="scrim"></div>
            
            {/* Anime status badge */}
            {getStatusBadge()}
            
            {/* Progress bar appears for all watched content */}
            {progressPercent > 0.01 && (
                <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${Math.min(progressPercent, 100)}%` }}></div>
                </div>
            )}
            
            <div className="card-info">
                {/* Standardized Title Display */}
                <div className="title-row">
                    <h3 className="card-title">{seriesTitle}</h3>
                    {user && (
                        <button
                            className={`favorite-btn ${favorited ? 'favorited' : ''}`}
                            onClick={handleFavoriteClick}
                            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                            disabled={!favoritesFetched}
                            style={{
                                color: favorited ? '#fca5a5' : 'var(--text-secondary)'
                            }}
                        >
                            ♥︎
                        </button>
                    )}
                </div>
                {subtitleText && (
                    <p className="card-subtitle">{subtitleText}</p>
                )}
                
                {/* Next episode info for airing anime */}
                {getNextEpisodeInfo()}
                
                {/* Studio info for anime */}
                {type === 'anime' && studios && studios.length > 0 && (
                    <p className="studio-info">
                        {studios[0].name}
                    </p>
                )}
                
                <span className="rating">★ {vote_average ? vote_average.toFixed(1) : 'N/A'}</span>
            </div>
            {showDeleteButton && (
                <button
                    className="delete-btn"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onDelete) onDelete(item);
                    }}
                >
                    &times;
                </button>
            )}
        </div>
    );

    return (
        <div className="movie-card-container" ref={cardRef}>
            <div className="movie-card clickable" onClick={handleCardClick}>
                {cardContent}
            </div>
        </div>
    );
};

export default MovieCard;