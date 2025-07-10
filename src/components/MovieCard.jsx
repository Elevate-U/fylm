import { h } from 'preact';
import { getWatchHistory } from '../utils/watchHistory';
import './MovieCard.css';

const IMAGE_BASE_URL = '/api/image/t/p/w500';

const MovieCard = ({ item, mediaType }) => {
    const posterPath = item.poster_path && item.poster_path !== 'undefined' ? `${IMAGE_BASE_URL}${item.poster_path}` : 'https://via.placeholder.com/200x300.png?text=No+Image';
    const title = item.title || item.name;
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
    
    // Prioritize mediaType prop, then TMDB's media_type. Default to 'movie' if unset.
    const type = mediaType || item.media_type || 'movie';
    const link = `/watch?id=${item.id}&type=${type}`;

    if (!type) {
        console.warn('Could not determine media type for item:', item);
    }
    
    const history = getWatchHistory(item.id);
    const progressPercent = history && history.duration > 0 ? (history.progress / history.duration) * 100 : 0;

    return (
        <a href={link} class="movie-card">
            <div class="poster-wrapper">
                <img src={posterPath} alt={title} loading="lazy" />
                {progressPercent > 0 && progressPercent < 95 && (
                    <div class="progress-bar-container">
                        <div class="progress-bar" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                )}
            </div>
            <div class="movie-info">
                <h3>{title}</h3>
                <span class="rating">★ {rating}</span>
            </div>
        </a>
    );
};

export default MovieCard; 