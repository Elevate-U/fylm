import { h } from 'preact';
import { useState, useEffect, useRef, useMemo } from 'preact/hooks';
import { route } from 'preact-router';
import Helmet from 'preact-helmet';
import { useStore } from '../store';
import MovieCard from '../components/MovieCard';
import { getWatchProgressForMedia, saveWatchProgress, getSeriesHistory, getLastWatchedEpisode, getLastWatchedEpisodeWithProgress, addWatchHistoryEntry } from '../utils/watchHistory';
import { useAuth } from '../context/Auth';
import './Watch.css';
import { API_BASE_URL, IMAGE_BASE_URL, getProxiedImageUrl } from '../config';

const Watch = (props) => {
    const [mediaDetails, setMediaDetails] = useState(null);
    const [videos, setVideos] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [streamUrl, setStreamUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSeason, setCurrentSeason] = useState(1);
    const [currentEpisode, setCurrentEpisode] = useState(1);
    const [currentSource, setCurrentSource] = useState('videasy');
    const [availableSources, setAvailableSources] = useState(['videasy', 'vidsrc', 'embedsu']);
    const [seasonDetails, setSeasonDetails] = useState(null);
    const [episodesLoading, setEpisodesLoading] = useState(false);
    const [isDubbed, setIsDubbed] = useState(false);
    const [showNextEpisodePrompt, setShowNextEpisodePrompt] = useState(false);
    const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState(null);
    const [streamError, setStreamError] = useState(null);
    const [isRetrying, setIsRetrying] = useState(false);

    const [isDirectSource, setIsDirectSource] = useState(false);
    const [qualities, setQualities] = useState([]);
    const videoRef = useRef(null);
    const [seriesWatchHistory, setSeriesWatchHistory] = useState([]);
    const [movieProgress, setMovieProgress] = useState(null);
    const [playerReady, setPlayerReady] = useState(false);
    const [progressToResume, setProgressToResume] = useState(0);
    const [currentEpisodePage, setCurrentEpisodePage] = useState(1);
    const episodesPerPage = 6;
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

    const { id, type, season, episode } = props.matches;
    const { user } = useAuth(); // Get authentication state

    const { addFavorite, removeFavorite, isFavorited, setCurrentMediaItem } = useStore();

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

    // Create stable user ID reference to prevent unnecessary re-renders
    const userId = user?.id;
    const userIdRef = useRef(userId);
    const lastProgressSaveTime = useRef(0); // For throttling
    
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

    // Clear all navigation timeouts when component unmounts or episode changes
    useEffect(() => {
        return () => {
            navigationTimeouts.current.forEach(timeout => clearTimeout(timeout));
            navigationTimeouts.current.clear();
        };
    }, [currentSeason, currentEpisode]);

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

        // Reset state on new content
        setStreamUrl('');
        setIsDirectSource(false);
        setQualities([]);
        setMediaDetails(null);
        setLoading(true);
        setShowNextEpisodePrompt(false);
        setNextEpisodeCountdown(null);
        setSeriesWatchHistory([]);
        // Reset navigation tracking for new content
        userNavigatedRef.current = false;
        hasLoadedResumeData.current = false;
        isAutoNavigating.current = false;
        lastPlayerEventNavigation.current = null;
        playerEventModeEnabled.current = false;
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
                const [detailsData, videosData, recommendationsData] = await Promise.all([
                    fetch(`${API_BASE_URL}/tmdb/${type}/${id}`, { signal: controller.signal })
                        .then(res => {
                            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                            return res.json();
                        })
                        .catch(err => {
                            console.error('Error fetching media details:', err);
                            throw err;
                        }),
                    fetch(`${API_BASE_URL}/tmdb/${type}/${id}/videos`, { signal: controller.signal })
                        .then(res => {
                            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                            return res.json();
                        })
                        .catch(err => {
                            console.error('Error fetching videos:', err);
                            return { results: [] }; // Return empty array on error
                        }),
                    fetch(`${API_BASE_URL}/tmdb/${type}/${id}/recommendations`, { signal: controller.signal })
                        .then(res => {
                            if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                            return res.json();
                        })
                        .catch(err => {
                            console.error('Error fetching recommendations:', err);
                            return { results: [] }; // Return empty array on error
                        })
                ]);
                
                clearTimeout(timeoutId);
                setMediaDetails(detailsData);
                setVideos(videosData.results || []);
                setRecommendations(recommendationsData.results || []);
                
                // Set initial season/episode for TV shows
                if ((type === 'tv' || type === 'anime') && detailsData.seasons && detailsData.seasons.length > 0) {
                    const hasExplicitEpisode = season && episode && !isNaN(parseInt(season)) && !isNaN(parseInt(episode));
                    
                    if (hasExplicitEpisode) {
                        if (isAutoNavigating.current) {
                            isAutoNavigating.current = false;
                        } else {
                            userNavigatedRef.current = true;
                        }
                        // Use batch update to prevent multiple re-renders
                        const newSeason = parseInt(season, 10);
                        const newEpisode = parseInt(episode, 10);
                        if (newSeason !== currentSeason || newEpisode !== currentEpisode) {
                            setCurrentSeason(newSeason);
                            setCurrentEpisode(newEpisode);
                        }
                    } else {
                        const firstSeason = detailsData.seasons.find(s => s.season_number > 0) || detailsData.seasons[0];
                        // Only set if different to prevent unnecessary re-renders
                        if (firstSeason.season_number !== currentSeason || currentEpisode !== 1) {
                            setCurrentSeason(firstSeason.season_number);
                            setCurrentEpisode(1);
                        }
                    }
                }
            } catch (error) {
                setMediaDetails(null);
                setVideos([]);
                setRecommendations([]);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, [id, type, season, episode]); // Remove user from dependencies to prevent remount

    // Separate effect to handle authentication-dependent data loading - ONLY run once to avoid overriding user selections
    useEffect(() => {
        const loadUserSpecificData = async () => {
            if (!user || !mediaDetails || !id || !type) {
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
                    if (!hasExplicitEpisode && !hasLoadedResumeData.current) {
                        console.log('🎬 Checking for continue watching episode...');
                        const lastWatchedWithProgress = await getLastWatchedEpisodeWithProgress(id);
                        if (lastWatchedWithProgress && lastWatchedWithProgress.season && lastWatchedWithProgress.episode) {
                            console.log(`🔄 Continue watching: S${lastWatchedWithProgress.season}E${lastWatchedWithProgress.episode}`);
                            // Use a timeout to prevent immediate re-render loops
                            setTimeout(() => {
                                setCurrentSeason(lastWatchedWithProgress.season);
                                setCurrentEpisode(lastWatchedWithProgress.episode);
                                // Update URL to reflect the continue watching episode
                                const newUrl = `/watch/${type}/${id}/season/${lastWatchedWithProgress.season}/episode/${lastWatchedWithProgress.episode}`;
                                route(newUrl, true);
                            }, 100);
                        } else {
                            console.log('📭 No continue watching data found, starting from beginning');
                        }
                        hasLoadedResumeData.current = true;
                    }
                }
                
                if (type === 'tv' || type === 'anime') {
                    const history = await getSeriesHistory(id);
                    setSeriesWatchHistory(history);
                } else if (type === 'movie') {
                    // Load movie progress data
                    const progressData = await getWatchProgressForMedia(id, type);
                    console.log('Movie progress data loaded:', progressData);
                    setMovieProgress(progressData);
                }
            } catch (error) {
                console.error('Error loading user-specific data:', error);
            }
        };
        
        loadUserSpecificData();
    }, [user, mediaDetails, id, type]); // Remove season and episode from dependencies to prevent re-running when user changes selection

    // Reset pagination when season changes
    useEffect(() => {
        setCurrentEpisodePage(1);
    }, [currentSeason]);

    // Pagination state is now completely independent

    // Removed auto-navigation - pagination is now completely independent

    useEffect(() => {
        const fetchSeasonDetails = async () => {
            if (type !== 'tv' && type !== 'anime' || !id || !currentSeason) return;
            setEpisodesLoading(true);
            try {
                // Use the existing TMDB proxy route to fetch season details with timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                
                const res = await fetch(`${API_BASE_URL}/tmdb/${type}/${id}/season/${currentSeason}`, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                if (res.ok) {
                    const data = await res.json();
                    setSeasonDetails(data);
                } else {
                    setSeasonDetails(null);
                }
            } catch (error) {
                setSeasonDetails(null);
            } finally {
                setEpisodesLoading(false);
            }
        };
        fetchSeasonDetails();
    }, [id, type, currentSeason]);

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
            if (!id || !type) return;

            setShowNextEpisodePrompt(false);
            setNextEpisodeCountdown(null);
            setStreamError(null);
            setIsRetrying(false);

            // Fetch progress directly to avoid race conditions and ensure URL is up-to-date
            let existingProgress = 0;
            if (userIdRef.current) {
                try {
                    const progressData = await getWatchProgressForMedia(id, type, currentSeason, currentEpisode);
                    if (progressData && progressData.progress_seconds > 30) {
                        existingProgress = progressData.progress_seconds;
                        setProgressToResume(progressData.progress_seconds); // Update state for UI elements
                    } else {
                        setProgressToResume(0);
                    }
                } catch (error) {
                    console.error('Error fetching progress for stream URL:', error);
                    setProgressToResume(0);
                }
            } else {
                setProgressToResume(0);
            }

            let url = `${API_BASE_URL}/stream-url?type=${type}&id=${id}&source=${currentSource}`;
            if (type === 'tv' || type === 'anime') {
                url += `&season=${currentSeason}&episode=${currentEpisode}`;
                if (type === 'anime') {
                    url += `&dub=${isDubbed}`;
                }
            }
            
            if (currentSource === 'videasy' && existingProgress > 30) {
                url += `&progress=${Math.floor(existingProgress)}`;
            }

            try {
                // Add timeout to stream URL fetch
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout for streams
                
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeoutId);
                const streamUrlData = await response.json();

                if (!response.ok) {
                    throw new Error(streamUrlData.message || `HTTP ${response.status}`);
                }

                let finalStreamUrl = streamUrlData.url;
                
                if (streamUrlData.isDirectSource) {
                    setStreamUrl(finalStreamUrl);
                    setQualities(streamUrlData.qualities || []);
                    setIsDirectSource(true);
                } else {
                    setStreamUrl(finalStreamUrl);
                    setIsDirectSource(false);
                    setQualities([]);
                }

                if (streamUrlData.currentSource && streamUrlData.currentSource !== currentSource) {
                    sourceUpdatedFromBackend.current = true;
                    setCurrentSource(streamUrlData.currentSource);
                }

                if (streamUrlData.availableSources) {
                    setAvailableSources(streamUrlData.availableSources);
                }

                setStreamError(null);
            } catch (error) {
                let errorMessage = "Could not load the video stream.";
                let canRetry = true;
                
                if (error.name === 'AbortError') {
                    errorMessage = "Stream request timed out. Please try again.";
                } else if (error.message.includes('unavailable')) {
                    errorMessage = "All streaming sources are currently unavailable. This is usually temporary.";
                } else if (error.message.includes('503')) {
                    errorMessage = "Streaming service is temporarily down. Please try again in a few minutes.";
                } else if (error.message.includes('404')) {
                    errorMessage = "This content is not available from the current source.";
                } else if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
                    errorMessage = "Network connection issue. Please check your internet and try again.";
                } else {
                    errorMessage = "Unable to load video stream. This might be due to leaving and returning to the browser.";
                }
                
                setStreamError({ message: errorMessage, canRetry });
                setStreamUrl('');
                setIsDirectSource(false);
            }
        };

        fetchStreamUrl();
    }, [id, type, currentSeason, currentEpisode, currentSource, isDubbed]); // Add back necessary dependencies but with smart prevention

    const handleNextEpisode = () => {
        if (!seasonDetails || !seasonDetails.episodes) return;
        const currentEpisodeIndex = seasonDetails.episodes.findIndex(e => e.episode_number === currentEpisode);
        if (currentEpisodeIndex !== -1 && currentEpisodeIndex < seasonDetails.episodes.length - 1) {
            const nextEpisode = seasonDetails.episodes[currentEpisodeIndex + 1];
            setCurrentEpisode(nextEpisode.episode_number);
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

    // Add immediate watch history entry when user navigates to watch page (throttled)
    useEffect(() => {
        if (user && mediaDetails) {
            const historyKey = `${id}-${type}-${currentSeason}-${currentEpisode}`;
            const now = Date.now();
            const lastHistoryUpdate = window.lastHistoryUpdate || {};
            
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
                
                window.lastHistoryUpdate = { ...lastHistoryUpdate, [historyKey]: now };
            }
        } else {
            console.log('⚠️ Skipping watch history entry:', {
                hasUser: !!user,
                hasMediaDetails: !!mediaDetails
            });
        }
    }, [user, mediaDetails, type, currentSeason, currentEpisode, id]);

    // Progress tracking for different streaming services
    useEffect(() => {
        console.log('🔐 Progress tracking setup:', { 
            hasUser: !!user, 
            userId: user?.id, 
            hasMediaDetails: !!mediaDetails 
        });
        
        if (!user || !mediaDetails) {
            console.log('⚠️ Progress tracking disabled - missing user or media details');
            return;
        }

        const handleProgressUpdate = async (progressData, messageType) => {
            console.log(`📊 Progress update received via ${messageType}:`, progressData);
            
            if (progressData && progressData.progress >= 0 && progressData.duration > 0) {
                const now = Date.now();
                const progressKey = `${id}-${type}-${currentSeason}-${currentEpisode}`;
                const lastProgressSave = window.lastProgressSave || {};
                
                if (!lastProgressSave[progressKey] || now - lastProgressSave[progressKey] > 5000) {
                    console.log(`🎬 Attempting to save progress for ${type} ${id}:`, {
                        progress: progressData.progress,
                        duration: progressData.duration,
                        season: currentSeason,
                        episode: currentEpisode
                    });
                    
                    const saveResult = await saveWatchProgress(
                        { ...mediaDetails, id: mediaDetails.id, type, season: currentSeason, episode: currentEpisode },
                        progressData.progress,
                        progressData.duration / 60
                    );
                    
                    if (saveResult) {
                        console.log('✅ Progress saved successfully');
                        window.lastProgressSave = { ...lastProgressSave, [progressKey]: now };

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
                        console.error('❌ Failed to save progress');
                    }
                } else {
                    console.log('⏭️ Progress save skipped (too recent):', {
                        timeSinceLastSave: now - lastProgressSave[progressKey],
                        threshold: 5000
                    });
                }

                const timeRemaining = progressData.duration - progressData.progress;
                if (timeRemaining <= 15 && timeRemaining > 0 && !showNextEpisodePrompt && (type === 'tv' || type === 'anime')) {
                    setShowNextEpisodePrompt(true);
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
                const history = await getWatchProgressForMedia(id, type, currentSeason, currentEpisode);
                if (history && history.progress_seconds) {
                    videoElement.currentTime = history.progress_seconds;
                }
            };

            const handleTimeUpdate = async () => {
                if (videoElement.currentTime > 0) {
                    const now = Date.now();
                    const progressKey = `${id}-${type}-${currentSeason}-${currentEpisode}`;
                    const lastProgressSave = window.lastProgressSave || {};
                    
                    if (!lastProgressSave[progressKey] || now - lastProgressSave[progressKey] > 5000) {
                        const progressData = {
                            progress: Math.round(videoElement.currentTime),
                            duration: Math.round(videoElement.duration),
                            percentage: videoElement.duration > 0 ? (videoElement.currentTime / videoElement.duration) * 100 : 0
                        };
                        
                        console.log(`🎬 Direct video - saving progress:`, progressData);
                        
                        const saveResult = await saveWatchProgress(
                            { ...mediaDetails, id: mediaDetails.id, type, season: currentSeason, episode: currentEpisode },
                            progressData.progress,
                            progressData.duration / 60
                        );
                        
                        if (saveResult) {
                            console.log('✅ Direct video progress saved successfully');
                            window.lastProgressSave = { ...lastProgressSave, [progressKey]: now };

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

                        const timeRemaining = progressData.duration - progressData.progress;
                        if (timeRemaining <= 15 && timeRemaining > 0 && !showNextEpisodePrompt && (type === 'tv' || type === 'anime')) {
                            setShowNextEpisodePrompt(true);
                        }
                    }
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
                    let data;
                    if (typeof event.data === 'string') {
                        try {
                            data = JSON.parse(event.data);
                        } catch (e) {
                            console.error('Error parsing player message:', e);
                            return;
                        }
                    } else {
                        data = event.data;
                    }

                    if (data.type === 'PLAYER_EVENT' && data.data) {
                        if (data.data.event === 'timeupdate') {
                            const progressData = {
                                progress: data.data.currentTime,
                                duration: data.data.duration,
                                mediaId: data.data.id,
                                mediaType: data.data.mediaType,
                                season: data.data.season,
                                episode: data.data.episode,
                            };
                            handleProgressUpdate(progressData, origin.hostname);
                        } else if (data.data.event === 'ended') {
                            handleMediaEnded();
                        } else if (data.data.event === 'play') {
                            setIsPlaying(true);
                        } else if (data.data.event === 'pause') {
                            setIsPlaying(false);
                        }
                    } else if (data.type === 'MEDIA_DATA') {
                        // The player sends a large data object with all watch history
                        // We can ignore this for now as we handle progress updates directly
                    } else if (data.type === 'VIDEASY_EVENT' && data.event === 'player_ready') {
                        setPlayerReady(true);
                        console.log('🎉 Videasy Player is ready!');
                        postPlayerMessage({ action: 'get_history' });
                    } else if (data.type === 'request_seek' && data.time) {
                        console.log(`Seeking to ${data.time}`);
                        postPlayerMessage({ action: 'seek', time: data.time });
                    }
                } catch (error) {
                    console.error('Error handling message from player:', error);
                }
            };

            window.addEventListener('message', messageListener);

            // Fallback: periodically save progress for iframe sources if no messages are received
            let fallbackInterval;
            const startFallbackTracking = () => {
                if (fallbackInterval) clearInterval(fallbackInterval);
                
                fallbackInterval = setInterval(() => {
                    // For iframe sources, we can't directly access the video progress
                    // But we can at least mark that the user is still watching
                    if (user && mediaDetails && streamUrl) {
                        const now = Date.now();
                        const historyKey = `${id}-${type}-${currentSeason}-${currentEpisode}`;
                        const lastHistoryUpdate = window.lastHistoryUpdate || {};
                        
                        // Only add fallback history if no recent updates (use same throttling as main history)
                        if (!lastHistoryUpdate[historyKey] || now - lastHistoryUpdate[historyKey] > 30000) {
                            // console.log('Fallback: Adding watch history entry due to no progress messages');
                            addWatchHistoryEntry(
                                { ...mediaDetails, id: mediaDetails.id, type, season: currentSeason, episode: currentEpisode }
                            );
                            window.lastHistoryUpdate = { ...lastHistoryUpdate, [historyKey]: now };
                        }
                    }
                }, 60000); // Every 60 seconds instead of 30
            };

            // Start fallback tracking after 120 seconds if no messages received (increased from 60)
            const fallbackTimeout = setTimeout(() => {
                // console.log('No progress messages received, starting fallback tracking');
                startFallbackTracking();
            }, 120000);

            return () => {
                window.removeEventListener('message', messageListener);
                if (fallbackInterval) clearInterval(fallbackInterval);
                if (fallbackTimeout) clearTimeout(fallbackTimeout);
            };
        }
    }, [streamUrl, isDirectSource, id, type, currentSeason, currentEpisode, mediaDetails, showNextEpisodePrompt, user]);
    
    if (loading) {
        return (
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading media details...</p>
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
    
    const { title, name, overview, vote_average, release_date, first_air_date, runtime, number_of_seasons, genres, poster_path } = mediaDetails;
    
    // For TV episodes, check if this specific episode is favorited
    const isEpisode = (type === 'tv' || type === 'anime') && currentSeason && currentEpisode;
    const favorited = isEpisode 
        ? isFavorited(mediaDetails.id, currentSeason, currentEpisode)
        : isFavorited(mediaDetails.id);
    
    const year = release_date || first_air_date ? new Date(release_date || first_air_date).getFullYear() : '';

    const handleFavoriteClick = () => {
        if (!user) {
            // Show a message prompting to log in for favorites
            if (window.confirm('You need to log in to save favorites. Would you like to go to the login page?')) {
                route('/login');
            }
            return;
        }
        
        if (favorited) {
            if (isEpisode) {
                removeFavorite(mediaDetails.id, currentSeason, currentEpisode);
            } else {
                removeFavorite(mediaDetails.id);
            }
        } else {
            if (isEpisode) {
                // For TV episodes, we need to get episode name from season details
                const currentEpisodeData = seasonDetails?.episodes?.find(ep => ep.episode_number === currentEpisode);
                addFavorite({ 
                    ...mediaDetails, 
                    type, 
                    season_number: currentSeason, 
                    episode_number: currentEpisode,
                    episode_name: currentEpisodeData?.name || `Episode ${currentEpisode}`
                });
            } else {
                addFavorite({ ...mediaDetails, type });
            }
        }
    };

    return (
        <div>
            <Helmet>
                <title>{title || name} - FreeStream</title>
            </Helmet>
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
                {!streamUrl && !streamError && (
                    <div class="stream-loading">
                        <p>Loading video stream...</p>
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
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                            title="Video Player"
                            loading="eager"
                            referrerPolicy="no-referrer-when-downgrade"
                            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-pointer-lock allow-popups-to-escape-sandbox"
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
                            <button onClick={handleFavoriteClick} class={`favorite-btn ${favorited ? 'favorited' : ''}`}>
                                {favorited ? '♥ Favorited' : '♡'}
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
                            {year && <span>{year}</span>}
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

                {(type === 'tv' || type === 'anime') && (
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
                                                        <img src={getProxiedImageUrl(episode.still_path ? `${IMAGE_BASE_URL}${episode.still_path}` : `https://via.placeholder.com/300x169.png?text=${encodeURIComponent(episode.name)}`)} alt={episode.name} />
                                                        <div class="episode-number-badge">{episode.episode_number}</div>
                                                        {progressPercent > 0 && (
                                                            <div class="episode-progress-bar">
                                                                <div class="episode-progress" style={{width: `${Math.max(2, progressPercent)}%`}}></div>
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

                                {/* Pagination Controls */}
                                {seasonDetails?.episodes && seasonDetails.episodes.length > episodesPerPage && (
                                    <div class="pagination-controls">
                                        <button 
                                            class="pagination-btn" 
                                            onClick={() => setCurrentEpisodePage(prev => Math.max(1, prev - 1))}
                                            disabled={currentEpisodePage === 1}
                                        >
                                            ← Previous
                                        </button>
                                        
                                        <div class="pagination-info">
                                            <span class="page-numbers">
                                                {Array.from({ length: Math.ceil(seasonDetails.episodes.length / episodesPerPage) }, (_, i) => i + 1).map(pageNum => (
                                                    <button
                                                        key={pageNum}
                                                        class={`page-number ${pageNum === currentEpisodePage ? 'active' : ''}`}
                                                        onClick={() => setCurrentEpisodePage(pageNum)}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                ))}
                                            </span>
                                            <span class="page-text">
                                                Page {currentEpisodePage} of {Math.ceil(seasonDetails.episodes.length / episodesPerPage)} 
                                                ({seasonDetails.episodes.length} episodes)
                                            </span>
                                        </div>
                                        
                                        <button 
                                            class="pagination-btn" 
                                            onClick={() => setCurrentEpisodePage(prev => Math.min(Math.ceil(seasonDetails.episodes.length / episodesPerPage), prev + 1))}
                                            disabled={currentEpisodePage === Math.ceil(seasonDetails.episodes.length / episodesPerPage)}
                                        >
                                            Next →
                                        </button>
                                    </div>
                                )}
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