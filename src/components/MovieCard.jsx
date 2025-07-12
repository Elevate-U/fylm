import { h } from 'preact';
import { Link } from 'preact-router/match';
import { useStore } from '../store';
import { useAuth } from '../context/Auth';
import './MovieCard.css';
import { getProxiedImageUrl, IMAGE_BASE_URL } from '../config';

const MovieCard = ({ item, type, progress, duration, showDeleteButton, onDelete }) => {
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
        number_of_seasons
    } = item;

    // Use episode still_path first, fallback to series poster_path for the image
    const imagePath = still_path || poster_path;
    const seriesTitle = name || title;

    // Calculate progress percentage
    const progressPercent = (progress && duration > 0) ? (progress / duration) * 100 : 0;

    // Calculate year from release date
    const year = (release_date || first_air_date) ? new Date(release_date || first_air_date).getFullYear() : null;

    const { user } = useAuth();
    const { addFavorite, removeFavorite, isFavorited, favoritesFetched } = useStore();
    const favorited = isFavorited(item.id, type, item.season_number, item.episode_number);

    const handleFavoriteClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (favorited) {
            removeFavorite(item.id, item.season_number, item.episode_number);
        } else {
            addFavorite({ ...item, type });
        }
    };

    let link = `/watch/${type}/${item.id}`;
    if (type === 'tv' && item.season_number && item.episode_number) {
        link += `/season/${item.season_number}/episode/${item.episode_number}`;
    }

    // Determine what to show in subtitle based on context
    const getSubtitleText = () => {
        if (type === 'tv' && season_number && episode_number) {
            // This is a specific episode (from watch history/favorites)
            return `S${season_number} E${episode_number}${episode_name ? `: ${episode_name}` : ''}`;
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

    return (
        <div className="movie-card-container">
            <Link href={link} className="movie-card">
                <div className="poster-wrapper">
                    <img 
                        src={getProxiedImageUrl(imagePath ? `${IMAGE_BASE_URL}${imagePath}` : 'https://via.placeholder.com/500x750/1a1a1a/ffffff?text=No+Image')} 
                        alt={seriesTitle} 
                        loading="lazy" 
                    />
                    {/* Gradient overlay for text readability */}
                    <div className="scrim"></div>
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
                                >
                                    {favoritesFetched ? '♥︎' : '...'}
                                </button>
                            )}
                        </div>
                        {subtitleText && (
                            <p className="card-subtitle">{subtitleText}</p>
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
            </Link>
        </div>
    );
};

export default MovieCard; 