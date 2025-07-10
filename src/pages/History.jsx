import { h } from 'preact';
import Helmet from 'preact-helmet';
import { useStore } from '../store';
import MovieCard from '../components/MovieCard';

const History = () => {
    const history = useStore((state) => state.history);

    return (
        <div class="container">
            <Helmet>
                <title>Watch History - MyStream</title>
            </Helmet>
            <h1>Watch History</h1>
            {history.length > 0 ? (
                <div class="movie-grid">
                    {history.map(item => <MovieCard item={item} mediaType={item.type} />)}
                </div>
            ) : (
                <p>Your watch history is empty.</p>
            )}
        </div>
    );
};

export default History; 