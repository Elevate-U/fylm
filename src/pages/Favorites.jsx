import { h } from 'preact';
import Helmet from 'preact-helmet';
import { useStore } from '../store';
import MovieCard from '../components/MovieCard';

const Favorites = () => {
    const favorites = useStore((state) => state.favorites);

    return (
        <div class="container">
            <Helmet>
                <title>My Favorites - MyStream</title>
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