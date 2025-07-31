import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import MovieCard from '../components/MovieCard';
import LoadingSpinner from '../components/LoadingSpinner';
import './Home.css'; // Re-use some styling
import './Search.css'; // Import new styles
import { API_BASE_URL } from '../config';

const SearchPage = (props) => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('all');
  const [language, setLanguage] = useState('en-US');
  const [sortBy, setSortBy] = useState('popularity.desc');
  const [dataSources, setDataSources] = useState({
    anilist: false,
    tmdb: false
  });
  const debounceRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(props.url?.split('?')[1] || '');
    const q = urlParams.get('q');
    const filter = urlParams.get('filter') || 'all';
    const lang = urlParams.get('lang') || 'en-US';
    
    setQuery(q || '');
    setSearchFilter(filter);
    setLanguage(lang);

    if (q) {
      performSearch(q, filter, lang, sortBy);
    } else {
      setResults([]);
    }
  }, [props.url]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const performSearch = async (searchQuery, filter = 'all', searchLanguage = language, sort = sortBy) => {
    setLoading(true);
    try {
      // First try our new unified search endpoint with language support
      const unifiedUrl = `${API_BASE_URL}/search/unified?query=${encodeURIComponent(searchQuery)}&type=${filter}&language=${encodeURIComponent(searchLanguage)}&sort_by=${sort}`;
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
      const res = await fetch(`${API_BASE_URL}/tmdb/search/multi?query=${encodeURIComponent(searchQuery)}&language=${encodeURIComponent(searchLanguage)}`);
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
    setSearchFilter(newFilter);
    if (query.trim()) {
      performSearch(query, newFilter, language, sortBy);
    }
    
    // Update URL without reloading page
    const url = new URL(window.location);
    url.searchParams.set('q', query);
    url.searchParams.set('filter', newFilter);
    url.searchParams.set('lang', language);
    window.history.pushState({}, '', url.toString());
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    if (query.trim()) {
      performSearch(query, searchFilter, newLanguage, sortBy);
    }
    
    // Update URL without reloading page
    const url = new URL(window.location);
    url.searchParams.set('q', query);
    url.searchParams.set('filter', searchFilter);
    url.searchParams.set('lang', newLanguage);
    window.history.pushState({}, '', url.toString());
  };

  const debouncedSearch = (searchQuery, filter, searchLanguage, sort) => {
    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Set new timeout for debounced search
    debounceRef.current = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery.trim(), filter, searchLanguage, sort);
      } else {
        setResults([]);
        setDataSources({ anilist: false, tmdb: false });
      }
    }, 500); // 500ms delay
  };

  const handleInputChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    // Update URL dynamically as user types
    const url = new URL(window.location);
    url.searchParams.set('q', newQuery);
    url.searchParams.set('filter', searchFilter);
    url.searchParams.set('lang', language);
    window.history.replaceState({}, '', url.toString());

    // Trigger debounced search
    debouncedSearch(newQuery, searchFilter, language, sortBy);
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      performSearch(query.trim(), searchFilter, language, sortBy);
    }
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    if (query.trim()) {
      performSearch(query, searchFilter, language, newSort);
    }

    const url = new URL(window.location);
    url.searchParams.set('q', query);
    url.searchParams.set('filter', searchFilter);
    url.searchParams.set('lang', language);
    url.searchParams.set('sort_by', newSort);
    window.history.pushState({}, '', url.toString());
  };

  return (
    <div className="container home-page">
      <div className="search-header">
        {/* New Search Form */}
        <form onSubmit={handleSearchSubmit} className="search-form-container">
          <input
            type="text"
            value={query}
            onInput={handleInputChange}
            placeholder="Search for movies, TV shows, or anime..."
            className="search-input-field"
            autofocus
          />
          <button type="submit" className="search-submit-button">Search</button>
        </form>

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
        
        {/* Language selector */}
        <div className="sort-controls">
          <label htmlFor="sort-by">Sort By:</label>
          <select id="sort-by" value={sortBy} onChange={(e) => handleSortChange(e.target.value)} className="glassmorphic-dropdown">
            <option value="popularity.desc">Popularity Desc</option>
            <option value="popularity.asc">Popularity Asc</option>
            <option value="release_date.desc">Release Date Desc</option>
            <option value="release_date.asc">Release Date Asc</option>
            <option value="vote_average.desc">Rating Desc</option>
            <option value="vote_average.asc">Rating Asc</option>
          </select>
        </div>

        <div className="language-selector">
          <label htmlFor="language-select" className="language-label">Language:</label>
          <select 
            id="language-select"
            value={language} 
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="language-select"
          >
            <option value="en-US">English</option>
            <option value="es-ES">Español</option>
            <option value="fr-FR">Français</option>
            <option value="de-DE">Deutsch</option>
            <option value="it-IT">Italiano</option>
            <option value="pt-BR">Português (Brasil)</option>
            <option value="ja-JP">日本語</option>
            <option value="ko-KR">한국어</option>
            <option value="zh-CN">中文 (简体)</option>
            <option value="zh-TW">中文 (繁體)</option>
            <option value="ru-RU">Русский</option>
            <option value="ar-SA">العربية</option>
            <option value="hi-IN">हिन्दी</option>
            <option value="th-TH">ไทย</option>
            <option value="vi-VN">Tiếng Việt</option>
          </select>
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