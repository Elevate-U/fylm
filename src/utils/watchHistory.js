import { supabase } from '../supabase';
import { API_BASE_URL } from '../config';

// Cache user session to reduce auth overhead - THIS CACHE IS PROBLEMATIC
// let cachedUserId = null;
// let lastAuthCheck = 0;
// const AUTH_CACHE_DURATION = 30000; // 30 seconds

const getCurrentUserId = async () => {
    // const now = Date.now();
    
    // Return cached user ID if it's still valid
    // if (cachedUserId && (now - lastAuthCheck) < AUTH_CACHE_DURATION) {
    //     return cachedUserId;
    // }
    
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Error getting current session:', error);
            // cachedUserId = null;
            // lastAuthCheck = 0;
            return null;
        }
        
        // Update cache
        // cachedUserId = session?.user?.id || null;
        // lastAuthCheck = now;
        
        return session?.user?.id || null;
    } catch (error) {
        console.error('Exception in getCurrentUserId:', error);
        
        // Clear cache on error
        // cachedUserId = null;
        // lastAuthCheck = 0;
        return null;
    }
};

// Function to clear auth cache when user logs out
export const clearAuthCache = () => {
    // cachedUserId = null;
    // lastAuthCheck = 0;
};

// Re-implement getWatchHistory to use the more efficient RPC call
export const getWatchHistory = async () => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            console.log('No authenticated user, returning empty watch history');
            return [];
        }

        console.log('🔄 Fetching combined watch history and progress via RPC...');
        const { data, error } = await supabase.rpc('get_watch_history_with_progress');

        if (error) {
            console.error('Error fetching watch history with progress:', error);
            return [];
        }

        console.log(`✅ Successfully fetched ${data.length} items via RPC.`);
        return data || [];

    } catch (error) {
        console.error('Exception in getWatchHistory:', error);
        return [];
    }
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
            query = query[
                season == null ? 'is' : 'eq'
            ]('season_number', season == null ? null : season)[
                episode == null ? 'is' : 'eq'
            ]('episode_number', episode == null ? null : episode);
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

// Refactored getContinueWatching to be simpler and more efficient
export const getContinueWatching = async () => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            console.log('No authenticated user, returning empty continue watching list');
            return [];
        }

        console.log('🔍 Fetching continue watching data via RPC...');

        // 1. Fetch all history and progress data in one go.
        const { data: allHistory, error: rpcError } = await supabase.rpc('get_watch_history_with_progress');

        if (rpcError) {
            console.error('Error fetching combined history and progress:', rpcError);
            return [];
        }

        if (!allHistory || allHistory.length === 0) {
            console.log('📭 No watch history found.');
            return [];
        }

        console.log(`📊 Found ${allHistory.length} total entries.`);

        // 2. Group all history entries by their composite key (media_id + media_type).
        const groupedByMedia = allHistory.reduce((acc, entry) => {
            if (entry.media_id && entry.media_type) {
                const compositeKey = `${entry.media_type}-${entry.media_id}`;
                acc[compositeKey] = acc[compositeKey] || [];
                acc[compositeKey].push(entry);
            }
            return acc;
        }, {});

        // 3. For each group, find the single most recently watched episode.
        const latestEntries = Object.values(groupedByMedia).map(group => {
            // Sort by watched_at date descending to find the most recent.
            return group.sort((a, b) => new Date(b.watched_at) - new Date(a.watched_at))[0];
        }).filter(Boolean); // Filter out any potential empty groups

        console.log(`🗺️ Found ${latestEntries.length} unique media items.`);

        // 4. Process these latest entries to determine if they are "continuable".
        const continueWatchingItems = await Promise.all(
            latestEntries.map(async (entry) => {
                // An item is "continuable" if it's not finished.
                const { progress_seconds, duration_seconds } = entry;
                
                if (progress_seconds && duration_seconds > 0) {
                    const completion = progress_seconds / duration_seconds;
                    
                    if (completion >= 0.9) { // Consider items >= 90% complete as finished
                        // If it's a TV show, check if there is a next episode.
                        if (entry.media_type !== 'movie') {
                            const nextEpisode = await getNextEpisode(entry.media_id, entry.season_number, entry.episode_number, entry.media_type);
                            if (nextEpisode) {
                                console.log(`✅ Episode S${entry.season_number}E${entry.episode_number} completed, suggesting next: S${nextEpisode.season}E${nextEpisode.episode}`);
                                // Return an object for the *next* episode, with progress reset.
                                return {
                                    ...entry,
                                    season_number: nextEpisode.season,
                                    episode_number: nextEpisode.episode,
                                    progress_seconds: 0,
                                    duration_seconds: null,
                                    // Use the original watched_at to maintain order, but this will be sorted by updated_at later
                                };
                            }
                        }
                        // If it's a finished movie or the last episode of a series, exclude it.
                        return null;
                    }
                }
                
                // If the item has progress but is not finished, it's a candidate.
                // Include items with little or no progress, as the user might have just started.
                return entry;
            })
        );
        
        // 5. Filter out nulls (completed items with no next episode).
        const validItems = continueWatchingItems.filter(Boolean);
        
        // 6. Sort by `watched_at` to show the most recently watched items first.
        validItems.sort((a, b) => new Date(b.watched_at) - new Date(a.watched_at));
        
        console.log(`📺 Found ${validItems.length} valid continue watching entries`);

        // 7. Fetch TMDB details for the final list.
        const detailedItems = await Promise.all(
            validItems.map(async (entry) => {
                try {
                    // The media_id is now normalized in the database, so no parsing is needed.
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
                            updated_at: entry.watched_at, // Use watched_at for sorting consistency
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

export const saveWatchProgress = async (userId, item, progress, durationInSeconds, forceHistoryEntry = false) => {
    if (!userId) {
        console.error('❌ Cannot save watch progress: No authenticated user ID provided');
        return false;
    }

    if (!item || typeof progress === 'undefined' || progress < 0) {
        console.error('❌ Invalid progress data:', { item, progress, durationInSeconds });
        return false;
    }

    const progressData = {
        p_media_id: String(item.id), // Ensure media_id is passed as a string
        p_media_type: item.type,
        p_season_number: item.season || null,
        p_episode_number: item.episode || null,
        // CRITICAL FIX: Round the values to integers to match the database function signature.
        p_progress_seconds: Math.round(progress),
        p_duration_seconds: durationInSeconds ? Math.round(durationInSeconds) : null,
        p_force_history_entry: forceHistoryEntry
    };

    console.log('🎬 Saving progress with RPC:', progressData);
    // Attempt 1: Modern RPC with all params
    const { error: rpcError } = await supabase.rpc('save_watch_progress', progressData);

    if (rpcError) {
        console.error(`❌ RPC failed. Error: ${rpcError.message}. Details:`, rpcError);
        // We can add a fallback here if needed, but the new DB constraints should prevent most errors.
        return false;
    }

    console.log('✅ Watch progress saved successfully via RPC.');
    return true;
};

// Fallback function for direct database operations (DEPRECATED, but kept for safety)
const saveWatchProgressFallback = async (userId, item, progress, durationInSeconds, forceHistoryEntry) => {
    console.warn('⚠️ The saveWatchProgressFallback function is deprecated and should not be actively used.');
    // The new database triggers handle this logic, so this fallback is mostly redundant.
    // It's kept as a safety net in case the RPC fails for unexpected reasons.
    try {
        console.log('🔄 Using direct database fallback for watch progress');
        const nowIso = new Date().toISOString();
        const upsertData = {
            user_id: userId,
            media_id: item.id,
            media_type: item.type,
            season_number: item.season || null,
            episode_number: item.episode || null,
            progress_seconds: progress > 0 ? Math.ceil(progress) : 0,
            duration_seconds: durationInSeconds ? Math.round(durationInSeconds) : null,
            updated_at: nowIso
        };

        const { error: progressError } = await supabase
            .from('watch_progress')
            .upsert(upsertData);

        if (progressError) {
            console.error('❌ Direct progress upsert error:', progressError);
            return false;
        }

        // Add to watch history if progress is significant or forced
        if (forceHistoryEntry || progress > 60) {
            const historyData = {
                user_id: userId,
                media_id: item.id,
                media_type: item.type,
                season_number: item.season || null,
                episode_number: item.episode || null,
                watched_at: nowIso
            };
            const { error: historyError } = await supabase
                .from('watch_history')
                .upsert(historyData);

            if (historyError) {
                console.error('❌ Direct history upsert error:', historyError);
            }
        }

        console.log('✅ Watch progress saved via direct database fallback');
        return true;
        
    } catch (error) {
        console.error('❌ Direct database fallback failed:', error);
        return false;
    }
};

// Helper to compare ISO timestamps, returns true if newTS is newer than oldTS
const isNewerTimestamp = (newTS, oldTS) => {
    if (!oldTS) return true;
    return new Date(newTS).getTime() > new Date(oldTS).getTime();
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

        // Only add to watch history, don't touch watch progress
        const nowIso = new Date().toISOString();
        const upsertData = {
            user_id: userId,
            media_id: item.id,
            media_type: item.type,
            season_number: item.season || null,
            episode_number: item.episode || null,
            watched_at: nowIso
        };

        const { error } = await supabase
            .from('watch_history')
            .upsert(upsertData);

        if (error) {
            console.error('Error adding watch history entry:', error);
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

// Refactored to use the main RPC call and filter client-side for efficiency
export const getSeriesHistory = async (seriesId) => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            return [];
        }
        
        // Use the main RPC function to get all data at once
        const { data, error } = await supabase.rpc('get_watch_history_with_progress');

        if (error) {
            console.error('Error fetching series history via RPC:', error);
            return [];
        }
        
        if (!data) {
            return [];
        }

        // Filter for the specific series on the client side
        const seriesData = data.filter(item => item.media_id === seriesId);
        return seriesData;

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

// This implements the "Continue Watching" logic for a series.
export const getLastWatchedEpisodeWithProgress = async (seriesId) => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            console.log('No authenticated user, returning null for last watched episode with progress');
            return null;
        }

        console.log(`🔍 [CW] Looking for last watched episode for series ${seriesId}`);

        // 1. Get all history for this series using the refactored getSeriesHistory
        const seriesHistory = await getSeriesHistory(seriesId);
        
        if (!seriesHistory || seriesHistory.length === 0) {
            console.log('📭 [CW] No episodes found in watch history for this series.');
            return null;
        }

        // History is already sorted by watched_at DESC from the RPC call. The first item is the most recent.
        const lastWatched = seriesHistory[0];
        console.log(`📺 [CW] Most recent interaction: S${lastWatched.season_number}E${lastWatched.episode_number} (at ${lastWatched.watched_at})`);
        
        // 2. Check if this episode is completed.
        const { progress_seconds, duration_seconds } = lastWatched;
        
        if (progress_seconds && duration_seconds > 0) {
            const completionPercentage = progress_seconds / duration_seconds;
            const isCompleted = completionPercentage >= 0.9; // 90% considered complete

            console.log(`📊 [CW] Progress: ${(completionPercentage * 100).toFixed(1)}% - ${isCompleted ? 'COMPLETED' : 'INCOMPLETE'}`);
            
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

        // With the new getWatchHistoryWithProgress, this function might become redundant.
        // For now, keeping it but logging a warning if used.
        console.warn("`getProgressForHistoryItems` is likely redundant and could be removed if all history fetching uses the new RPC function.");

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
                        query = query[
                            item.season_number == null ? 'is' : 'eq'
                        ]('season_number', item.season_number == null ? null : item.season_number);
                    }
                    if (item.episode_number != null) {
                        query = query[
                            item.episode_number == null ? 'is' : 'eq'
                        ]('episode_number', item.episode_number == null ? null : item.episode_number);
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
// This function is now the primary way to get history data.
export const getWatchHistoryWithProgress = async () => {
    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            console.log('No authenticated user, returning empty watch history');
            return [];
        }

        console.log('🔄 Fetching combined watch history and progress via RPC...');
        
        const { data, error } = await supabase.rpc('get_watch_history_with_progress');

        if (error) {
            console.error('Error fetching watch history with progress:', error);
            return [];
        }

        console.log('✅ Successfully fetched combined data via RPC:', {
            totalItems: data.length,
            itemsWithProgress: data.filter(item => item.progress_seconds > 0).length
        });

        return data || [];

    } catch (error) {
        console.error('Exception in getWatchHistoryWithProgress:', error);
        return [];
    }
}; 
