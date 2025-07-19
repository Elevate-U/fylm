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
  const [searchFilter, setSearchFilter] = useState('all');
  const [dataSources, setDataSources] = useState({
    anilist: false,
    tmdb: false
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(props.url?.split('?')[1] || '');
    const q = urlParams.get('q');
    const filter = urlParams.get('filter') || 'all';
    
    setQuery(q || '');
    setSearchFilter(filter);

    if (q) {
      performSearch(q, filter);
    } else {
      setResults([]);
    }
  }, [props.url]);

  const performSearch = async (searchQuery, filter = 'all') => {
    setLoading(true);
    try {
      // First try our new unified search endpoint
      const unifiedUrl = `${API_BASE_URL}/search/unified?query=${encodeURIComponent(searchQuery)}&type=${filter}`;
      const unifiedRes = await fetch(unifiedUrl);
      
      if (unifiedRes.ok) {
        const unifiedData = await unifiedRes.json();
        
        // Update data sources state with defensive checks
        setDataSources({
          anilist: unifiedData.anilist && Array.isArray(unifiedData.anilist) && unifiedData.anilist.length > 0,
          tmdb: unifiedData.tmdb && (
            (unifiedData.tmdb.movies && Array.isArray(unifiedData.tmdb.movies) && unifiedData.tmdb.movies.length > 0) || 
            (unifiedData.tmdb.tv && Array.isArray(unifiedData.tmdb.tv) && unifiedData.tmdb.tv.length > 0)
          )
        });
        
        // Use combined results with defensive check
        if (unifiedData.combined && Array.isArray(unifiedData.combined)) {
          setResults(unifiedData.combined);
        } else {
          console.warn('Combined data is missing or not an array');
          setResults([]);
        }
        
        setLoading(false);
        return;
      }
      
      // Fallback to traditional TMDB search if unified endpoint fails
      console.log('Falling back to TMDB search API');
      const res = await fetch(`${API_BASE_URL}/tmdb/search/multi?query=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      
      if (data && data.results) {
        // Filter results based on selected filter
        let filteredResults = data.results;
        
        if (filter !== 'all') {
          filteredResults = filteredResults.filter(item => item.media_type === filter);
        }
        
        const validResults = filteredResults.filter(item => 
          (item.media_type === 'movie' || item.media_type === 'tv') && 
          (item.poster_path || item.backdrop_path)
        );
        
        const uniqueResults = validResults.filter((item, index, self) =>
          index === self.findIndex((t) => t.id === item.id && t.media_type === item.media_type)
        );
        
        setResults(uniqueResults);
        
        // Set data source to TMDB only
        setDataSources({
          anilist: false,
          tmdb: true
        });
      }
    } catch (error) {
      console.error("Error performing search:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilter) => {
    // Update URL with the new filter
    const url = new URL(window.location.href);
    url.searchParams.set('filter', newFilter);
    window.history.replaceState({}, '', url);
    
    // Re-perform search with the new filter
    setSearchFilter(newFilter);
    performSearch(query, newFilter);
  };

  // Helper to render movie/TV/anime cards with source badges
  const renderResultCard = (item, index) => (
    <div key={`${item.media_type || 'item'}-${item.id}-${index}`} className="movie-card-container">
      <MovieCard 
        item={item} 
        type={item.media_type || (item.episodes ? 'anime' : 'movie')}
        progress={null}
        duration={null}
      />
      {item.source && (
        <div className={`source-badge source-${item.source}`}>
          {item.source === 'anilist' ? 'AL' : 'TMDB'}
        </div>
      )}
    </div>
  );

  return (
    <div className="container home-page">
      <div className="search-header">
        <h1 className="main-title">Search Results</h1>
        <div className="search-query-display">
          <span className="search-label">Showing results for:</span>
          <span className="search-query">"{query}"</span>
        </div>
        
        {/* Source indicators */}
        <div className="search-sources">
          {dataSources.anilist && <span className="data-source anilist">AniList</span>}
          {dataSources.tmdb && <span className="data-source tmdb">TMDB</span>}
        </div>
        
        {/* Filter tabs */}
        <div className="search-filters">
          <button 
            className={`filter-btn ${searchFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            All
          </button>
          <button 
            className={`filter-btn ${searchFilter === 'movie' ? 'active' : ''}`}
            onClick={() => handleFilterChange('movie')}
          >
            Movies
          </button>
          <button 
            className={`filter-btn ${searchFilter === 'tv' ? 'active' : ''}`}
            onClick={() => handleFilterChange('tv')}
          >
            TV Shows
          </button>
          <button 
            className={`filter-btn ${searchFilter === 'anime' ? 'active' : ''}`}
            onClick={() => handleFilterChange('anime')}
          >
            Anime
          </button>
        </div>
      </div>
      
      {loading ? (
        <LoadingSpinner text="Searching across multiple sources..." />
      ) : (
        results.length > 0 ? (
          <section className="home-section">
            <h2>Found {results.length} result{results.length !== 1 ? 's' : ''}</h2>
            <div className="movie-grid">
              {results.map(renderResultCard)}
            </div>
          </section>
        ) : query ? (
          <div className="no-results">
            <div className="no-results-icon">🔍</div>
            <h3>No results found</h3>
            <p>We couldn't find anything for "{query}" in the {searchFilter === 'all' ? 'database' : searchFilter} category.</p>
            <div className="search-suggestions">
              <p>Try:</p>
              <ul>
                <li>Using different keywords or spelling</li>
                <li>Searching in a different category</li>
                <li>Using the title in its original language</li>
                <li>Searching for something more general</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="search-welcome">
            <div className="search-welcome-icon">🎬</div>
            <h3>Start your search</h3>
            <p>Search across multiple sources including TMDB and AniList.</p>
          </div>
        )
      )}
    </div>
  );
};

export default SearchPage; 