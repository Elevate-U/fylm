import { getProxiedImageUrl, IMAGE_BASE_URL } from '../config';

/**
 * Calculate progress percentage for progress bars
 * @param {number} progress - Current progress in seconds
 * @param {number} duration - Total duration in seconds
 * @returns {number} Progress percentage (0-100)
 */
export const calculateProgressPercent = (progress, duration) => {
    return (progress && duration > 0) ? (progress / duration) * 100 : 0;
};

/**
 * Extract year from release date
 * @param {string} releaseDate - Release date string
 * @param {number} fallbackYear - Fallback year if parsing fails
 * @returns {number|null} Year or null
 */
export const extractYear = (releaseDate, fallbackYear = null) => {
    if (releaseDate) {
        const year = new Date(releaseDate).getFullYear();
        return !isNaN(year) ? year : fallbackYear;
    }
    return fallbackYear;
};

/**
 * Get standardized subtitle text for cards (Year • Episodes/Seasons)
 * @param {Object} options - Subtitle options
 * @param {number} options.year - Release year
 * @param {string} options.mediaType - Media type ('tv', 'movie', 'anime')
 * @param {number} options.episodes - Episode count
 * @param {number} options.seasonNumber - Season number (for specific episodes)
 * @param {number} options.episodeNumber - Episode number (for specific episodes)
 * @param {string} options.episodeName - Episode name (for specific episodes)
 * @param {number} options.numberOfSeasons - Number of seasons (for TV shows)
 * @returns {string|null} Formatted subtitle or null
 */
export const getCardSubtitle = ({
    year,
    mediaType,
    episodes,
    seasonNumber,
    episodeNumber,
    episodeName,
    numberOfSeasons
}) => {
    // If this is a specific episode (from watch history/favorites)
    if ((mediaType === 'tv' || mediaType === 'anime') && seasonNumber && episodeNumber) {
        return `S${seasonNumber} E${episodeNumber}${episodeName ? `: ${episodeName}` : ''}`;
    }
    
    // Build standardized subtitle: Year • Episode/Season Count
    const parts = [];
    
    // Add year
    if (year) {
        parts.push(year.toString());
    }
    
    // Add episode/season count based on content type
    if (mediaType === 'anime' && episodes) {
        parts.push(`${episodes} episodes`);
    } else if (mediaType === 'tv' && numberOfSeasons) {
        const seasonText = numberOfSeasons === 1 ? 'season' : 'seasons';
        parts.push(`${numberOfSeasons} ${seasonText}`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : null;
};

/**
 * Get full image URL with proper resolution and proxying
 * @param {string} path - Image path (relative or absolute)
 * @param {boolean} isVisible - Whether the card is visible (for progressive loading)
 * @param {boolean} isAniList - Whether this is an AniList image
 * @returns {string} Full proxied image URL
 */
export const getCardImageUrl = (path, isVisible = true, isAniList = false) => {
    if (!path) {
        return 'https://via.placeholder.com/500x750/1a1a1a/ffffff?text=No+Image';
    }
    
    // For AniList images (which already have full URLs)
    if (isAniList || path.includes('anilist.co') || path.includes('anili.st') || path.includes('anilistcdn')) {
        return getProxiedImageUrl(path);
    }
    
    // For other full URLs, use the proxy directly
    if (path.startsWith('http')) {
        return getProxiedImageUrl(path);
    }
    
    // For TMDB relative paths, add resolution based on visibility
    if (path.startsWith('/')) {
        const resolution = isVisible ? 'w500' : 'w200';
        const fullUrl = `https://image.tmdb.org/t/p/${resolution}${path}`;
        return getProxiedImageUrl(fullUrl);
    }
    
    // For relative paths (TMDB), use the proxy with the base URL added
    return getProxiedImageUrl(path);
};

/**
 * Get anime/TV status badge information
 * @param {string} status - Status string from API
 * @returns {Object|null} Status info { text, class } or null
 */
export const getStatusBadgeInfo = (status) => {
    if (!status) return null;
    
    const statusMap = {
        'RELEASING': { text: 'Airing', class: 'airing' },
        'FINISHED': { text: 'Completed', class: 'completed' },
        'NOT_YET_RELEASED': { text: 'Upcoming', class: 'upcoming' },
        'CANCELLED': { text: 'Cancelled', class: 'cancelled' },
        'HIATUS': { text: 'Hiatus', class: 'hiatus' }
    };
    
    return statusMap[status] || null;
};

/**
 * Format next episode airing time
 * @param {number} timeUntilAiring - Time until airing in seconds
 * @returns {string|null} Formatted time string or null
 */
export const formatNextEpisodeTime = (timeUntilAiring) => {
    if (!timeUntilAiring || timeUntilAiring <= 0) return null;
    
    const days = Math.floor(timeUntilAiring / (24 * 60 * 60));
    const hours = Math.floor((timeUntilAiring % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((timeUntilAiring % (60 * 60)) / 60);
    
    if (days > 0) {
        return `${days}d ${hours}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m`;
    } else {
        return 'Soon';
    }
};

/**
 * Get normalized rating score (convert to 0-10 scale)
 * @param {number} score - Score from API (may be 0-10 or 0-100)
 * @param {number} voteAverage - Alternative vote average score
 * @returns {string} Formatted rating or 'N/A'
 */
export const getNormalizedRating = (score, voteAverage) => {
    const rating = score || voteAverage;
    if (!rating) return 'N/A';
    
    // Convert AniList score (0-100) to 0-10 scale if needed
    const normalizedScore = rating > 10 ? rating / 10 : rating;
    return normalizedScore.toFixed(1);
};

/**
 * Handle card click with proper routing
 * @param {Object} item - Media item
 * @param {string} type - Media type
 * @param {Function} onClick - Custom onClick handler
 * @param {Function} route - Router function
 */
export const handleCardRouting = (item, type, onClick, route) => {
    if (onClick) {
        onClick(item);
        return;
    }

    // Determine the correct routing based on source and type
    let link;
    
    if (item.source === 'tmdb' || type !== 'anime') {
        // For TMDB content
        const mediaType = item.media_type || type;
        const mediaId = item.tmdb_id || item.id;
        link = `/watch/${mediaType}/${mediaId}`;
        
        // For TV shows, add season/episode
        if (mediaType === 'tv') {
            if (item.season_number && item.episode_number) {
                link += `/season/${item.season_number}/episode/${item.episode_number}`;
            } else {
                link += `/season/1/episode/1`;
            }
        }
    } else {
        // For AniList content
        const animeId = item.anilist_id || item.id;
        link = `/watch/anime/${animeId}`;
        
        if (item.season_number && item.episode_number) {
            link += `/season/${item.season_number}/episode/${item.episode_number}`;
        } else {
            link += `/season/1/episode/1`;
        }
        
        // Add audio preference for anime
        const audioPreference = localStorage.getItem('anime-audio-preference') || 'subbed';
        if (audioPreference === 'dubbed') {
            link += '?dub=true';
        }
    }
    
    route(link);
};






