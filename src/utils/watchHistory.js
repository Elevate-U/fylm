import { supabase } from '../supabase';
import { API_BASE_URL } from '../config';

const getCurrentUserId = async () => {
    const maxRetries = 2;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
        try {
            // Add timeout to prevent hanging auth requests
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Auth timeout')), 5000)
            );
            
            const authPromise = supabase.auth.getSession();
            const { data: { session }, error } = await Promise.race([authPromise, timeoutPromise]);
            
            if (error) {
                console.error('Error getting current session:', error);
                
                // Retry on network errors
                if (error.message && error.message.includes('NetworkError') && retryCount < maxRetries - 1) {
                    retryCount++;
                    console.log(`Retrying auth session (attempt ${retryCount + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
                    continue;
                }
                return null;
            }
            return session?.user?.id || null;
        } catch (error) {
            console.error('Error in getCurrentUserId:', error);
            
            // Retry on network or timeout errors
            if ((error.message && (error.message.includes('NetworkError') || error.message.includes('timeout'))) && retryCount < maxRetries - 1) {
                retryCount++;
                console.log(`Retrying auth due to network error (attempt ${retryCount + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
                continue;
            }
            
            return null;
        }
    }
    
    console.error('Failed to get user session after all retry attempts');
    return null;
};

export const getWatchHistory = async () => {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) {
                console.log('No authenticated user, returning empty watch history');
                return [];
            }

            // Add timeout to prevent hanging requests
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timeout')), 10000)
            );
            
            const queryPromise = supabase
                .from('watch_history')
                .select('*')
                .eq('user_id', userId)
                .order('watched_at', { ascending: false });

            const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

            if (error) {
                console.error('Error fetching watch history:', error);
                
                // Check if it's a network error that we should retry
                if (error.message && error.message.includes('NetworkError') && retryCount < maxRetries - 1) {
                    retryCount++;
                    console.log(`Retrying watch history fetch (attempt ${retryCount + 1}/${maxRetries})`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
                    continue;
                }
                return [];
            }
            return data || [];
            
        } catch (error) {
            console.error('Error in getWatchHistory:', error);
            
            // Check if it's a network or timeout error that we should retry
            if ((error.message && (error.message.includes('NetworkError') || error.message.includes('timeout'))) && retryCount < maxRetries - 1) {
                retryCount++;
                console.log(`Retrying watch history fetch due to network error (attempt ${retryCount + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
                continue;
            }
            
            return [];
        }
    }
    
    console.error('Failed to fetch watch history after all retry attempts');
    return [];
};

export const getWatchProgressForMedia = async (mediaId, mediaType, season, episode) => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            console.log('No authenticated user, returning null progress');
            return null;
        }

        let query = supabase
            .from('watch_progress')
            .select('progress_seconds, duration_seconds')
            .eq('user_id', userId)
            .eq('media_id', mediaId)
            .eq('media_type', mediaType);
        
        if (mediaType !== 'movie') {
            query = query.eq('season_number', season).eq('episode_number', episode);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching watch progress:', error);
            return null;
        }
        
        // Return the first result if it exists, otherwise null
        return data && data.length > 0 ? data[0] : null;
    } catch (error) {
        console.error('Error in getWatchProgressForMedia:', error);
        return null;
    }
};

export const getContinueWatching = async () => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            console.log('No authenticated user, returning empty continue watching list');
            return [];
        }

        console.log('🔍 Fetching continue watching from watch_history...');

        // Get all watch history entries, grouped by media_id to find the most advanced episode for each series
        const { data: historyData, error: historyError } = await supabase
            .from('watch_history')
            .select('media_id, media_type, season_number, episode_number, watched_at')
            .eq('user_id', userId)
            .order('watched_at', { ascending: false });

        if (historyError) {
            console.error('Error fetching watch history for continue watching:', historyError);
            return [];
        }

        if (!historyData || historyData.length === 0) {
            console.log('📭 No watch history found');
            return [];
        }

        console.log(`📊 Found ${historyData.length} watch history entries`);

        // Group by media_id and find the most advanced episode for each series/movie
        const mediaMap = new Map();
        
        historyData.forEach(entry => {
            const mediaKey = entry.media_id;
            
            if (!mediaMap.has(mediaKey)) {
                mediaMap.set(mediaKey, []);
            }
            mediaMap.get(mediaKey).push(entry);
        });

        // For each media, find the most advanced episode
        const continueWatchingEntries = [];
        
        for (const [mediaId, entries] of mediaMap) {
            // Sort entries by season and episode to find the most advanced
            const sortedEntries = entries.sort((a, b) => {
                // For movies, just use the most recent
                if (a.media_type === 'movie') {
                    return new Date(b.watched_at) - new Date(a.watched_at);
                }
                
                // For TV shows, sort by season/episode progression
                if (a.season_number !== b.season_number) {
                    return (b.season_number || 0) - (a.season_number || 0);
                }
                return (b.episode_number || 0) - (a.episode_number || 0);
            });

            const mostAdvanced = sortedEntries[0];
            console.log(`📺 Most advanced for media ${mediaId}: S${mostAdvanced.season_number}E${mostAdvanced.episode_number} (${mostAdvanced.media_type})`);
            
            continueWatchingEntries.push(mostAdvanced);
        }

        // Now get progress data for these entries to determine if they should be shown
        const continueWatchingWithProgress = await Promise.all(
            continueWatchingEntries.map(async (entry) => {
                try {
                    // Get progress data for this specific entry
                    let progressQuery = supabase
                        .from('watch_progress')
                        .select('progress_seconds, duration_seconds, updated_at')
                        .eq('user_id', userId)
                        .eq('media_id', entry.media_id)
                        .eq('media_type', entry.media_type);
                    
                    if (entry.media_type !== 'movie') {
                        progressQuery = progressQuery
                            .eq('season_number', entry.season_number)
                            .eq('episode_number', entry.episode_number);
                    }

                    const { data: progressData, error: progressError } = await progressQuery;
                    
                    if (progressError) {
                        console.error(`Error fetching progress for ${entry.media_id}:`, progressError);
                        return null;
                    }

                    const progress = progressData && progressData.length > 0 ? progressData[0] : null;
                    
                    // Only include in continue watching if:
                    // 1. There's meaningful progress (>30 seconds) OR
                    // 2. It's a recent watch (within last 7 days) even without progress
                    const hasProgress = progress && progress.progress_seconds > 30;
                    const isRecentWatch = new Date(entry.watched_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                    
                    if (hasProgress || isRecentWatch) {
                        // If there's progress, check if it's not fully completed (less than 90%)
                        if (progress && progress.duration_seconds > 0) {
                            const completionPercentage = progress.progress_seconds / progress.duration_seconds;
                            if (completionPercentage >= 0.90) {
                                // Episode is completed, check for next episode
                                if (entry.media_type !== 'movie') {
                                    const nextEpisode = await getNextEpisode(entry.media_id, entry.season_number, entry.episode_number, entry.media_type);
                                    if (nextEpisode) {
                                        console.log(`✅ Episode completed, suggesting next: S${nextEpisode.season}E${nextEpisode.episode}`);
                                        return {
                                            ...entry,
                                            season_number: nextEpisode.season,
                                            episode_number: nextEpisode.episode,
                                            progress_seconds: 0, // Start from beginning of next episode
                                            duration_seconds: null,
                                            updated_at: progress.updated_at
                                        };
                                    }
                                }
                                // If no next episode or it's a movie, don't include in continue watching
                                return null;
                            }
                        }
                        
                        return {
                            ...entry,
                            progress_seconds: progress?.progress_seconds || 0,
                            duration_seconds: progress?.duration_seconds || null,
                            updated_at: progress?.updated_at || entry.watched_at
                        };
                    }
                    
                    return null;
                } catch (error) {
                    console.error(`Error processing continue watching entry for ${entry.media_id}:`, error);
                    return null;
                }
            })
        );

        // Filter out null entries and sort by most recently updated
        const validEntries = continueWatchingWithProgress
            .filter(Boolean)
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

        console.log(`📺 Found ${validEntries.length} valid continue watching entries`);

        // Fetch TMDB details for these entries
        const detailedItems = await Promise.all(
            validEntries.map(async (entry) => {
                try {
                    const response = await fetch(`${API_BASE_URL}/tmdb/${entry.media_type}/${entry.media_id}`);
                    if (response.ok) {
                        const details = await response.json();
                        return { 
                            ...details, 
                            type: entry.media_type,
                            progress_seconds: entry.progress_seconds,
                            duration_seconds: entry.duration_seconds,
                            season_number: entry.season_number,
                            episode_number: entry.episode_number,
                            updated_at: entry.updated_at,
                            media_id: entry.media_id
                        };
                    }
                    return null;
                } catch (e) {
                    console.error('Error fetching TMDB details for continue watching item:', e);
                    return null;
                }
            })
        );

        const finalResults = detailedItems.filter(Boolean);
        console.log(`🎬 Returning ${finalResults.length} continue watching items`);
        
        return finalResults;

    } catch (error) {
        console.error('Error in getContinueWatching:', error);
        return [];
    }
};

export const saveWatchProgress = async (item, progress, durationInSeconds, forceHistoryEntry = false) => {
    const userId = await getCurrentUserId();
    if (!userId) {
        console.error('❌ Cannot save watch progress: No authenticated user');
        return false;
    }

    if (!item || typeof progress === 'undefined' || progress < 0) {
        console.error('❌ Invalid progress data:', { item, progress, durationInSeconds });
        return false;
    }

    const progressData = {
        p_media_id: item.id,
        p_media_type: item.type,
        p_season_number: item.season || null,
        p_episode_number: item.episode || null,
        p_progress_seconds: progress > 0 ? Math.ceil(progress) : 0,
        p_duration_seconds: durationInSeconds ? Math.round(durationInSeconds) : null,
        p_force_history_entry: forceHistoryEntry
    };

    // Attempt 1: Modern RPC with all params
    console.log('💾 Saving watch progress (v2) via RPC...', progressData);
    const { error: rpcErrorV2 } = await supabase.rpc('save_watch_progress', progressData);

    if (!rpcErrorV2) {
        console.log('✅ Watch progress saved successfully via RPC (v2). RPC Error object was:', rpcErrorV2);
        return true;
    } else {
        console.error(`❌ RPC (v2) failed. Error: ${rpcErrorV2.message}. Details:`, rpcErrorV2);
    }

    // Attempt 2: Legacy RPC without force_history_entry
    console.log('⚠️ RPC (v2) failed, trying legacy (v1) RPC...');
    const { p_force_history_entry, ...fallbackData } = progressData;
    const { error: rpcErrorV1 } = await supabase.rpc('save_watch_progress', fallbackData);

    if (!rpcErrorV1) {
        console.log('✅ Watch progress saved successfully via RPC (v1)');
        return true;
    } else {
        console.error(`❌ RPC (v1) also failed. Error: ${rpcErrorV1.message}. Details:`, rpcErrorV1);
    }

    // Attempt 3: Direct DB write fallback
    console.log('⚠️ Both RPC methods failed, attempting direct DB write fallback...');
    try {
        const fallbackSuccess = await saveWatchProgressFallback(userId, item, progress, durationInSeconds, forceHistoryEntry);
        if (fallbackSuccess) {
            console.log('✅ Watch progress saved successfully via direct DB fallback');
            return true;
        } else {
            console.error('❌ Direct DB write fallback reported failure.');
        }
    } catch (fallbackError) {
        console.error('❌ Direct DB write fallback threw an exception:', fallbackError);
    }
    
    console.error('❌ All methods to save progress failed for media:', { item, progress, durationInSeconds });
    return false;
};

// Fallback function for direct database operations
const saveWatchProgressFallback = async (userId, item, progress, durationInSeconds, forceHistoryEntry) => {
    try {
        console.log('🔄 Using direct database fallback for watch progress');
        
        // Insert/update watch progress directly
        const { error: progressError } = await supabase
            .from('watch_progress')
            .upsert({
                user_id: userId,
                media_id: item.id,
                media_type: item.type,
                season_number: item.season || null,
                episode_number: item.episode || null,
                progress_seconds: progress > 0 ? Math.ceil(progress) : 0,
                duration_seconds: durationInSeconds ? Math.round(durationInSeconds) : null,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,media_id,media_type,season_number,episode_number'
            });

        if (progressError) {
            console.error('❌ Direct progress insert error:', progressError);
            return false;
        }

        // Add to watch history if progress is significant or forced
        if (forceHistoryEntry || progress > 60) {
            const { error: historyError } = await supabase
                .from('watch_history')
                .upsert({
                    user_id: userId,
                    media_id: item.id,
                    media_type: item.type,
                    season_number: item.season || null,
                    episode_number: item.episode || null,
                    watched_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,media_id,media_type,season_number,episode_number'
                });
            
            if (historyError) {
                console.error('❌ Direct history insert error:', historyError);
                // Don't fail completely if history fails, progress was saved
            }
        }

        console.log('✅ Watch progress saved via direct database fallback');
        return true;
        
    } catch (error) {
        console.error('❌ Direct database fallback failed:', error);
        return false;
    }
};

// New function to add watch history entry without affecting existing progress
export const addWatchHistoryEntry = async (item) => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            console.log('Cannot add watch history entry: No authenticated user');
            return;
        }

        if (!item) {
            return;
        }

        // console.log('Adding watch history entry only (no progress override):', {
        //     mediaId: item.id,
        //     mediaType: item.type,
        //     season: item.season,
        //     episode: item.episode
        // });

        // Only add to watch history, don't touch watch progress
        const { error: historyError } = await supabase
            .from('watch_history')
            .upsert({
                user_id: userId,
                media_id: item.id,
                media_type: item.type,
                season_number: item.season || null,
                episode_number: item.episode || null,
                watched_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,media_id,media_type,season_number,episode_number'
            });
        
        if (historyError) {
            console.error('Error adding watch history entry:', historyError);
        } else {
            // console.log('Watch history entry added successfully');
        }

    } catch (error) {
        console.error('Unexpected error adding watch history entry:', error);
    }
};

export const deleteWatchItem = async (item) => {
    try {
        if (!item) return;
        
        const userId = await getCurrentUserId();
        if (!userId) {
            console.log('Cannot delete watch item: No authenticated user');
            return;
        }
        
        const { error } = await supabase.rpc('delete_watch_item', {
            p_media_id: item.media_id,
            p_media_type: item.media_type,
            p_season_number: item.season_number,
            p_episode_number: item.episode_number
        });

        if (error) {
            console.error('Error deleting watch item:', error);
        }
    } catch (error) {
        console.error('Error in deleteWatchItem:', error);
    }
};

export const getSeriesHistory = async (seriesId) => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            return [];
        }

        const { data, error } = await supabase
            .from('watch_progress')
            .select('media_id, media_type, season_number, episode_number, progress_seconds, duration_seconds')
            .eq('user_id', userId)
            .eq('media_id', seriesId);
        
        if (error) {
            console.error('Error fetching series history:', error);
            return [];
        }
        
        return data || []; // Return the array of progress objects directly
    } catch (error) {
        console.error('Error in getSeriesHistory:', error);
        return [];
    }
};

export const getLastWatchedEpisode = async (seriesId) => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            console.log('No authenticated user, returning null for last watched episode');
            return null;
        }

        const { data, error } = await supabase
            .from('watch_history')
            .select('season_number, episode_number')
            .eq('user_id', userId)
            .eq('media_id', seriesId)
            .order('watched_at', { ascending: false })
            .limit(1);
        
        if (error) {
            console.error('Error fetching last watched episode:', error);
            return null;
        }
        
        const episode = data && data.length > 0 ? data[0] : null;
        return episode ? { season: episode.season_number, episode: episode.episode_number } : null;
    } catch (error) {
        console.error('Error in getLastWatchedEpisode:', error);
        return null;
    }
};

// Helper function to get next episode in sequence
const getNextEpisode = async (seriesId, currentSeason, currentEpisode, mediaType = 'tv') => {
    try {
        // For TMDB API, both 'tv' and 'anime' use the 'tv' endpoint
        const tmdbType = (mediaType === 'anime') ? 'tv' : mediaType;
        
        // Get series details from TMDB to check episode/season structure
        const response = await fetch(`${API_BASE_URL}/tmdb/${tmdbType}/${seriesId}`);
        if (!response.ok) {
            console.error(`Failed to fetch series details: ${response.status}`);
            return null;
        }
        
        const seriesDetails = await response.json();
        if (!seriesDetails.seasons || seriesDetails.seasons.length === 0) {
            console.error('No seasons found in series details');
            return null;
        }
        
        // Get current season details to find episode count
        const seasonResponse = await fetch(`${API_BASE_URL}/tmdb/${tmdbType}/${seriesId}/season/${currentSeason}`);
        if (!seasonResponse.ok) {
            console.error(`Failed to fetch season ${currentSeason} details: ${seasonResponse.status}`);
            return null;
        }
        
        const seasonDetails = await seasonResponse.json();
        if (!seasonDetails.episodes || seasonDetails.episodes.length === 0) {
            console.error(`No episodes found in season ${currentSeason}`);
            return null;
        }
        
        const episodeCount = seasonDetails.episodes.length;
        console.log(`Current season ${currentSeason} has ${episodeCount} episodes, current episode: ${currentEpisode}`);
        
        // If there's a next episode in the same season, return it
        if (currentEpisode < episodeCount) {
            console.log(`Next episode: S${currentSeason}E${currentEpisode + 1}`);
            return { season: currentSeason, episode: currentEpisode + 1 };
        }
        
        // If this was the last episode of the season, check for next season
        // Filter out season 0 (specials) and find the next sequential season
        const validSeasons = seriesDetails.seasons.filter(s => s.season_number > 0);
        const nextSeason = validSeasons.find(s => s.season_number === currentSeason + 1);
        
        if (nextSeason && nextSeason.episode_count > 0) {
            console.log(`Next season found: S${nextSeason.season_number}E1`);
            return { season: nextSeason.season_number, episode: 1 };
        }
        
        console.log('No next episode available - series may be completed');
        return null;
    } catch (error) {
        console.error('Error getting next episode:', error);
        return null;
    }
};

// Get last episode with actual meaningful progress (for resuming)
// This implements the "Continue Watching" logic for a series.
export const getLastWatchedEpisodeWithProgress = async (seriesId) => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            console.log('No authenticated user, returning null for last watched episode with progress');
            return null;
        }

        console.log(`🔍 [CW] Looking for last watched episode for series ${seriesId}`);

        // 1. Get the single most RECENTLY watched episode from history. This is the most reliable signal.
        const { data: historyData, error: historyError } = await supabase
            .from('watch_history')
            .select('season_number, episode_number, watched_at, media_type')
            .eq('user_id', userId)
            .eq('media_id', seriesId)
            .order('watched_at', { ascending: false })
            .limit(1);
        
        if (historyError) {
            console.error('❌ [CW] Error fetching watch history:', historyError);
            return null;
        }
        
        if (!historyData || historyData.length === 0) {
            console.log('📭 [CW] No episodes found in watch history for this series.');
            return null;
        }

        const lastWatched = historyData[0];
        console.log(`📺 [CW] Most recent interaction: S${lastWatched.season_number}E${lastWatched.episode_number} (at ${lastWatched.watched_at})`);
        
        // 2. Now check if this episode has progress data
        const { data: progressData, error: progressError } = await supabase
            .from('watch_progress')
            .select('progress_seconds, duration_seconds')
            .eq('user_id', userId)
            .eq('media_id', seriesId)
            .eq('season_number', lastWatched.season_number)
            .eq('episode_number', lastWatched.episode_number)
            .limit(1);

        if (progressError) {
            console.error('❌ [CW] Error fetching progress data:', progressError);
            // Even if progress fails, we know this was the last touched episode.
            return { 
                season: lastWatched.season_number, 
                episode: lastWatched.episode_number 
            };
        }

        const progress = progressData && progressData.length > 0 ? progressData[0] : null;
        
        if (progress && progress.duration_seconds > 0) {
            // Improved completion logic: use both percentage and time left
            const completionPercentage = progress.progress_seconds / progress.duration_seconds;
            const timeLeft = progress.duration_seconds - progress.progress_seconds;
            const minCompletionPercent = 0.90; // 90%
            const minTimeLeftSeconds = 60;     // 1 minute left
            const isCompleted = (completionPercentage >= minCompletionPercent && timeLeft <= minTimeLeftSeconds);

            console.log(`📊 [CW] Progress: ${(completionPercentage * 100).toFixed(1)}%, Time left: ${timeLeft}s - ${isCompleted ? 'COMPLETED' : 'INCOMPLETE'}`);
            
            if (isCompleted) {
                // Episode was completed, find the next one.
                console.log(`✅ [CW] Episode S${lastWatched.season_number}E${lastWatched.episode_number} is completed. Finding next...`);
                const nextEpisode = await getNextEpisode(seriesId, lastWatched.season_number, lastWatched.episode_number, lastWatched.media_type);
                
                if (nextEpisode) {
                    console.log(`🎯 [CW] Next episode is S${nextEpisode.season}E${nextEpisode.episode}.`);
                    return nextEpisode;
                } else {
                    console.log('🏁 [CW] Series finished. No "continue watching" target.');
                    return null; // Series is finished
                }
            } else {
                // Episode is not completed, resume from here.
                console.log(`⏯️ [CW] Resuming incomplete episode S${lastWatched.season_number}E${lastWatched.episode_number}.`);
                return { 
                    season: lastWatched.season_number, 
                    episode: lastWatched.episode_number 
                };
            }
        } else {
            // No progress data, or no duration.
            // It's the last thing they interacted with, so suggest resuming it.
            console.log(`📝 [CW] No meaningful progress found. Suggesting last touched episode: S${lastWatched.season_number}E${lastWatched.episode_number}`);
            return { 
                season: lastWatched.season_number, 
                episode: lastWatched.episode_number 
            };
        }
    } catch (error) {
        console.error('❌ [CW] Unexpected error in getLastWatchedEpisodeWithProgress:', error);
        return null;
    }
};

// Get progress data for history items to show progress bars
export const getProgressForHistoryItems = async (historyItems) => {
    try {
        const userId = await getCurrentUserId();
        if (!userId || !historyItems || historyItems.length === 0) {
            return {};
        }

        // Create a query to get all progress data for the history items
        const progressMap = {};
        
        await Promise.all(historyItems.map(async (item) => {
            try {
                let query = supabase
                    .from('watch_progress')
                    .select('progress_seconds, duration_seconds')
                    .eq('user_id', userId)
                    .eq('media_id', item.media_id)
                    .eq('media_type', item.media_type);
                
                // For TV shows, include season and episode - handle null values properly
                if (item.media_type === 'tv') {
                    // Only add season/episode filters if they exist and are not null
                    if (item.season_number != null) {
                        query = query.eq('season_number', item.season_number);
                    }
                    if (item.episode_number != null) {
                        query = query.eq('episode_number', item.episode_number);
                    }
                }

                const { data, error } = await query;
                
                if (error) {
                    console.error(`Error fetching progress for ${item.media_type} ${item.media_id}:`, error);
                } else if (data && data.length > 0) {
                    const progressData = data[0];
                    // Use media_type to match the key format expected by History.jsx
                    const key = `${item.media_id}-${item.media_type}-${item.season_number || 0}-${item.episode_number || 0}`;
                    
                    // Include progress data even if it's small - let the UI decide what to show
                    if (progressData.progress_seconds >= 0 && progressData.duration_seconds > 0) {
                        progressMap[key] = {
                            progress_seconds: progressData.progress_seconds,
                            duration_seconds: progressData.duration_seconds
                        };
                    }
                }
            } catch (e) {
                console.error(`Error fetching progress for item ${item.media_id}:`, e);
            }
        }));

        return progressMap;
    } catch (error) {
        console.error('Error in getProgressForHistoryItems:', error);
        return {};
    }
};

// Get watch history with progress data in a single query
export const getWatchHistoryWithProgress = async () => {
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
        try {
            const userId = await getCurrentUserId();
            if (!userId) {
                console.log('No authenticated user, returning empty watch history with progress');
                return [];
            }

            console.log('🔄 Fetching combined watch history and progress data...');

            // Fetch watch history and progress data separately but efficiently
            const [historyResult, progressResult] = await Promise.all([
                supabase
                    .from('watch_history')
                    .select('*')
                    .eq('user_id', userId)
                    .order('watched_at', { ascending: false }),
                supabase
                    .from('watch_progress')
                    .select('media_id, media_type, season_number, episode_number, progress_seconds, duration_seconds')
                    .eq('user_id', userId)
            ]);

            if (historyResult.error) {
                throw historyResult.error;
            }

            if (progressResult.error) {
                console.warn('Error fetching progress data, continuing without progress:', progressResult.error);
            }

            const historyData = historyResult.data || [];
            const progressData = progressResult.data || [];

            // Create a map of progress data for quick lookup
            const progressMap = {};
            progressData.forEach(progress => {
                const key = `${progress.media_id}-${progress.media_type}-${progress.season_number || 0}-${progress.episode_number || 0}`;
                progressMap[key] = progress;
            });

            // Combine history with progress data
            const combinedData = historyData.map(historyItem => {
                const progressKey = `${historyItem.media_id}-${historyItem.media_type}-${historyItem.season_number || 0}-${historyItem.episode_number || 0}`;
                const progress = progressMap[progressKey];
                
                return {
                    ...historyItem,
                    progress_seconds: progress?.progress_seconds || null,
                    duration_seconds: progress?.duration_seconds || null
                };
            });

            console.log('✅ Successfully fetched combined data:', {
                totalItems: combinedData.length,
                itemsWithProgress: combinedData.filter(item => item.progress_seconds > 0).length
            });

            return combinedData;
            
        } catch (error) {
            console.error('Error in getWatchHistoryWithProgress:', error);
            
            // Check if it's a network or timeout error that we should retry
            if ((error.message && (error.message.includes('NetworkError') || error.message.includes('timeout'))) && retryCount < maxRetries - 1) {
                retryCount++;
                console.log(`Retrying combined fetch due to network error (attempt ${retryCount + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                continue;
            }
            
            // If all else fails, try the fallback approach
            try {
                console.log('📋 All retries failed, trying fallback approach...');
                const historyData = await getWatchHistory();
                const progressMap = await getProgressForHistoryItems(historyData);
                
                return historyData.map(item => {
                    const progressKey = `${item.media_id}-${item.media_type}-${item.season_number || 0}-${item.episode_number || 0}`;
                    const progressData = progressMap[progressKey];
                    return {
                        ...item,
                        progress_seconds: progressData?.progress_seconds || null,
                        duration_seconds: progressData?.duration_seconds || null
                    };
                });
            } catch (fallbackError) {
                console.error('Fallback approach also failed:', fallbackError);
                return [];
            }
        }
    }
    
    console.error('Failed to fetch combined watch history and progress after all retry attempts');
    return [];
}; 