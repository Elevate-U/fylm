import { h } from 'preact';
import './History.css';
import Helmet from 'preact-helmet';
import { useState, useEffect, useCallback } from 'preact/hooks';
// Import getWatchHistory instead of getContinueWatching for actual watch history
import { getFullWatchHistory, deleteWatchItem, getBatchedWatchHistory } from '../utils/watchHistory';
import { useAuth } from '../context/Auth';
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
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const { removeContinueWatchingItem, fetchContinueWatching } = useStore();

    const fetchHistory = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        setError(null);
        setHistory([]);
        setHasMore(true);
        
        try {
            // Use batched loading to show results progressively
            await loadHistoryBatch(0, true);
        } catch (error) {
            console.error('Error fetching watch history:', error);
            setError('Failed to load watch history. Please try again.');
            setHistory([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const loadHistoryBatch = useCallback(async (offset = 0, isInitial = false) => {
        if (!user || (!isInitial && !hasMore)) return;
        
        if (!isInitial) setLoadingMore(true);
        
        try {
            const batchSize = 20;
            const batch = await getBatchedWatchHistory(user.id, offset, batchSize);
            
            if (batch.length === 0) {
                setHasMore(false);
                return;
            }
            
            setHistory(prev => {
                // Avoid duplicates by filtering out items that already exist
                const existingIds = new Set(prev.map(item => item.watch_id));
                const newItems = batch.filter(item => !existingIds.has(item.watch_id));
                return [...prev, ...newItems];
            });
            
            // If we got fewer items than requested, we've reached the end
            if (batch.length < batchSize) {
                setHasMore(false);
            }
        } catch (error) {
            console.error('Error loading history batch:', error);
            if (isInitial) {
                setError('Failed to load watch history. Please try again.');
            }
        } finally {
            if (!isInitial) setLoadingMore(false);
        }
    }, [user, hasMore]);

    const loadMore = useCallback(() => {
        if (!loadingMore && hasMore) {
            loadHistoryBatch(history.length);
        }
    }, [loadHistoryBatch, history.length, loadingMore, hasMore]);

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
            await deleteWatchItem(user.id, itemToDelete);

            // Refetch continue watching to ensure it's up to date
            await fetchContinueWatching(user.id);
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
                    <title>Watch History - Fylm</title>
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
                <title>Watch History - Fylm</title>
            </Helmet>
            <h1>Watch History</h1>
            {history.length > 0 ? (
                <>
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
                                    useFullResolution={true}
                                />
                            );
                        })}
                    </div>
                    {hasMore && (
                        <div class="load-more-container">
                            <button 
                                class="load-more-btn" 
                                onClick={loadMore}
                                disabled={loadingMore}
                            >
                                {loadingMore ? 'Loading...' : 'Load More'}
                            </button>
                        </div>
                    )}
                </>
            ) : (
                !loading && <p>Your watch history is empty.</p>
            )}
        </div>
    );
};

export default History;