import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { route } from 'preact-router';
import Helmet from 'preact-helmet';
import { useStore } from '../store';
import MovieCard from '../components/MovieCard';
import { getWatchHistory, saveWatchProgress, getContentKey, getSeriesHistory, getLastWatchedEpisode } from '../utils/watchHistory';
import './Watch.css';

const Watch = (props) => {
    const [mediaDetails, setMediaDetails] = useState(null);
    const [videos, setVideos] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [streamUrl, setStreamUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentSeason, setCurrentSeason] = useState(1);
    const [currentEpisode, setCurrentEpisode] = useState(1);
    const [currentSource, setCurrentSource] = useState(props.matches.type === 'anime' ? 'consumet' : 'videasy');
    const [availableSources, setAvailableSources] = useState([]);
    const [seasonDetails, setSeasonDetails] = useState(null);
    const [episodesLoading, setEpisodesLoading] = useState(false);
    const [isDubbed, setIsDubbed] = useState(false);
    const [showNextEpisodePrompt, setShowNextEpisodePrompt] = useState(false);
    const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState(null);


    const [isDirectSource, setIsDirectSource] = useState(false);
    const [qualities, setQualities] = useState([]);
    const videoRef = useRef(null);
    const [seriesWatchHistory, setSeriesWatchHistory] = useState({});

    const { id, type } = props.matches;

    const { addFavorite, removeFavorite, isFavorited, addToHistory } = useStore();

    useEffect(() => {
        if (!id || !type) {
            route('/');
            return;
        }

        // Reset state on new content
        setStreamUrl('');
        setIsDirectSource(false);
        setQualities([]);
        setMediaDetails(null);
        setLoading(true);
        setShowNextEpisodePrompt(false);
        setNextEpisodeCountdown(null);
        setSeriesWatchHistory({});

        const fetchAllData = async () => {
            setLoading(true);
            try {
                const [detailsData, videosData, recommendationsData] = await Promise.all([
                    fetch(`/api/tmdb/${type}/${id}`).then(res => res.json()),
                    fetch(`/api/tmdb/${type}/${id}/videos`).then(res => res.json()),
                    fetch(`/api/tmdb/${type}/${id}/recommendations`).then(res => res.json())
                ]);
                setMediaDetails(detailsData);
                setVideos(videosData.results || []);
                setRecommendations(recommendationsData.results || []);
                if ((type === 'tv' || type === 'anime') && detailsData.seasons && detailsData.seasons.length > 0) {
                    const lastWatched = getLastWatchedEpisode(id);
                    if (lastWatched && lastWatched.season && lastWatched.episode) {
                        setCurrentSeason(lastWatched.season);
                        setCurrentEpisode(lastWatched.episode);
                    } else {
                        const firstSeason = detailsData.seasons.find(s => s.season_number > 0) || detailsData.seasons[0];
                        setCurrentSeason(firstSeason.season_number);
                        setCurrentEpisode(1);
                    }
                }
                addToHistory({ ...detailsData, type });
                if (type === 'tv' || type === 'anime') {
                    const history = getSeriesHistory(id);
                    setSeriesWatchHistory(history);
                }
            } catch (error) {
                console.error("Error fetching media details:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [id, type]);

    useEffect(() => {
        const fetchSeasonDetails = async () => {
            if (type !== 'tv' && type !== 'anime' || !id || !currentSeason) return;
            setEpisodesLoading(true);
            try {
                const apiPath = type === 'anime' ? 'anime' : 'tv';
                const res = await fetch(`/api/tmdb/${apiPath}/${id}/season/${currentSeason}`);
                if (res.ok) {
                    const data = await res.json();
                    setSeasonDetails(data);
                } else {
                    setSeasonDetails(null);
                }
            } catch (error) {
                console.error("Error fetching season details:", error);
                setSeasonDetails(null);
            } finally {
                setEpisodesLoading(false);
            }
        };
        fetchSeasonDetails();
    }, [id, type, currentSeason]);

    useEffect(() => {
        const fetchStreamUrl = async () => {
            if (!id || !type) return;

            // When changing episode, hide the prompt
            setShowNextEpisodePrompt(false);
            setNextEpisodeCountdown(null);

            let url = `/api/stream-url?type=${type}&id=${id}&source=${currentSource}`;
            if (type === 'tv' || type === 'anime') {
                url += `&season=${currentSeason}&episode=${currentEpisode}`;
                if (type === 'anime') {
                    url += `&dub=${isDubbed}`;
                }
            }

            try {
                const streamUrlData = await fetch(url).then(res => res.json());

                if (streamUrlData.isDirectSource) {
                    setStreamUrl(streamUrlData.url);
                    setQualities(streamUrlData.qualities || []);
                    setIsDirectSource(true);
                } else {
                    setStreamUrl(streamUrlData.url);
                    setIsDirectSource(false);
                    setQualities([]);
                }

                // If the backend signals a fallback, update the source
                if (streamUrlData.currentSource) {
                    setCurrentSource(streamUrlData.currentSource);
                }

                if (streamUrlData.availableSources) {
                    setAvailableSources(streamUrlData.availableSources);
                }
            } catch (error) {
                console.error("Error fetching stream URL:", error);
                setStreamUrl('');
                setIsDirectSource(false);
            }
        };

        fetchStreamUrl();
    }, [id, type, currentSeason, currentEpisode, currentSource, isDubbed]);

    const handleNextEpisode = () => {
        if (!seasonDetails || !seasonDetails.episodes) return;
        const currentEpisodeIndex = seasonDetails.episodes.findIndex(e => e.episode_number === currentEpisode);
        if (currentEpisodeIndex !== -1 && currentEpisodeIndex < seasonDetails.episodes.length - 1) {
            const nextEpisode = seasonDetails.episodes[currentEpisodeIndex + 1];
            setCurrentEpisode(nextEpisode.episode_number);
        } else {
            // Can add logic for next season here later
            console.log("End of season");
        }
        setShowNextEpisodePrompt(false);
        setNextEpisodeCountdown(null);
    };

    useEffect(() => {
        if (showNextEpisodePrompt && nextEpisodeCountdown === null) {
            setNextEpisodeCountdown(15); // Start countdown from 15 seconds
        }

        if (nextEpisodeCountdown > 0) {
            const timer = setTimeout(() => {
                setNextEpisodeCountdown(nextEpisodeCountdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (nextEpisodeCountdown === 0) {
            handleNextEpisode();
        }
    }, [showNextEpisodePrompt, nextEpisodeCountdown]);

    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement || !isDirectSource) return;

        const handleLoadedMetadata = () => {
            const history = getWatchHistory(id, type, currentSeason, currentEpisode);
            if (history && history.progress) {
                videoElement.currentTime = history.progress;
            }
        };

        const handleTimeUpdate = () => {
            saveWatchProgress(id, type, currentSeason, currentEpisode, videoElement.currentTime, videoElement.duration);
            
            // Show next episode prompt
            if (videoElement.duration > 0 && 
                (videoElement.currentTime / videoElement.duration) >= 0.95 && 
                !showNextEpisodePrompt &&
                (type === 'tv' || type === 'anime')
            ) {
                setShowNextEpisodePrompt(true);
            }
        };

        videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.addEventListener('timeupdate', handleTimeUpdate);

        return () => {
            videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
            videoElement.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, [streamUrl, isDirectSource, id, type, currentSeason, currentEpisode, handleNextEpisode, showNextEpisodePrompt]);
    
    if (loading) {
        return <div class="loading-spinner"></div>;
    }

    if (!mediaDetails) {
        return <div class="container"><p>Could not load media details.</p></div>;
    }
    
    const { title, name, overview, vote_average, release_date, first_air_date, runtime, number_of_seasons, genres, poster_path } = mediaDetails;
    const favorited = isFavorited(mediaDetails.id);
    const year = release_date || first_air_date ? new Date(release_date || first_air_date).getFullYear() : '';

    const handleFavoriteClick = () => {
        if (favorited) {
            removeFavorite(mediaDetails.id);
        } else {
            addFavorite({ ...mediaDetails, type });
        }
    };

    return (
        <div>
            <Helmet>
                <title>{title || name} - MyStream</title>
            </Helmet>
            <div class="player-container">
                {!streamUrl && (
                    <div class="stream-error-message">
                        <p>Could not load the video stream.</p>
                        <p>If this issue persists, please try selecting a different source from the list below.</p>
                    </div>
                )}
                {isDirectSource ? (
                    <video ref={videoRef} src={streamUrl} controls autoPlay width="100%"></video>
                ) : (
                    streamUrl && <iframe src={streamUrl} allowfullscreen></iframe>
                )}
                {showNextEpisodePrompt && (
                    <div class="next-episode-prompt">
                        <div class="next-episode-content">
                            <h3>Up Next</h3>
                            <p>Playing next episode in {nextEpisodeCountdown}s...</p>
                            <div class="next-episode-buttons">
                                <button onClick={handleNextEpisode} class="btn btn-primary">Play Next</button>
                                <button onClick={() => {
                                    setShowNextEpisodePrompt(false);
                                    setNextEpisodeCountdown(null);
                                }} class="btn">Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div class="container">
                <div class="media-details-layout">
                    <div class="poster">
                        <img src={poster_path ? `/api/image/t/p/w500${poster_path}` : 'https://via.placeholder.com/500x750.png?text=No+Image'} alt={title || name} />
                    </div>
                    <div class="details">
                        <div class="title-container">
                            <h1>{title || name}</h1>
                            <button onClick={handleFavoriteClick} class={`favorite-btn ${favorited ? 'favorited' : ''}`}>
                                {favorited ? '♥ Favorited' : '♡ Add to Favorites'}
                            </button>
                        </div>
                        <div class="meta">
                            <span class="rating">★ {mediaDetails.vote_average ? mediaDetails.vote_average.toFixed(1) : 'N/A'}</span>
                            <span>{year}</span>
                            {runtime && <span>{runtime} min</span>}
                            {number_of_seasons && <span>{number_of_seasons} Seasons</span>}
                        </div>
                        <div class="genres">
                            {genres && genres.map(g => <span class="genre-tag">{g.name}</span>)}
                        </div>
                        <p class="overview">{overview}</p>
                        {qualities.length > 0 && (
                            <div class="quality-selector">
                                <label>Quality:</label>
                                {qualities.map(q => (
                                    <button 
                                        class={`quality-btn ${streamUrl === q.url ? 'active' : ''}`}
                                        onClick={() => setStreamUrl(q.url)}
                                    >
                                        {q.quality}p
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                {type === 'anime' && (
                    <div class="select-container">
                        <label for="dub-select">Audio:</label>
                        <select
                            id="dub-select"
                            value={isDubbed}
                            onChange={(e) => setIsDubbed(e.target.value === 'true')}
                        >
                            <option value="false">Subbed</option>
                            <option value="true">Dubbed</option>
                        </select>
                    </div>
                )}

                <div class="selectors-container">
                    {(type === 'tv' || type === 'anime') && mediaDetails && mediaDetails.seasons && (
                        <div class="select-container">
                            <label>Season:</label>
                            <div class="selector-buttons">
                                {mediaDetails.seasons
                                    .filter(s => s.season_number > 0)
                                    .map(s => (
                                        <button
                                            key={s.id}
                                            class={`selector-btn ${currentSeason === s.season_number ? 'active' : ''}`}
                                            onClick={() => {
                                                setCurrentSeason(s.season_number);
                                                setCurrentEpisode(1);
                                            }}
                                        >
                                            {s.name}
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}
                    {availableSources.length > 1 && (
                         <div class="select-container">
                            <label>Source:</label>
                            <div class="selector-buttons">
                                {availableSources.map(source => (
                                    <button
                                        key={source}
                                        class={`selector-btn ${currentSource === source ? 'active' : ''}`}
                                        onClick={() => setCurrentSource(source)}
                                    >
                                        {source}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {(type === 'tv' || type === 'anime') && (
                    <div class="episodes-container">
                        <h3>Episodes</h3>
                        {episodesLoading ? (
                            <div class="loading-spinner"></div>
                        ) : (
                            <div class="episode-list">
                                {seasonDetails?.episodes?.map(episode => {
                                    const episodeKey = getContentKey(id, type, currentSeason, episode.episode_number);
                                    const episodeHistory = seriesWatchHistory[episodeKey];
                                    const progressPercent = episodeHistory ? (episodeHistory.progress / episodeHistory.duration) * 100 : 0;

                                    return (
                                        <div 
                                            key={episode.id}
                                            class={`episode-card ${episode.episode_number === currentEpisode ? 'active' : ''}`}
                                            onClick={() => setCurrentEpisode(episode.episode_number)}
                                        >
                                            <div class="episode-card-image">
                                                <img src={episode.still_path ? `/api/image/t/p/w300${episode.still_path}` : `https://via.placeholder.com/300x169.png?text=${encodeURIComponent(episode.name)}`} alt={episode.name} />
                                                <div class="episode-number-badge">{episode.episode_number}</div>
                                                {progressPercent > 0 && (
                                                    <div class="episode-progress-bar">
                                                        <div class="episode-progress" style={{width: `${progressPercent}%`}}></div>
                                                    </div>
                                                )}
                                            </div>
                                            <div class="episode-card-content">
                                                <h4>{episode.name}</h4>
                                                <p class="episode-overview">{episode.overview}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {recommendations.length > 0 && (
                    <div class="recommendations">
                        <h2>More Like This</h2>
                        <div class="movie-grid">
                            {recommendations.map(item => <MovieCard item={item} mediaType={type} />)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Watch; 