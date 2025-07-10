import { h } from 'preact';
import Helmet from 'preact-helmet';
import { useState, useEffect } from 'preact/hooks';
import { getWatchHistory } from '../utils/watchHistory';
import { useAuth } from '../context/Auth';
import MovieCard from '../components/MovieCard';

const History = () => {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            setLoading(true);
            const historyData = await getWatchHistory();
            
            const detailedHistory = await Promise.all(
                historyData.map(async (item) => {
                    const response = await fetch(`/api/tmdb/${item.media_type}/${item.media_id}`);
                    if (response.ok) {
                        const details = await response.json();
                        return { ...details, type: item.media_type };
                    }
                    return null;
                })
            );

            setHistory(detailedHistory.filter(Boolean));
            setLoading(false);
        };

        fetchHistory();
    }, [user]);

    if (loading) {
        return <div class="container"><p>Loading history...</p></div>;
    }

    return (
        <div class="container">
            <Helmet>
                <title>Watch History - FreeStream</title>
            </Helmet>
            <h1>Watch History</h1>
            {history.length > 0 ? (
                <div class="movie-grid">
                    {history.map(item => <MovieCard key={item.id} item={item} mediaType={item.type} />)}
                </div>
            ) : (
                <p>Your watch history is empty.</p>
            )}
        </div>
    );
};

export default History; 