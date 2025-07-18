import { h } from 'preact';
import { route } from 'preact-router';
import { useStore } from '../store';
import { useAuth } from '../context/Auth';
import './AnimeCard.css';
import { getProxiedImageUrl } from '../config';

const AnimeCard = ({ item, progress, duration, showDeleteButton, onDelete, onClick }) => {
    // Destructure anime-specific properties from AniList data
    const {
        id,
        title,
        poster_path,
        overview,
        vote_average,
        first_air_date,
        // Enhanced anime properties from AniList
        status,
        episodes,
        format,
        nextAiringEpisode,
        studios,
        genres,
        season,
        seasonYear,
        source,
        meanScore,
        favourites,
        tags,
        trailer,
        isAdult,
        duration: episodeDuration,
        // Continue watching properties
        season_number,
        episode_number,
        episode_name
    } = item;

    const animeTitle = title?.english || title?.romaji || title || item.name;
    
    // Calculate progress percentage
    const progressPercent = (progress && duration > 0) ? (progress / duration) * 100 : 0;

    // Calculate year from release date
    const year = first_air_date ? new Date(first_air_date).getFullYear() : seasonYear;

    const { user } = useAuth();
    const { addFavorite, removeFavorite, isFavorited, favoritesFetched } = useStore();
    
    const favorited = isFavorited(item.id, 'anime', item.season_number, item.episode_number);

    const handleFavoriteClick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) return;

        if (favorited) {
            removeFavorite(user.id, item.id, 'anime', item.season_number, item.episode_number);
        } else {
            addFavorite(user.id, { ...item, type: 'anime' });
        }
    };

    // Enhanced click handler for anime with conditional routing
    const handleCardClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (onClick) {
            onClick(item);
        } else {
            // Conditional routing logic - use AniList ID for anime
            const animeId = item.anilist_id || item.id;
            let link = `/watch/anime/${animeId}`;
            
            // Deep linking support for specific episodes
            if (item.season_number && item.episode_number) {
                link += `/season/${item.season_number}/episode/${item.episode_number}`;
            }
            
            // Get audio preference for routing
            const audioPreference = localStorage.getItem('anime-audio-preference') || 'subbed';
            const urlParams = new URLSearchParams();
            if (audioPreference === 'dubbed') {
                urlParams.set('dub', 'true');
            }
            
            if (urlParams.toString()) {
                link += `?${urlParams.toString()}`;
            }
            
            route(link);
        }
    };

    // Enhanced subtitle text for anime with comprehensive metadata
    const getSubtitleText = () => {
        if (season_number && episode_number) {
            // This is a specific episode (from continue watching)
            return `S${season_number} E${episode_number}${episode_name ? `: ${episode_name}` : ''}`;
        }
        
        // Build comprehensive subtitle for anime listing
        const parts = [];
        if (year) parts.push(year.toString());
        if (episodes) parts.push(`${episodes} episodes`);
        if (format && format !== 'TV') parts.push(format);
        if (status === 'RELEASING') parts.push('Airing');
        
        return parts.length > 0 ? parts.join(' • ') : 'Anime';
    };

    const subtitleText = getSubtitleText();

    // Get anime status badge with enhanced status mapping
    const getStatusBadge = () => {
        if (!status) return null;
        
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

    // Get next episode info for currently airing anime
    const getNextEpisodeInfo = () => {
        if (!nextAiringEpisode || status !== 'RELEASING') return null;
        
        const timeUntilAiring = nextAiringEpisode.timeUntilAiring;
        if (timeUntilAiring <= 0) return null;
        
        const days = Math.floor(timeUntilAiring / (24 * 60 * 60));
        const hours = Math.floor((timeUntilAiring % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((timeUntilAiring % (60 * 60)) / 60);
        
        let timeText = '';
        if (days > 0) {
            timeText = `${days}d ${hours}h`;
        } else if (hours > 0) {
            timeText = `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            timeText = `${minutes}m`;
        } else {
            timeText = 'Soon';
        }
        
        return (
            <div className="next-episode-info">
                <span className="next-ep-label">Ep {nextAiringEpisode.episode}</span>
                <span className="next-ep-time">in {timeText}</span>
            </div>
        );
    };

    // Get studio information
    const getStudioInfo = () => {
        if (!studios || studios.length === 0) return null;
        
        // Find main studio or use first one
        const mainStudio = studios.find(studio => studio.isMain) || studios[0];
        return mainStudio?.name || mainStudio;
    };

    // Get genre tags (limit to 2 for space)
    const getGenreTags = () => {
        if (!genres || genres.length === 0) return null;
        
        return genres.slice(0, 2).map(genre => (
            <span key={genre} className="genre-tag">{genre}</span>
        ));
    };

    // Enhanced image URL handling for AniList images
    const getFullImageUrl = (path) => {
        if (!path) {
            return 'https://via.placeholder.com/500x750/1a1a1a/ffffff?text=No+Image';
        }
        if (path.startsWith('http')) {
            return getProxiedImageUrl(path);
        }
        return getProxiedImageUrl(path);
    };

    // Get rating with enhanced scoring
    const getRating = () => {
        const score = meanScore || vote_average;
        if (!score) return 'N/A';
        
        // Convert AniList score (0-100) to 0-10 scale if needed
        const normalizedScore = score > 10 ? score / 10 : score;
        return normalizedScore.toFixed(1);
    };

    return (
        <div className="anime-card-container">
            <div className="anime-card" onClick={handleCardClick}>
                <div className="anime-poster-wrapper">
                    <img 
                        src={getFullImageUrl(poster_path)} 
                        alt={animeTitle} 
                        loading="lazy" 
                        width="500" 
                        height="750"
                    />
                    
                    {/* Enhanced gradient overlay */}
                    <div className="anime-scrim"></div>
                    
                    {/* Anime status badge */}
                    {getStatusBadge()}
                    
                    {/* Progress bar for continue watching */}
                    {progressPercent > 0.01 && (
                        <div className="anime-progress-container">
                            <div className="anime-progress-bar" style={{ width: `${Math.min(progressPercent, 100)}%` }}></div>
                        </div>
                    )}
                    
                    {/* Videasy integration indicator */}
                    <div className="streaming-indicator">
                        <span className="videasy-badge">Videasy</span>
                    </div>
                    
                    <div className="anime-card-info">
                        {/* Title and favorite button */}
                        <div className="anime-title-row">
                            <h3 className="anime-card-title">{animeTitle}</h3>
                            {user && (
                                <button
                                    className={`anime-favorite-btn ${favorited ? 'favorited' : ''}`}
                                    onClick={handleFavoriteClick}
                                    aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                                    disabled={!favoritesFetched}
                                >
                                    ♥︎
                                </button>
                            )}
                        </div>
                        
                        {/* Subtitle with episode/format info */}
                        {subtitleText && (
                            <p className="anime-card-subtitle">{subtitleText}</p>
                        )}
                        
                        {/* Next episode info for airing anime */}
                        {getNextEpisodeInfo()}
                        
                        {/* Studio info */}
                        {getStudioInfo() && (
                            <p className="anime-studio-info">
                                {getStudioInfo()}
                            </p>
                        )}
                        
                        {/* Genre tags */}
                        {genres && genres.length > 0 && (
                            <div className="anime-genre-tags">
                                {getGenreTags()}
                            </div>
                        )}
                        
                        {/* Rating with AniList scoring */}
                        <div className="anime-rating-row">
                            <span className="anime-rating">★ {getRating()}</span>
                            {favourites && (
                                <span className="anime-favorites">♥ {favourites.toLocaleString()}</span>
                            )}
                        </div>
                    </div>
                    
                    {/* Delete button for continue watching */}
                    {showDeleteButton && (
                        <button
                            className="anime-delete-btn"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (onDelete) onDelete(item);
                            }}
                            aria-label="Remove from continue watching"
                        >
                            &times;
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnimeCard;