import { h } from 'preact';
import './Favorites.css';
import Helmet from 'preact-helmet';
import { useEffect, useState } from 'preact/hooks';
import { useStore } from '../store';
import { useAuth } from '../context/Auth';
import MovieCard from '../components/MovieCard';
import { getProgressForHistoryItems } from '../utils/watchHistory';

const Favorites = () => {
    const { user } = useAuth();
    const favorites = useStore((state) => state.favorites);
    const [progressData, setProgressData] = useState({});

    useEffect(() => {
        document.title = 'My Favorites - FreeStream';
    }, []);

    // Fetch progress data when favorites change
    useEffect(() => {
        const fetchProgressData = async () => {
            if (user && favorites.length > 0) {
                // Convert favorites to the format expected by getProgressForHistoryItems
                const favoritesAsHistoryItems = favorites.map(fav => ({
                    media_id: fav.id,
                    media_type: fav.type,
                    season_number: fav.season_number || null,
                    episode_number: fav.episode_number || null
                }));

                try {
                    const progressMap = await getProgressForHistoryItems(favoritesAsHistoryItems);
                    setProgressData(progressMap);
                } catch (error) {
                    console.error('Error fetching progress data for favorites:', error);
                    setProgressData({});
                }
            } else {
                setProgressData({});
            }
        };

        fetchProgressData();
    }, [user, favorites]);

    return (
        <div class="container">
            <Helmet>
                <title>My Favorites - FreeStream</title>
            </Helmet>
            <h1>My Favorites</h1>
            {favorites.length > 0 ? (
                <div class="movie-grid">
                    {favorites.map(item => {
                        // Get progress data for this favorite
                        const progressKey = `${item.id}-${item.type}-${item.season_number || 0}-${item.episode_number || 0}`;
                        const itemProgress = progressData[progressKey];
                        
                        return (
                            <MovieCard 
                                key={`${item.type}-${item.id}-${item.season_number || 0}-${item.episode_number || 0}`}
                                item={item} 
                                type={item.type}
                                progress={itemProgress?.progress_seconds}
                                duration={itemProgress?.duration_seconds}
                            />
                        );
                    })}
                </div>
            ) : (
                <p>You haven't added any favorites yet.</p>
            )}
        </div>
    );
};

export default Favorites; 