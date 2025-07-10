const WATCH_HISTORY_KEY = 'my-stream-watch-history';

// History is stored as an object:
// {
//   [contentKey]: { // contentKey can be `movie-${id}` or `tv-${id}-s${season}-e${episode}`
//     id: 'media-id',
//     type: 'movie' | 'tv',
//     season: 1, // for tv
//     episode: 1, // for tv
//     progress: 1234, // in seconds
//     duration: 2468, // in seconds
//     watchedAt: '2023-10-27T10:00:00.000Z'
//   },
//   [seriesId]: { // for tv shows, we also store the last watched timestamp for the whole series
//      lastWatched: '2023-10-27T10:00:00.000Z'
//   }
// }

export const getContentKey = (id, type, season, episode) => {
    if (type === 'movie') return `movie-${id}`;
    if (type === 'tv' || type === 'anime') return `tv-${id}-s${season}-e${episode}`;
    return id;
};

export const getHistoryStore = () => {
    try {
        const history = localStorage.getItem(WATCH_HISTORY_KEY);
        return history ? JSON.parse(history) : {};
    } catch (error) {
        console.error("Error reading watch history from localStorage:", error);
        return {};
    }
};

const saveHistoryStore = (history) => {
    try {
        localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.error("Error saving watch history to localStorage:", error);
    }
};

export const getWatchHistory = (id, type, season, episode) => {
    if (!id) return null;
    const history = getHistoryStore();
    const contentKey = getContentKey(id, type, season, episode);
    return history[contentKey] || null;
};

export const saveWatchProgress = (id, type, season, episode, progress, duration) => {
    if (!id || !type || typeof progress !== 'number' || typeof duration !== 'number') return;
    
    // Don't save for very short videos or at the very beginning
    if (duration < 60 || progress < 5) return;

    const history = getHistoryStore();
    const contentKey = getContentKey(id, type, season, episode);

    const record = {
        id,
        type,
        progress,
        duration,
        watchedAt: new Date().toISOString()
    };
    if (type === 'tv' || type === 'anime') {
        record.season = season;
        record.episode = episode;
        // Also update a timestamp for the whole series to keep it in the main history list
        history[id] = {
            lastWatched: new Date().toISOString(),
            type: type,
            season: season,
            episode: episode
        };
    }


    history[contentKey] = record;
    saveHistoryStore(history);
};

export const getSeriesHistory = (seriesId) => {
    const history = getHistoryStore();
    const seriesData = {};
    for (const key in history) {
        if (history[key].id === seriesId) {
            const item = history[key];
            const episodeKey = getContentKey(item.id, item.type, item.season, item.episode);
            seriesData[episodeKey] = item;
        }
    }
    return seriesData;
} 

export const getLastWatchedEpisode = (seriesId) => {
    const history = getHistoryStore();
    const seriesInfo = history[seriesId];
    if (seriesInfo && seriesInfo.season && seriesInfo.episode) {
        return { season: seriesInfo.season, episode: seriesInfo.episode };
    }
    return null;
}; 