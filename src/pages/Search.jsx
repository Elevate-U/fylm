import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import MovieCard from '../components/MovieCard';
import './Home.css'; // Re-use some styling

const SearchPage = (props) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(props.url?.split('?')[1] || '');
    const q = urlParams.get('q');
    setQuery(q || '');

    if (q) {
      performSearch(q);
    } else {
      setResults([]);
    }
  }, [props.url]);

  const performSearch = async (searchQuery) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tmdb/search/multi?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.results) {
        const validResults = data.results.filter(item => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path);
        setResults(validResults);
      }
    } catch (error) {
      console.error("Error performing search:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="container">
      <div class="page-header">
        <h1>Search Results for "{query}"</h1>
      </div>
      {loading ? (
        <div class="loading-spinner"></div>
      ) : (
        results.length > 0 ? (
          <div class="movie-grid">
            {results.map(item => (
              <MovieCard item={item} mediaType={item.media_type} />
            ))}
          </div>
        ) : (
          <p>No results found for "{query}". Please try another search.</p>
        )
      )}
    </div>
  );
};

export default SearchPage; 