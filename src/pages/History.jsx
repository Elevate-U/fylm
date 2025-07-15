import { h } from 'preact';
import './History.css';
import Helmet from 'preact-helmet';
import { useState, useEffect, useCallback } from 'preact/hooks';
// Import getWatchHistory instead of getContinueWatching for actual watch history
import { getWatchHistoryWithProgress, deleteWatchItem } from '../utils/watchHistory';
import { useAuth } from '../context/Auth';
import { testSupabaseConnection } from '../supabase';
import { API_BASE_URL } from '../config';
import MovieCard from '../components/MovieCard';
import { useStore } from '../store';

// Helper function to fetch with retry logic
const fetchWithRetry = async (url, maxRetries = 3, delay = 1000) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            // Create a timeout promise for environments that don't support AbortSignal.timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), 10000);
            });

            const fetchPromise = fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                }
            });
            
            const response = await Promise.race([fetchPromise, timeoutPromise]);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return response;
        } catch (error) {
            console.warn(`Fetch attempt ${i + 1} failed for ${url}:`, error.message);
            
            if (i === maxRetries - 1) {
                throw error;
            }
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
    }
};

const History = () => {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { removeContinueWatchingItem, fetchContinueWatching } = useStore();

    const fetchHistory = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            // Test Supabase connection first
            const connectionOk = await testSupabaseConnection();
            if (!connectionOk) {
                throw new Error('Supabase connection test failed. Please check your internet connection and try again.');
            }
            
            // Use the new combined function to fetch history with progress data
            const historyData = await getWatchHistoryWithProgress();
            if (!historyData || historyData.length === 0) {
                setHistory([]);
                setLoading(false);
                return;
            }

            console.log('📚 Combined history data received:', {
                totalItems: historyData.length,
                itemsWithProgress: historyData.filter(item => item.progress_seconds > 0).length
            });

            // --- BATCHING LOGIC START ---
            const batchSize = 10; // Process 10 items at a time
            let detailedHistory = [];

            for (let i = 0; i < historyData.length; i += batchSize) {
                const batch = historyData.slice(i, i + batchSize);
                const batchPromises = batch.map(async (item) => {
                    try {
                        const numericId = item.media_id.split(':')[1];
                        if (!numericId) {
                            // This case should ideally not happen if data is clean
                            console.warn(`Skipping item with invalid media_id: ${item.media_id}`);
                            return null; // Skip this item
                        }

                        const response = await fetchWithRetry(`${API_BASE_URL}/tmdb/${item.media_type}/${numericId}`);
                        const details = await response.json();

                        const result = {
                            ...details,
                            id: details.id,
                            watch_id: `${item.user_id}-${item.media_id}-${item.media_type}-${item.season_number || 0}-${item.episode_number || 0}`,
                            type: item.media_type,
                            media_type: item.media_type,
                            media_id: item.media_id,
                            season_number: item.season_number,
                            episode_number: item.episode_number,
                            watched_at: item.watched_at,
                            progress_seconds: item.progress_seconds,
                            duration_seconds: item.duration_seconds
                        };

                        if (item.media_type === 'tv' && item.season_number && item.episode_number) {
                            try {
                                const episodeResponse = await fetchWithRetry(`${API_BASE_URL}/tmdb/tv/${numericId}/season/${item.season_number}/episode/${item.episode_number}`);
                                const episodeDetails = await episodeResponse.json();
                                return {
                                    ...result,
                                    episode_name: episodeDetails.name,
                                    still_path: episodeDetails.still_path,
                                    episode_overview: episodeDetails.overview
                                };
                            } catch (episodeError) {
                                console.error(`Error fetching episode details for ${numericId}:`, episodeError);
                                // Return the main result even if episode details fail
                                return result;
                            }
                        }

                        return result;
                    } catch (error) {
                        console.error(`Error fetching details for ${item.media_type} ${item.media_id}:`, error);
                        return {
                            id: item.media_id,
                            watch_id: `${item.user_id}-${item.media_id}-${item.media_type}-${item.season_number || 0}-${item.episode_number || 0}`,
                            type: item.media_type,
                            media_type: item.media_type,
                            media_id: item.media_id,
                            season_number: item.season_number,
                            episode_number: item.episode_number,
                            watched_at: item.watched_at,
                            title: item.media_type === 'tv' ? 'Unknown TV Show' : 'Unknown Movie',
                            name: item.media_type === 'tv' ? 'Unknown TV Show' : undefined,
                            poster_path: null,
                            overview: 'Details could not be loaded.',
                            _failed_to_load: true,
                            progress_seconds: item.progress_seconds,
                            duration_seconds: item.duration_seconds
                        };
                    }
                });

                const batchResults = await Promise.allSettled(batchPromises);
                detailedHistory = detailedHistory.concat(batchResults);
                
                // Optional: Update state after each batch to show progress
                const successfulResults = detailedHistory
                    .filter(result => result.status === 'fulfilled' && result.value)
                    .map(result => result.value);
                setHistory(successfulResults);
            }
            // --- BATCHING LOGIC END ---

            // Final state update with all results
            const finalSuccessfulResults = detailedHistory
                .filter(result => result.status === 'fulfilled' && result.value)
                .map(result => result.value);
            
            setHistory(finalSuccessfulResults);
        } catch (error) {
            console.error('Error fetching watch history:', error);
            setError('Failed to load watch history. Please try again.');
            setHistory([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory, user]);

    const handleDelete = async (itemToDelete) => {
        // Optimistically remove the item from the UI using the unique watch_id
        setHistory(history.filter(item => item.watch_id !== itemToDelete.watch_id));
        
        // Optimistically remove from the global "Continue Watching" state
        removeContinueWatchingItem(itemToDelete.media_id);

        try {
            // Call the delete function from the utils
            await deleteWatchItem(itemToDelete);

            // Refetch continue watching to ensure it's up to date
            await fetchContinueWatching();
        } catch (error) {
            console.error("Failed to delete item or refetch continue watching:", error);
            // Optionally, add the item back to the history list on failure
            // and show a toast notification to the user.
            // For now, we'll just log the error.
        }
    };

    const handleRetry = () => {
        fetchHistory();
    };

    if (loading) {
        return <div class="container"><p>Loading watch history...</p></div>;
    }

    if (error) {
        return (
            <div class="container">
                <Helmet>
                    <title>Watch History - FreeStream</title>
                </Helmet>
                <h1>Watch History</h1>
                <div class="error-message">
                    <p>{error}</p>
                    <button onClick={handleRetry} class="retry-button">Retry</button>
                </div>
            </div>
        );
    }

    return (
        <div class="container">
            <Helmet>
                <title>Watch History - FreeStream</title>
            </Helmet>
            <h1>Watch History</h1>
            {history.length > 0 ? (
                <div class="movie-grid">
                    {history.map(item => {
                        return (
                            <MovieCard 
                                key={item.watch_id} 
                                item={item} 
                                type={item.type}
                                progress={item.progress_seconds}
                                duration={item.duration_seconds}
                                showDeleteButton={true}
                                onDelete={handleDelete}
                            />
                        );
                    })}
                </div>
            ) : (
                <p>Your watch history is empty.</p>
            )}
        </div>
    );
};

export default History; 