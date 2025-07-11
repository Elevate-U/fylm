import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import MovieCard from '../components/MovieCard';
import LoadingSpinner from '../components/LoadingSpinner';
import './Home.css'; // Re-use some styling
import { API_BASE_URL } from '../config';

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
      const res = await fetch(`${API_BASE_URL}/tmdb/search/multi?query=${encodeURIComponent(searchQuery)}`);
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
    <div class="container home-page">
      <div class="search-header">
        <h1 class="main-title">Search Results</h1>
        <div class="search-query-display">
          <span class="search-label">Showing results for:</span>
          <span class="search-query">"{query}"</span>
        </div>
      </div>
      
      {loading ? (
        <LoadingSpinner text="Searching for movies and TV shows..." />
      ) : (
        results.length > 0 ? (
          <section class="home-section">
            <h2>Found {results.length} result{results.length !== 1 ? 's' : ''}</h2>
            <div class="movie-grid">
              {results.map(item => (
                <MovieCard 
                  key={`${item.media_type}-${item.id}`} 
                  item={item} 
                  type={item.media_type} 
                  progress={null}
                  duration={null}
                />
              ))}
            </div>
          </section>
        ) : query ? (
          <div class="no-results">
            <div class="no-results-icon">🔍</div>
            <h3>No results found</h3>
            <p>We couldn't find anything for "{query}". Try searching with different keywords.</p>
            <div class="search-suggestions">
              <p>Try searching for:</p>
              <ul>
                <li>Movie or TV show titles</li>
                <li>Actor or director names</li>
                <li>Genre names (e.g., "action", "comedy")</li>
                <li>Keywords from the plot</li>
              </ul>
            </div>
          </div>
        ) : (
          <div class="search-welcome">
            <div class="search-welcome-icon">🎬</div>
            <h3>Start your search</h3>
            <p>Use the search bar above to find your favorite movies and TV shows.</p>
          </div>
        )
      )}
    </div>
  );
};

export default SearchPage; 