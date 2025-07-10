import { h } from 'preact';
import Helmet from 'preact-helmet';
import { useEffect } from 'preact/hooks';
import { useStore } from '../store';
import { useAuth } from '../context/Auth';
import MovieCard from '../components/MovieCard';

const Favorites = () => {
    const { user } = useAuth();
    const favorites = useStore((state) => state.favorites);
    const fetchFavorites = useStore((state) => state.fetchFavorites);

    useEffect(() => {
        document.title = 'My Favorites - FreeStream';
        if (user) {
            fetchFavorites();
        }
    }, [user, fetchFavorites]);

    return (
        <div class="container">
            <Helmet>
                <title>My Favorites - FreeStream</title>
            </Helmet>
            <h1>My Favorites</h1>
            {favorites.length > 0 ? (
                <div class="movie-grid">
                    {favorites.map(item => <MovieCard item={item} mediaType={item.type} />)}
                </div>
            ) : (
                <p>You haven't added any favorites yet.</p>
            )}
        </div>
    );
};

export default Favorites; 