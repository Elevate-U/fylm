import { h } from 'preact';
import { useStore } from '../store';
import './MovieCard.css';

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

const MovieCard = ({ item, type, progress }) => {
    const posterPath = item.poster_path && item.poster_path !== 'undefined' ? `${IMAGE_BASE_URL}${item.poster_path}` : 'https://via.placeholder.com/200x300.png?text=No+Image';
    const title = item.title || item.name;
    const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
    
    const link = `/watch?id=${item.id}&type=${type}`;
    
    const { addFavorite, removeFavorite, isFavorited } = useStore();
    const favorited = isFavorited(item.id);

    const handleFavoriteClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (favorited) {
            removeFavorite(item.id);
        } else {
            addFavorite({ ...item, type });
        }
    };

    let progressPercent = 0;
    if (progress && progress.progress_seconds && progress.duration_seconds) {
        progressPercent = (progress.progress_seconds / progress.duration_seconds) * 100;
    }

    return (
        <div class="movie-card-container">
            <a href={link} class="movie-card">
                <div class="poster-wrapper">
                    <img src={posterPath} alt={title} loading="lazy" />
                    {progressPercent > 1 && progressPercent < 95 && (
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
            <button class={`favorite-btn ${favorited ? 'favorited' : ''}`} onClick={handleFavoriteClick}>
                {favorited ? '♥' : '♡'}
            </button>
        </div>
    );
};

export default MovieCard; 