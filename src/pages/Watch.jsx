import { h } from 'preact';
import { useState, useEffect, useRef, useMemo, useCallback } from 'preact/hooks';
import { route } from 'preact-router';
import Helmet from 'preact-helmet';
import { useStore } from '../store';
import MovieCard from '../components/MovieCard';
import { getWatchProgressForMedia, saveWatchProgress, getSeriesHistory, getLastWatchedEpisode, getLastWatchedEpisodeWithProgress, syncOfflineProgress } from '../utils/watchHistory';
import { useAuth } from '../context/Auth';
import { addFavoriteShow, removeFavoriteShow } from '../utils/favorites';
import './Watch.css';
import { API_BASE_URL, IMAGE_BASE_URL, getProxiedImageUrl } from '../config';

const Watch = (props) => {
    const [mediaDetails, setMediaDetails] = useState(null);
    const [videos, setVideos] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [streamUrl, setStreamUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const playerContainerRef = useRef(null);
    const [currentSeason, setCurrentSeason] = useState(null);
    const [currentEpisode, setCurrentEpisode] = useState(null);
    const [currentSource, setCurrentSource] = useState('videasy');
    const [availableSources, setAvailableSources] = useState(['videasy', 'vidsrc', 'embedsu']);
    const [seasonDetails, setSeasonDetails] = useState(null);
    const [episodesLoading, setEpisodesLoading] = useState(false);
    const [isDubbed, setIsDubbed] = useState(false);
    // Removed showNextEpisodePrompt and nextEpisodeCountdown - Videasy handles this automatically
    const [streamError, setStreamError] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false);
    const [streamTimeoutError, setStreamTimeoutError] = useState(false);
    const streamTimeoutRef = useRef();
    const [error, setError] = useState(null);
    const { id, type, season, episode } = props.matches;
    const [tmdbId, setTmdbId] = useState(type === 'anime' ? null : id);
    const [mediaType, setMediaType] = useState(type === 'anime' ? 'anime' : type);
    const [showTrailer, setShowTrailer] = useState(false);


    const [isDirectSource, setIsDirectSource] = useState(false);
    const [qualities, setQualities] = useState([]);
    const videoRef = useRef(null);
    const [seriesWatchHistory, setSeriesWatchHistory] = useState([]);
    const [movieProgress, setMovieProgress] = useState(null);
    const [playerReady, setPlayerReady] = useState(false);
    const [progressToResume, setProgressToResume] = useState(0);
    const [currentEpisodePage, setCurrentEpisodePage] = useState(1);
    const [paginationPage, setPaginationPage] = useState(1);
    const [initialPageSet, setInitialPageSet] = useState(false);
    const episodesPerPage = 10;
    const sourceUpdatedFromBackend = useRef(false); // Track if source change is from backend
    const previousEpisodeRef = useRef(null); // Track previous episode to detect navigation
    const userNavigatedRef = useRef(false); // Track if user manually navigated to prevent auto-override
    const hasLoadedResumeData = useRef(false); // Track if we've already loaded resume data once
    const isAutoNavigating = useRef(false); // Track if navigation is driven by the player
    const lastPlayerEventNavigation = useRef(null); // Track last PLAYER_EVENT navigation to prevent conflicts
    const playerEventModeEnabled = useRef(false); // Track if PLAYER_EVENT mode is active
    const navigationTimeouts = useRef(new Set()); // Track active navigation timeouts
    const lastPlayerEventTime = useRef(0); // Debounce rapid PLAYER_EVENT messages
    const lastRouteChange = useRef(0); // Debounce route changes to prevent loops
    const routeChangeDebounceTime = 1000; // 1 second debounce for route changes
    const ignoredLegacyNavigation = useRef(null); // Track ignored legacy navigation to prevent log spam
    const lastHistoryUpdateRef = useRef({});
    const lastProgressSaveTime = useRef(0); // For throttling

    const { user } = useAuth(); // Get authentication state
    const userId = user?.id;
    const tmdbType = 'tv'; // Always use 'tv' for TMDB anime lookups

    const { setCurrentMediaItem, favoritesFetched, fetchContinueWatching, isShowFavorited } = useStore();

    // Initialize season and episode from URL parameters immediately
    useEffect(() => {
        if (type === 'tv' || type === 'anime') {
            const hasExplicitEpisode = season && episode && !isNaN(parseInt(season)) && !isNaN(parseInt(episode));
            if (hasExplicitEpisode) {
                const newSeason = parseInt(season, 10);
                const newEpisode = parseInt(episode, 10);
                setCurrentSeason(newSeason);
                setCurrentEpisode(newEpisode);
            } else {
                // For anime, default to season 1, episode 1
                // For TV shows, also default to season 1, episode 1
                setCurrentSeason(1);
                setCurrentEpisode(1);
            }
        } else {
            // For movies, set to null
            setCurrentSeason(null);
            setCurrentEpisode(null);
        }
    }, [type, season, episode]);

    // Calculate movie progress percentage with a memoized hook for efficiency
    const movieProgressPercent = useMemo(() => {
        if (type !== 'movie' || !movieProgress || !movieProgress.progress_seconds || movieProgress.progress_seconds <= 0) {
            return 0;
        }
        if (movieProgress.duration_seconds > 0) {
            return Math.min(100, (movieProgress.progress_seconds / movieProgress.duration_seconds) * 100);
        }
        // Fallback for when duration is missing: 5% if over 30s, otherwise 2%
        return movieProgress.progress_seconds > 30 ? 5 : 2;
    }, [type, movieProgress]);

    // Calculate and set initial episode page based on current episode
    const calculateInitialEpisodePage = useCallback((targetEpisode, totalEpisodes) => {
        if (!targetEpisode || !totalEpisodes) return 1;
        
        const page = Math.ceil(targetEpisode / episodesPerPage);
        return Math.max(1, Math.min(page, Math.ceil(totalEpisodes / episodesPerPage)));
    }, [episodesPerPage]);

    // Create stable user ID reference to prevent unnecessary re-renders
    const userIdRef = useRef(userId);
    
    // Update ref when userId changes but don't trigger re-renders
    useEffect(() => {
        userIdRef.current = userId;
    }, [userId]);

    // Helper function to debounce route changes and prevent loops
    const debouncedRoute = (url, replace = false) => {
        const now = Date.now();
        if (now - lastRouteChange.current < routeChangeDebounceTime) {
            console.log('🚫 Route change debounced to prevent refresh loop');
            return;
        }
        lastRouteChange.current = now;
        route(url, replace);
    };

    const handleTrailerClick = () => {
        const trailer = videos.find(video => video.type === 'Trailer' && video.site === 'YouTube');
        if (trailer) {
            setShowTrailer(true);
        } else {
            // Provide feedback if no trailer is available
            alert("No trailer available for this movie.");
        }
    };

    // Clear all navigation timeouts when component unmounts or episode changes
    useEffect(() => {
        return () => {
            navigationTimeouts.current.forEach(timeout => clearTimeout(timeout));
            navigationTimeouts.current.clear();
        };
    }, [currentSeason, currentEpisode]);

    // Handle fullscreen events to refresh auth when exiting fullscreen
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFullscreen = document.fullscreenElement || 
                               document.webkitFullscreenElement || 
                               document.mozFullScreenElement;
            
            if (!isFullscreen) {
                console.log('📱 Exited fullscreen mode, syncing progress...');
                // Try to sync any offline progress saved during fullscreen
                setTimeout(() => {
                    syncOfflineProgress(userId).catch(error => {
                        console.error('Error syncing offline progress after fullscreen:', error);
                    });
                }, 1000);
            }
        };
        
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
        };
    }, [userId]);

    useEffect(() => {
        // When the component mounts or mediaDetails changes, update the global state
        if (mediaDetails) {
            setCurrentMediaItem({ ...mediaDetails, type });
        }
        
        // When the component unmounts, clear the global state
        return () => {
            setCurrentMediaItem(null);
        };
    }, [mediaDetails, type, setCurrentMediaItem]);

    useEffect(() => {
        if (!id || !type) {
            route('/');
            return;
        }
        
        // Determine the correct handling based on the type parameter
        if (type === 'anime') {
            // For anime route, we use the anilist ID directly, so tmdbId can be null initially.
            // The API will handle the conversion.
            setMediaType('anime');
            setTmdbId(null); // Explicitly set to null to trigger fetches correctly
        } else if (type === 'tv' || type === 'movie') {
            // For regular TMDB content (TV shows and movies), set the IDs immediately
            setTmdbId(id);
            setMediaType(type);
        } else {
            // Handle any other cases by defaulting to the provided type
            setTmdbId(id);
            setMediaType(type);
        }

    }, [id, type]);

    useEffect(() => {
        // For non-anime, we need a tmdbId. For anime, we use the main `id` from props.
        if ((type !== 'anime' && !tmdbId) || (type === 'anime' && !id)) return;


        // Reset state on new content
        setStreamUrl('');
        setIsDirectSource(false);
        setQualities([]);
        setMediaDetails(null);
        setLoading(true);
        // Removed prompt reset - Videasy handles this automatically
        setSeriesWatchHistory([]);
        // Reset navigation tracking for new content
        userNavigatedRef.current = false;
        hasLoadedResumeData.current = false;
        isAutoNavigating.current = false;
        lastPlayerEventNavigation.current = null;
        playerEventModeEnabled.current = false;
        // Reset pagination state for new content
        setCurrentEpisodePage(1);
        setInitialPageSet(false);
        // Clear any pending navigation timeouts
        navigationTimeouts.current.forEach(timeout => clearTimeout(timeout));
        navigationTimeouts.current.clear();
        // Reset debounce timer
        lastPlayerEventTime.current = 0;
        // Reset ignored navigation log
        ignoredLegacyNavigation.current = null;

        const fetchAllData = async () => {
            setLoading(true);
            try {
                // Create abort controller for timeout handling
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
                
                // Fetch data with better error handling
                const anilistId = id; // Use the raw ID from props for anime
                
                // Use enhanced endpoint for anime content
                const detailsUrl = type === 'anime' 
                    ? `${API_BASE_URL}/tmdb/anime/${anilistId}/enhanced` 
                    : `${API_BASE_URL}/tmdb/${mediaType}/${tmdbId}`;
                
                // Videos are now included in enhanced endpoint for anime
                const videosUrl = type === 'anime' 
                    ? null // Will get videos from enhanced endpoint
                    : `${API_BASE_URL}/tmdb/${mediaType}/${tmdbId}/videos`;
                
                const recommendationsUrl = type === 'anime' 
                    ? `${API_BASE_URL}/tmdb/anime/${anilistId}/recommendations` 
                    : `${API_BASE_URL}/tmdb/${mediaType}/${tmdbId}/recommendations`;

                const fetchData = async (url, errorMessage) => {
                    if (!url) return null; // Skip null URLs
                    
                    try {
                        const res = await fetch(url, { signal: controller.signal });
                        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                        const data = await res.json();
                        // When using the anime route, update the tmdbId from the response
                        if (type === 'anime' && data._conversion?.tmdbId) {
                            setTmdbId(data._conversion.tmdbId);
                            // DO NOT change the mediaType. It should remain 'anime'.
                        }
                        // For enhanced endpoint, data already includes tmdb_id
                        if (type === 'anime' && data.tmdb_id) {
                            setTmdbId(data.tmdb_id);
                        }
                        return data;
                    } catch (err) {
                        console.error(`${errorMessage}:`, err);
                        // For videos/recs, return empty results to avoid breaking the page
                        if (errorMessage.includes('videos') || errorMessage.includes('recommendations')) {
                            return { results: [] };
                        }
                        throw err;
                    }
                };

                // For anime, fetch enhanced data only
                // For non-anime, fetch details and videos separately
                let detailsData, videosData, recommendationsData;
                
                if (type === 'anime') {
                    detailsData = await fetchData(detailsUrl, 'Error fetching anime details');
                    videosData = { results: detailsData?.videos?.results || [] };
                    recommendationsData = await fetchData(recommendationsUrl, 'Error fetching recommendations');
                } else {
                    [detailsData, videosData, recommendationsData] = await Promise.all([
                        fetchData(detailsUrl, 'Error fetching media details'),
                        fetchData(videosUrl, 'Error fetching videos'),
                        fetchData(recommendationsUrl, 'Error fetching recommendations')
                    ]);
                }
                
                clearTimeout(timeoutId);
                setMediaDetails(detailsData);
                setVideos(videosData.results || []);
                setRecommendations(recommendationsData.results || []);
                
                // Season and episode initialization is now handled in a separate effect
            } catch (error) {
                setMediaDetails(null);
                setVideos([]);
                setRecommendations([]);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [tmdbId, mediaType, season, episode, userId]);

    // Separate effect to handle authentication-dependent data loading - ONLY run once to avoid overriding user selections
    useEffect(() => {
        const loadUserSpecificData = async () => {
            if (!userId || !mediaDetails || !id || !type) {
                // Reset progress states when no user is authenticated
                if (type === 'movie') {
                    setMovieProgress(null);
                } else if (type === 'tv' || type === 'anime') {
                    setSeriesWatchHistory([]);
                }
                return;
            }
            
            try {
                // Only fetch user-specific data when user is authenticated
                if ((type === 'tv' || type === 'anime') && mediaDetails.seasons && mediaDetails.seasons.length > 0) {
                    const hasExplicitEpisode = season && episode && !isNaN(parseInt(season)) && !isNaN(parseInt(episode));
                    
                    // Modified logic: Always try to get continue watching when no explicit episode in URL
                    if (!hasExplicitEpisode && !hasLoadedResumeData.current && currentSeason !== null && currentEpisode !== null) {
                        console.log('🎬 Checking for continue watching episode...');
                        const lastWatchedWithProgress = await getLastWatchedEpisodeWithProgress(userId, id, tmdbType);
                        if (lastWatchedWithProgress && lastWatchedWithProgress.season_number && lastWatchedWithProgress.episode_number) {
                            console.log(`🔄 Continue watching: S${lastWatchedWithProgress.season_number}E${lastWatchedWithProgress.episode_number}`);
                            // Use a timeout to prevent immediate re-render loops
                            setTimeout(() => {
                                setCurrentSeason(lastWatchedWithProgress.season_number);
                                setCurrentEpisode(lastWatchedWithProgress.episode_number);
                                // Update URL to reflect the continue watching episode
                                const newUrl = `/watch/${type}/${id}/season/${lastWatchedWithProgress.season_number}/episode/${lastWatchedWithProgress.episode_number}`;
                                route(newUrl, true);
                            }, 100);
                        } else {
                            console.log('📭 No continue watching data found, starting from beginning');
                        }
                        hasLoadedResumeData.current = true;
                    }
                }
                
                if (type === 'tv' || type === 'anime') {
                    const history = await getSeriesHistory(userId, id, tmdbType);
                    console.log(`📺 [Watch] Series history loaded for ${type} ${id}:`, history);
                    setSeriesWatchHistory(history);
                }
                
                // Load progress data for all media types
                const progressData = await getWatchProgressForMedia(userId, id, type);
                console.log('Progress data loaded:', progressData);
                setMovieProgress(progressData);
            } catch (error) {
                console.error('Error loading user-specific data:', error);
            }
        };
        
        loadUserSpecificData();
    }, [userId, mediaDetails, id, type, season, episode, tmdbType]); // Remove season and episode from dependencies to prevent re-running when user changes selection

    // Reset pagination when season changes, but respect initial page setting
    useEffect(() => {
        if (currentSeason !== null && !initialPageSet) {
            setCurrentEpisodePage(1);
        }
    }, [currentSeason]);

    // Pagination state is now completely independent

    // Removed auto-navigation - pagination is now completely independent

    useEffect(() => {
        const fetchSeasonDetails = async () => {
            if ((type !== 'tv' && type !== 'anime') || !currentSeason || currentSeason === null) return;
            // Use tmdbId for TV shows, and the original `id` (AniList) for anime
            const mediaIdForRequest = type === 'anime' ? id : tmdbId;
            if (!mediaIdForRequest) return; // Don't fetch if the necessary ID isn't available yet

            setEpisodesLoading(true);
            try {
                const url = type === 'anime' ?
                    `${API_BASE_URL}/tmdb/anime/${mediaIdForRequest}/season/${currentSeason}` :
                    `${API_BASE_URL}/tmdb/${mediaType}/${mediaIdForRequest}/season/${currentSeason}`;
                
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch season details: ${response.statusText}`);
                }
                const data = await response.json();
                    setSeasonDetails(data);
                    
                // If this is the initial load, set the episode page based on the current episode
                if (!initialPageSet) {
                    const totalEpisodes = data.episodes.length;
                    const page = calculateInitialEpisodePage(currentEpisode, totalEpisodes);
                    setCurrentEpisodePage(page);
                        setInitialPageSet(true);
                    }

            } catch (error) {
                console.error("Error fetching season details:", error);
                setSeasonDetails(null);
            } finally {
                setEpisodesLoading(false);
            }
        };
        fetchSeasonDetails();
    }, [id, type, tmdbType, currentSeason, currentEpisode, initialPageSet, calculateInitialEpisodePage]);

    useEffect(() => {
        // Check if this is due to episode navigation
        const currentEpisodeKey = `${currentSeason}-${currentEpisode}`;
        const episodeChanged = previousEpisodeRef.current && previousEpisodeRef.current !== currentEpisodeKey;
        previousEpisodeRef.current = currentEpisodeKey;

        if (sourceUpdatedFromBackend.current && !episodeChanged) {
            sourceUpdatedFromBackend.current = false;
            return;
        }

        if (episodeChanged) {
            sourceUpdatedFromBackend.current = false;
        }

        const fetchStreamUrl = async () => {
            if (!tmdbId || !mediaType) return;


            // Use AniList ID for anime, TMDB ID for others.
            const streamId = type === 'anime' ? id : tmdbId;
            if (!streamId) return;

            setStreamError(null);
            setStreamTimeoutError(false);
            if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current);
            streamTimeoutRef.current = setTimeout(() => setStreamTimeoutError(true), 10000);

            const isAnimeMovie = type === 'anime' && mediaDetails && (!mediaDetails.seasons || mediaDetails.seasons.length === 0);
            
            if ((type === 'tv' || type === 'anime') && !isAnimeMovie && (currentSeason === null || currentEpisode === null)) {
                console.log("Season/episode not set, aborting stream URL fetch.");
                clearTimeout(streamTimeoutRef.current);
                return;
            }

            try {
                // Use `type` from props for the stream-url endpoint, `streamId` for the ID
                let url = `${API_BASE_URL}/stream-url?type=${type}&id=${streamId}&source=${currentSource}`;
            
            if (type === 'tv' || (type === 'anime' && !isAnimeMovie)) {
                url += `&season=${currentSeason}&episode=${currentEpisode}`;
            }
            
            if (type === 'anime' && isDubbed) {
                url += `&dub=true`;
            }
            
            if (currentSource === 'videasy') {
                if (progressToResume > 0) url += `&progress=${Math.round(progressToResume)}`;
                if (type === 'tv' || type === 'anime') {
                    url += `&nextEpisode=true&episodeSelector=true&autoplayNextEpisode=true`;
                }
            }

                console.log(`Fetching stream URL: ${url}`);
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Server responded with ${response.status}`);
                const data = await response.json();

                clearTimeout(streamTimeoutRef.current);
                
                if (data.url) {
                    console.log(`Stream URL generated: ${data.url}`);
                    setStreamUrl(data.url);
                    setIsDirectSource(data.isDirectSource || false);
                    setQualities(data.qualities || []);
                    if (data.availableSources && data.availableSources.length > 0) {
                        setAvailableSources(data.availableSources);
                    }
                    if (data.currentSource) {
                    sourceUpdatedFromBackend.current = true;
                        setCurrentSource(data.currentSource);
                }
                setStreamError(null);
                    setPlayerReady(true);
                } else {
                    throw new Error(data.message || 'No stream URL returned from API');
                }
            } catch (error) {
                clearTimeout(streamTimeoutRef.current);
                console.error('Error fetching stream URL:', error.message);
                setStreamError(`Failed to load video: ${error.message}. Try changing the source or refreshing.`);
                setPlayerReady(false);
            }
        };

        fetchStreamUrl();
    }, [tmdbId, mediaType, currentSeason, currentEpisode, currentSource, isDubbed, mediaDetails, progressToResume, userId]);

    // Removed handleNextEpisode and countdown logic - Videasy handles episode navigation automatically

    // Add immediate watch history entry when user navigates to watch page (throttled)
    // This useEffect hook has been removed as it was causing logic conflicts.
    // The saveWatchProgress function in the database now handles all history updates.
    /*
    useEffect(() => {
        if (user && mediaDetails) {
            const historyKey = `${id}-${type}-${currentSeason}-${currentEpisode}`;
            const now = Date.now();
            const lastHistoryUpdate = lastHistoryUpdateRef.current;
            
            if (!lastHistoryUpdate[historyKey] || now - lastHistoryUpdate[historyKey] > 5000) {
                console.log('📝 Adding immediate watch history entry:', {
                    mediaId: id,
                    type,
                    season: currentSeason,
                    episode: currentEpisode,
                    title: mediaDetails.title || mediaDetails.name
                });
                
                addWatchHistoryEntry(
                    { ...mediaDetails, id: mediaDetails.id, type, season: currentSeason, episode: currentEpisode }
                ).then(() => {
                    console.log('✅ Watch history entry added successfully');
                }).catch(error => {
                    console.error('❌ Failed to add watch history entry:', error);
                });
                
                lastHistoryUpdate[historyKey] = now;
            }
        }
    }, [user, mediaDetails, type, currentSeason, currentEpisode, id]);
    */

    // Progress tracking for different streaming services
    useEffect(() => {
        const currentUserId = userIdRef.current;
        if (currentUserId) {
            console.log('🔐 Progress tracking setup:', { 
                hasUser: true, 
                userId: currentUserId, 
                hasMediaDetails: !!mediaDetails 
            });
        }
        
        if (!currentUserId || !mediaDetails) {
            if (currentUserId && !mediaDetails) {
                console.log('⚠️ Progress tracking disabled - media details not yet available');
            }
            return;
        }

        // This function will be called by the message event listener
        const handleProgressUpdate = async (progressData, messageType) => {
            console.log(`📊 Progress update received via ${messageType}: `, progressData);
            
            // Determine the season and episode to save progress for.
            // Prioritize data from the event, then fall back to component state.
            const seasonToSave = progressData.season || currentSeason;
            const episodeToSave = progressData.episode || currentEpisode;

            if (progressData && progressData.progress >= 0 && progressData.duration > 0) {
                const now = Date.now();
                if (now - lastProgressSaveTime.current < 3000) { // 1-second throttle
                    return;
                }
                lastProgressSaveTime.current = now;
                
                try {
                    console.log(`🎬 Attempting to save progress for ${type} ${id}:`, {
                        progress: progressData.progress,
                        duration: progressData.duration,
                        season: seasonToSave,
                        episode: episodeToSave
                    });
                    
                    const saveResult = await saveWatchProgress(
                        currentUserId,
                        { ...mediaDetails, id: mediaDetails.id, type, season: seasonToSave, episode: episodeToSave },
                        progressData.progress,
                        progressData.duration
                    ).catch(error => {
                        console.error('❌ Progress save error caught:', error);
                        if (error.message?.includes('timeout') || error.message?.includes('auth')) {
                            // For auth timeouts, use localStorage fallback
                            const key = `offline_progress_${type}_${id}_${seasonToSave || 0}_${episodeToSave || 0}`;
                            const offlineData = {
                                media_id: id,
                                media_type: type,
                                season_number: seasonToSave,
                                episode_number: episodeToSave,
                                progress_seconds: progressData.progress,
                                duration_seconds: progressData.duration,
                                timestamp: new Date().toISOString()
                            };
                            localStorage.setItem(key, JSON.stringify(offlineData));
                            console.log('📱 Saved to localStorage after error');
                            return true; // Pretend success for UI consistency
                        }
                        return false;
                    });
                    
                    if (saveResult) {
                        console.log('✅ Progress saved successfully');
                        fetchContinueWatching(); // Refresh continue watching list

                        // Update state in real-time only if the progress applies to the currently viewed item
                        if (seasonToSave === currentSeason && episodeToSave === currentEpisode) {
                            if (type === 'movie') {
                                setMovieProgress({
                                    progress_seconds: progressData.progress,
                                    duration_seconds: progressData.duration
                                });
                            } else if (type === 'tv' || type === 'anime') {
                                setSeriesWatchHistory(prevHistory => {
                                    const historyCopy = [...prevHistory];
                                    const index = historyCopy.findIndex(
                                        h => h.season_number === seasonToSave && h.episode_number === episodeToSave
                                    );
                                
                                    const newProgressData = {
                                        media_id: parseInt(id, 10),
                                        media_type: type,
                                        season_number: seasonToSave,
                                        episode_number: episodeToSave,
                                        progress_seconds: progressData.progress,
                                        duration_seconds: progressData.duration,
                                    };
                                
                                    if (index > -1) {
                                        historyCopy[index] = { ...historyCopy[index], ...newProgressData };
                                    } else {
                                        historyCopy.push(newProgressData);
                                    }
                                
                                    return historyCopy;
                                });
                            }
                        }
                    } else {
                        console.error('❌ Failed to save progress, will retry on next update');
                    }
                } catch (error) {
                    console.error('❌ An unexpected error occurred while saving progress:', error);
                    // For any unexpected error, still try to use localStorage
                    try {
                        const key = `offline_progress_${type}_${id}_${seasonToSave || 0}_${episodeToSave || 0}`;
                        const offlineData = {
                            media_id: id,
                            media_type: type,
                            season_number: seasonToSave,
                            episode_number: episodeToSave,
                            progress_seconds: progressData.progress,
                            duration_seconds: progressData.duration,
                            timestamp: new Date().toISOString()
                        };
                        localStorage.setItem(key, JSON.stringify(offlineData));
                        console.log('📱 Saved to localStorage after exception');
                    } catch (storageError) {
                        console.error('💔 All save mechanisms failed:', storageError);
                    }
                }
            } else {
                console.log('⚠️ Progress update ignored (insufficient data):', {
                    hasProgressData: !!progressData,
                    progress: progressData?.progress,
                    duration: progressData?.duration,
                    meetsThreshold: progressData?.progress >= 0 && progressData?.duration > 0
                });
            }
        };

        let progressHandler;
        let messageListener;

        if (isDirectSource) {
            // Handle direct video sources (like MP4 files)
            const videoElement = videoRef.current;
            if (!videoElement) return;

            const handleLoadedMetadata = async () => {
                const history = await getWatchProgressForMedia(userId, id, type, currentSeason, currentEpisode);
                if (history && history.progress_seconds) {
                    videoElement.currentTime = history.progress_seconds;
                }
            };

            const handleTimeUpdate = async () => {
                if (videoElement.currentTime > 0) {
                    const now = Date.now();
                    if (now - lastProgressSaveTime.current < 1000) { // 5-second throttle
                        return;
                    }
                    lastProgressSaveTime.current = now;

                    const progressData = {
                        progress: Math.round(videoElement.currentTime),
                        duration: Math.round(videoElement.duration),
                        percentage: videoElement.duration > 0 ? (videoElement.currentTime / videoElement.duration) * 100 : 0
                    };
                    
                    console.log(`🎬 Direct video - saving progress:`, progressData);
                    
                    const saveResult = await saveWatchProgress(
                        userId,
                        { ...mediaDetails, id: mediaDetails.id, type, season: currentSeason, episode: currentEpisode },
                        progressData.progress,
                        progressData.duration
                    );
                    
                    if (saveResult) {
                        console.log('✅ Direct video progress saved successfully');

                        // Update state in real-time
                        if (type === 'movie') {
                            setMovieProgress({
                                progress_seconds: progressData.progress,
                                duration_seconds: progressData.duration
                            });
                        } else if (type === 'tv' || type === 'anime') {
                            setSeriesWatchHistory(prevHistory => {
                                const historyCopy = [...prevHistory];
                                const index = historyCopy.findIndex(
                                    h => h.season_number === currentSeason && h.episode_number === currentEpisode
                                );
                            
                                const newProgressData = {
                                    media_id: parseInt(id, 10),
                                    media_type: type,
                                    season_number: currentSeason,
                                    episode_number: currentEpisode,
                                    progress_seconds: progressData.progress,
                                    duration_seconds: progressData.duration,
                                };
                            
                                if (index > -1) {
                                    historyCopy[index] = { ...historyCopy[index], ...newProgressData };
                                } else {
                                    historyCopy.push(newProgressData);
                                }
                            
                                return historyCopy;
                            });
                        }
                    } else {
                        console.error('❌ Failed to save direct video progress');
                    }

                    // Removed next episode prompt logic - Videasy handles autoplay automatically
                    const timeRemaining = progressData.duration - progressData.progress;
                    // Videasy will handle next episode prompts automatically
                }
            };

            videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
            videoElement.addEventListener('timeupdate', handleTimeUpdate);

            return () => {
                videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
                videoElement.removeEventListener('timeupdate', handleTimeUpdate);
            };
        } else {
            messageListener = (event) => {
                const trustedDomains = ['player.videasy.net', 'vidsrc.to', 'embed.su', 'vidsrc.xyz', 'vidsrc.in', 'vidsrc.pm'];
                const origin = new URL(event.origin);
                
                if (!trustedDomains.includes(origin.hostname)) {
                    return;
                }

                try {
                    // Attempt to parse the data if it's a string, otherwise use it directly
                    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

                    // New: Efficient `PROGRESS_UPDATE` format from Videasy/other players
                    if (data && data.type === 'PROGRESS_UPDATE' && data.data) {
                        const progressData = {
                            progress: data.data.progress?.watched,
                            duration: data.data.progress?.duration,
                            // Ensure season/episode from the message are used if available
                            season: data.data.season || currentSeason,
                            episode: data.data.episode || currentEpisode
                        };
                        handleProgressUpdate(progressData, 'PROGRESS_UPDATE');
                        return; // Exit after handling
                    }

                    // Deprecated: Legacy `MEDIA_DATA` format for backward compatibility
                    if (data.type === 'MEDIA_DATA' && data.data) {
                    
                        let mediaData = data.data;
                        if (typeof mediaData === 'string') {
                            try {
                                mediaData = JSON.parse(mediaData);
                            } catch (e) {
                                console.error('Error parsing double-encoded MEDIA_DATA string:', e);
                                return;
                            }
                        }

                        // The data can be an object keyed by `tv-id`.
                        const mediaKey = `${type}-${id}`;
                        const media = mediaData[mediaKey];
                        
                        if (media && media.progress) {
                            const normalizedProgress = {
                                progress: media.progress.watched,
                                duration: media.progress.duration,
                                season: media.last_season_watched,
                                episode: media.last_episode_watched,
                            };
                            handleProgressUpdate(normalizedProgress, 'MEDIA_DATA');
                        }
                        return; // Exit after handling
                    }

                    // Generic event handling for other player messages
                    if (data.type === 'PLAYER_EVENT' && data.data) {
                        if (data.data.event === 'timeupdate') {
                            const progressData = {
                                progress: data.data.time,
                                duration: data.data.duration
                            };
                            if (progressData.progress && progressData.duration) {
                                handleProgressUpdate(progressData, 'PLAYER_EVENT');
                            }
                        } else if (data.data.event === 'ended' && (type === 'tv' || type === 'anime')) {
                            console.log('Player reported "ended" event - Videasy will handle next episode automatically.');
                            // Removed handleNextEpisode() - Videasy handles this automatically
                        } else if (data.data.event === 'player_ready') {
                            console.log('Player is ready.');
                            setPlayerReady(true);
                        }
                    }

                } catch (error) {
                    // This will catch JSON parsing errors or other exceptions
                    console.error("Error processing message from player:", {
                        origin: event.origin,
                        data: event.data,
                        error: error.message
                    });
                }
            };
            
            window.addEventListener('message', messageListener);
            
            // Fallback for players that don't send `player_ready` has been moved
            // to a dedicated useEffect hook that depends on streamUrl.

            return () => {
                window.removeEventListener('message', messageListener);
                if (progressHandler) clearInterval(progressHandler);
            };
        }
    }, [mediaDetails, isDirectSource, videoRef, currentSeason, currentEpisode, userId]);

    // This effect specifically handles the player ready timeout logic.
    // It only runs when a stream URL for an iframe is present.
    useEffect(() => {
        if (streamUrl && !isDirectSource && !playerReady) {
            const readyTimeout = setTimeout(() => {
                // Re-check playerReady state inside timeout to avoid race conditions
                if (!playerReady) {
                    console.warn('Player ready timeout, starting fallback progress tracking.');
                    startFallbackTracking();
                }
            }, 10000); // Increased timeout to 10 seconds for better reliability

            return () => clearTimeout(readyTimeout);
        }
    }, [streamUrl, isDirectSource, playerReady]);

    const startFallbackTracking = () => {
        // Fallback progress tracking if player doesn't post messages
        // This is a failsafe and should ideally not be relied upon
        const progressHandler = setInterval(() => {
            if (document.hasFocus()) {
                console.log('Fallback: Checking for progress...');
                // You would need a way to get progress from the iframe if possible,
                // but cross-origin restrictions make this very difficult.
                // This is a placeholder for a potential future implementation.
            }
        }, 15000);

        return () => clearInterval(progressHandler);
    };

    useEffect(() => {
        // Reset timeout error when streamUrl or error changes
        setStreamTimeoutError(false);
        if (!streamUrl && !streamError) {
            streamTimeoutRef.current = setTimeout(() => {
                setStreamTimeoutError(true);
                console.log('Stream timeout error');
            }, 25000); // 25 seconds
        }
        return () => {
            if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current);
        };
    }, [streamUrl, streamError, currentSeason, currentEpisode, currentSource]);

    if (error) {
        return (
            <div class="container" style={{ textAlign: 'center', marginTop: '50px' }}>
                <div class="error-state">
                    <h2>An Error Occurred</h2>
                    <p>{error}</p>
                    <button onClick={() => route('/')} class="btn btn-primary">Go Home</button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading media details...</p>
                <p>If your video doesnt load refresh the page or pick a new server.</p>
                
            </div>
        );
    }

    if (!mediaDetails) {
        return (
            <div class="container">
                <div class="error-state">
                    <h2>Unable to Load Media</h2>
                    <p>We couldn't load the details for this content. This could be due to:</p>
                    <ul>
                        <li>Network connectivity issues</li>
                        <li>The content may no longer be available</li>
                        <li>Server maintenance</li>
                    </ul>
                    <button 
                        onClick={() => window.location.reload()} 
                        class="btn btn-primary"
                        style={{ marginTop: '20px' }}
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }
    
    const { title, name, overview, vote_average, release_date, first_air_date, last_air_date, runtime, number_of_seasons, genres, poster_path, status } = mediaDetails;
    
    // Use AniList ID for anime, TMDB ID for others, and the correct type from props
    const favoritedId = type === 'anime' ? id : mediaDetails.id;
    const favorited = isShowFavorited(favoritedId, type);
    
    const year = release_date || first_air_date ? new Date(release_date || first_air_date).getFullYear() : '';

    const handleFavoriteClick = () => {
        // Ensure the correct ID (AniList for anime) and type are passed for both add and remove
        const itemToFavorite = { ...mediaDetails, id: favoritedId, type: type };
        if (favorited) {
            removeFavoriteShow(itemToFavorite);
        } else {
            addFavoriteShow(itemToFavorite);
        }
    };

    return (
        <div>
            <Helmet>
                <title>{title || name} - Fovi</title>
            </Helmet>

            {showTrailer && (
                <div className="trailer-modal" onClick={() => setShowTrailer(false)}>
                    <div className="trailer-content" onClick={(e) => e.stopPropagation()}>
                        <span className="close-trailer" onClick={() => setShowTrailer(false)}>&times;</span>
                        <iframe
                            src={`https://www.youtube.com/embed/${videos.find(v => v.type === 'Trailer')?.key}?autoplay=1`}
                            frameBorder="0"
                            allow="autoplay; encrypted-media; fullscreen"
                            allowFullScreen
                            title="Trailer"
                        ></iframe>
                    </div>
                </div>
            )}

            <div class="player-container">
                {!streamUrl && streamError && (
                    <div class="stream-error-message">
                        <p>{streamError.message}</p>
                        {streamError.canRetry && (
                            <div class="error-actions">
                                <button 
                                    onClick={async () => {
                                        setIsRetrying(true);
                                        // Wait a bit then retry
                                        setTimeout(() => {
                                            const fetchStreamUrl = async () => {
                                                const url = `${API_BASE_URL}/stream-url?type=${type}&id=${id}&source=${currentSource}${(type === 'tv' || type === 'anime') ? `&season=${currentSeason}&episode=${currentEpisode}` : ''}${type === 'anime' ? `&dub=${isDubbed}` : ''}`;
                                                
                                                try {
                                                    const response = await fetch(url);
                                                    const streamUrlData = await response.json();
                                                    
                                                    if (response.ok) {
                                                        setStreamUrl(streamUrlData.url);
                                                        setIsDirectSource(streamUrlData.isDirectSource);
                                                        setQualities(streamUrlData.qualities || []);
                                                        setStreamError(null);
                                                    } else {
                                                        throw new Error(streamUrlData.message);
                                                    }
                                                } catch (error) {
                                                    console.error('Retry failed:', error);
                                                    setStreamError({ 
                                                        message: "Retry failed. Please try selecting a different source.", 
                                                        canRetry: true 
                                                    });
                                                }
                                                setIsRetrying(false);
                                            };
                                            fetchStreamUrl();
                                        }, 1000);
                                    }}
                                    disabled={isRetrying}
                                    class="btn retry-btn"
                                >
                                    {isRetrying ? 'Retrying...' : 'Retry'}
                                </button>
                                <p>Or try selecting a different source from the list below.</p>
                            </div>
                        )}
                    </div>
                )}
                {!streamUrl && !streamError && !streamTimeoutError && (
                    <div class="stream-loading">
                        <p>Loading video stream... </p>
                        <p>If your video doesnt load refresh the page or pick a new server.</p>
                    </div>
                )}
                {/* PATCH: Show error if stream never loads */}
                {!streamUrl && !streamError && streamTimeoutError && (
                    <div class="stream-error-message">
                        <p>Sorry, this episode failed to load. Please refresh the page.</p>
                        <div class="error-actions">
                            <button 
                                onClick={() => window.location.reload()} 
                                class="btn retry-btn"
                            >
                                Refresh
                            </button>
                            <p>Or try selecting a different source from the list below if refreshing doesn't work.</p>
                        </div>
                    </div>
                )}
                {isDirectSource ? (
                    <video ref={videoRef} src={streamUrl} controls autoPlay width="100%"></video>
                ) : (
                    streamUrl && (
                        <iframe 
                            src={streamUrl}
                            width="100%"
                            height="100%"
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                            frameBorder="0"
                            allowFullScreen
                            allow="autoplay; fullscreen; picture-in-picture"
                            sandbox="allow-forms allow-pointer-lock allow-same-origin allow-scripts allow-top-navigation"
                            title="Video Player"
                            loading="eager"
                            referrerPolicy="no-referrer-when-downgrade"
                            importance="high"
                            onLoad={() => {
                                console.log('🎬 Player iframe loaded');
                                setPlayerReady(true);
                                
                                // Handle progress restoration via postMessage (only for non-Videasy sources)
                                // Videasy handles progress natively via URL parameters for faster loading
                                if (currentSource !== 'videasy' && progressToResume > 30) {
                                    setTimeout(() => {
                                        const iframe = document.querySelector('iframe');
                                        if (iframe && iframe.contentWindow) {
                                            try {
                                                iframe.contentWindow.postMessage({
                                                    type: 'SEEK_TO',
                                                    time: progressToResume
                                                }, '*');
                                                console.log(`📍 Sent seek command to restore progress: ${progressToResume}s`);
                                            } catch (e) {
                                                console.log('Could not send seek command:', e);
                                            }
                                        }
                                    }, 500); // Reduced to 500ms for faster response
                                } else if (currentSource === 'videasy') {
                                    console.log('📍 Videasy native resume - no seeking needed');
                                } else {
                                    console.log('📍 No significant progress to resume, starting from beginning');
                                }
                            }}
                        ></iframe>
                    )
                )}
                {/* Removed next episode prompt UI - Videasy handles this automatically */}
            </div>
            <div class="container">
                <div class="media-details-layout">
                    <div class="poster">
                        <img src={getProxiedImageUrl(poster_path ? `${IMAGE_BASE_URL}${poster_path}` : 'https://via.placeholder.com/500x750.png?text=No+Image')} alt={title || name} />
                        {movieProgressPercent > 0 && (
                            <div class="movie-progress-container">
                                <div class="movie-progress-bar">
                                    <div 
                                        class="movie-progress" 
                                        style={{ width: `${Math.max(2, movieProgressPercent)}%` }}
                                    ></div>
                                </div>
                                <div class="movie-progress-text">
                                    {movieProgress.duration_seconds > 0 
                                        ? `${Math.floor(movieProgress.progress_seconds / 60)}m / ${Math.floor(movieProgress.duration_seconds / 60)}m watched`
                                        : `${Math.floor(movieProgress.progress_seconds / 60)}m watched`
                                    }
                                </div>
                            </div>
                        )}
                    </div>
                                            <div class="details">
                        <div class="title-container">
                            <h1>{title || name}</h1>
                            <button
                                onClick={handleFavoriteClick}
                                class={`favorite-btn ${favorited ? 'favorited' : ''}`}
                                disabled={!favoritesFetched}
                            >
                                {favoritesFetched ? (favorited ? '♥ Favorited' : '♡ Favorite') : '...'}
                            </button>
                            <button
                                onClick={handleTrailerClick}
                                class="favorite-btn trailer-btn"
                            >
                                <i class="fas fa-film"></i> Trailer
                            </button>
                            {!user && (
                                <span class="login-hint">
                                    <small>
                                        <a href="/login" style={{ color: '#007bff', textDecoration: 'none' }}>
                                            Log in
                                        </a> to save favorites, track progress & continue watching
                                    </small>
                                </span>
                            )}
                        </div>
                        <div class="meta">
                            <span class="rating">★ {mediaDetails.vote_average ? mediaDetails.vote_average.toFixed(1) : 'N/A'}</span>
                            {(type === 'tv' || type === 'anime') && first_air_date && (
                                <span style={{ marginLeft: 8 }}>
                                    {(() => {
                                        const startYear = first_air_date ? new Date(first_air_date).getFullYear() : null;
                                        let endYear = null;
                                        if (last_air_date) {
                                            endYear = new Date(last_air_date).getFullYear();
                                        } else if (status && status.toLowerCase() === 'ended') {
                                            endYear = startYear;
                                        }
                                        if (startYear && endYear && startYear === endYear) {
                                            return `${startYear}`;
                                        } else if (startYear && endYear && endYear !== startYear) {
                                            return `${startYear} - ${endYear}`;
                                        } else if (startYear) {
                                            return `${startYear} -`;
                                        }
                                        return '';
                                    })()}
                                </span>
                            )}
                            
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
                                                console.log(`🎯 User manually selected season ${s.season_number}`);
                                                userNavigatedRef.current = true;
                                                ignoredLegacyNavigation.current = null; // Reset ignored navigation log
                                                const newUrl = `/watch/${type}/${id}/season/${s.season_number}/episode/1`;
                                                route(newUrl, true);
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

                {(type === 'tv' || type === 'anime') && currentSeason !== null && currentEpisode !== null && (
                    <div class="episodes-container">
                        <h3>Episodes</h3>
                        {episodesLoading ? (
                            <div class="loading-spinner"></div>
                        ) : (
                            <>
                                <div class="episode-list">
                                    {seasonDetails?.episodes
                                        ?.slice((currentEpisodePage - 1) * episodesPerPage, currentEpisodePage * episodesPerPage)
                                        ?.map(episode => {
                                            // Find the progress for this specific episode from the array
                                            const episodeHistory = seriesWatchHistory.find(
                                                h => h.season_number === currentSeason && h.episode_number === episode.episode_number
                                            );
                                            
                                            // Calculate progress percentage with better error handling and fallback
                                            const progressPercent = (() => {
                                                if (episodeHistory && episodeHistory.progress_seconds > 0) {
                                                    if (episodeHistory.duration_seconds && episodeHistory.duration_seconds > 0) {
                                                        return Math.min(100, (episodeHistory.progress_seconds / episodeHistory.duration_seconds) * 100);
                                                    }
                                                    // Fallback for when duration is not available.
                                                    // Show 5% for >30s, otherwise 2% to indicate some progress.
                                                    return episodeHistory.progress_seconds > 30 ? 5 : 2;
                                                }
                                                return 0;
                                            })();

                                            // Debug logging for progress data
                                            if (episodeHistory && episodeHistory.progress_seconds > 0) {
                                                console.log(`📊 Episode ${episode.episode_number} progress:`, {
                                                    progress_seconds: episodeHistory.progress_seconds,
                                                    duration_seconds: episodeHistory.duration_seconds,
                                                    progressPercent: progressPercent
                                                });
                                            }

                                            return (
                                                <div 
                                                    key={episode.id}
                                                    class={`episode-card ${episode.episode_number === currentEpisode ? 'active' : ''}`}
                                                    onClick={() => {
                                                        console.log(`🎯 User manually selected episode ${episode.episode_number}`);
                                                        userNavigatedRef.current = true;
                                                        ignoredLegacyNavigation.current = null; // Reset ignored navigation log
                                                        const newUrl = `/watch/${type}/${id}/season/${currentSeason}/episode/${episode.episode_number}`;
                                                        route(newUrl, true);
                                                    }}
                                                >
                                                    <div class="episode-card-image">
                                                        <img src={getProxiedImageUrl(episode.still_path ? (episode.still_path.startsWith('/anilist_images/') || episode.still_path.startsWith('http') ? episode.still_path : `${IMAGE_BASE_URL}${episode.still_path}`) : `https://via.placeholder.com/300x169.png?text=${encodeURIComponent(episode.name)}`)} alt={episode.name} />
                                                        <div class="episode-number-badge">{episode.episode_number}</div>
                                                        {progressPercent > 0 && (
                                                            <div class="episode-progress-container">
                                                                <div class="episode-progress-bar">
                                                                    <div class="episode-progress" style={{width: `${Math.max(2, progressPercent)}%`}}></div>
                                                                </div>
                                                                <div class="episode-progress-text">
                                                                    {episodeHistory && episodeHistory.duration_seconds > 0 
                                                                        ? `${Math.floor(episodeHistory.progress_seconds / 60)}m / ${Math.floor(episodeHistory.duration_seconds / 60)}m`
                                                                        : `${Math.floor(episodeHistory.progress_seconds / 60)}m watched`
                                                                    }
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div class="episode-card-content">
                                                        <h4>
                                                            {episode.name}
                                                            {episode.air_date && (
                                                                <span style={{ color: '#aaa', fontWeight: 400, fontSize: '0.95em', marginLeft: 8 }}>
                                                                    {'• '}
                                                                    {(() => {
                                                                        const d = new Date(episode.air_date);
                                                                        if (!isNaN(d)) {
                                                                            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                                                                        }
                                                                        return null;
                                                                    })()}
                                                                </span>
                                                            )}
                                                        </h4>
                                                        <p class="episode-overview">{episode.overview}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>

                                {/* Pagination Controls */}
                                {seasonDetails?.episodes && seasonDetails.episodes.length > episodesPerPage && (() => {
                        const totalPages = Math.ceil(seasonDetails.episodes.length / episodesPerPage);
                        const pagesPerPagination = 10;
                        const totalPaginationPages = Math.ceil(totalPages / pagesPerPagination);
                        const startPage = (paginationPage - 1) * pagesPerPagination + 1;
                        const endPage = Math.min(startPage + pagesPerPagination - 1, totalPages);
                        
                        const pageNumbers = Array.from({ length: (endPage - startPage + 1) }, (_, i) => startPage + i);

                        return (
                                    <div class="pagination-controls">
                                        {paginationPage > 1 && <button onClick={() => setPaginationPage(p => p - 1)}><i class="fas fa-angle-double-left"></i></button>}
                                        {pageNumbers.map(number => (
                                            <button
                                                key={number}
                                                class={currentEpisodePage === number ? 'active' : ''}
                                                onClick={() => setCurrentEpisodePage(number)}
                                            >
                                                {number}
                                            </button>
                                        ))}
                                        {paginationPage < totalPaginationPages && <button onClick={() => setPaginationPage(p => p + 1)}><i class="fas fa-angle-double-right"></i></button>}
                                    </div>
                        );
                    })()}
                            </>
                        )}
                    </div>
                )}

                {recommendations.length > 0 && (
                    <div class="recommendations">
                        <h2>More Like This</h2>
                        <div class="movie-grid">
                            {recommendations.map(item => (
                                <MovieCard 
                                    key={`${item.media_type || type}-${item.id}`}
                                    item={item} 
                                    type={type} 
                                    progress={null}
                                    duration={null}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Watch;