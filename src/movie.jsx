import { h, render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { API_BASE_URL, IMAGE_BASE_URL, ORIGINAL_IMAGE_BASE_URL } from './config';
import { fetchJson, setupUniversalSearch, createMovieCard } from './script';
import { getWatchHistory, saveWatchProgress } from './utils/watchHistory';
import { addFavoriteShow, removeFavoriteShow } from './utils/favorites';
import { useStore } from './store';
import MovieCard from './components/MovieCard';
import './movie.css';

const MoviePage = () => {
  const [mediaData, setMediaData] = useState(null);
  const [videos, setVideos] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [mediaId, setMediaId] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const { isShowFavorited } = useStore();
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [watchHistory, setWatchHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDubbed, setIsDubbed] = useState(false);
  const [episodePage, setEpisodePage] = useState(1);
  const [paginationPage, setPaginationPage] = useState(1);

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const type = pathParts[1]; // 'movie' or 'tv'
    const id = pathParts[2];   // the ID

    setMediaId(id);
    setMediaType(type);
    
    const history = getWatchHistory().find(item => item.id == id);
    if(history) {
      setWatchHistory(history);
    }

    if (id && type) {
      fetchAndDisplayAll(id, type);
    }
    setupUniversalSearch();
  }, [mediaId]);

  const fetchAndDisplayAll = async (id, type) => {
    setLoading(true);
    const detailsUrl = `${API_BASE_URL}/tmdb/${type}/${id}?language=en-US`;
    const videosUrl = `${API_BASE_URL}/tmdb/${type}/${id}/videos?language=en-US`;
    const recommendationsUrl = `${API_BASE_URL}/tmdb/${type}/${id}/recommendations?language=en-US`;

    try {
      const [detailsData, videosData, recommendationsData] = await Promise.all([
        fetchJson(detailsUrl, 'Error loading media details'),
        fetchJson(videosUrl, 'Error loading videos'),
        fetchJson(recommendationsUrl, 'Error loading recommendations')
      ]);

      setMediaData(detailsData);
      setVideos(videosData?.results || []);
      setRecommendations(recommendationsData?.results || []);

      if (type === 'tv' && detailsData && detailsData.seasons) {
        const seasonWithEpisodes = await fetchSeasonDetails(id, detailsData.seasons[0].season_number);
        setSelectedSeason(seasonWithEpisodes);
      }
    } catch (error) {
      console.error("Failed to fetch page data", error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchSeasonDetails = async (tvId, seasonNumber) => {
      const seasonUrl = `${API_BASE_URL}/tmdb/tv/${tvId}/season/${seasonNumber}?language=en-US`;
      return await fetchJson(seasonUrl, 'Error loading season details');
  };

  const handleSeasonClick = async (seasonNumber) => {
    const seasonDetails = await fetchSeasonDetails(mediaId, seasonNumber);
    setSelectedSeason(seasonDetails);
    setEpisodePage(1);
    setPaginationPage(1);
  };
  
  const handleFavoriteClick = () => {
    const mediaToSave = {
        id: mediaData.id,
        type: mediaType,
        title: mediaData.name || mediaData.title,
        poster_path: mediaData.poster_path,
        vote_average: mediaData.vote_average
    };

    const favorited = isShowFavorited(mediaData.id, mediaType);
    if (favorited) {
        removeFavoriteShow(mediaToSave);
    } else {
        addFavoriteShow(mediaToSave);
    }
  };

  const updatePlayback = (server, season = null, episode = null, isDubbed = false) => {
    const videoPlayer = document.getElementById('video-player');
    if (!videoPlayer) return;

    const mediaToSave = {
      id: mediaData.id,
      type: mediaType,
      title: mediaData.name || mediaData.title,
      poster_path: mediaData.poster_path,
      vote_average: mediaData.vote_average
    };
    
    saveWatchProgress(mediaToSave, season, episode);

    let streamUrl = '';
    if (mediaType === 'movie') {
        streamUrl = `${API_BASE_URL}/stream-url?source=${server}&type=movie&id=${mediaId}`;
    } else if (mediaType === 'tv') {
        streamUrl = `${API_BASE_URL}/stream-url?source=${server}&type=tv&id=${mediaId}&season=${season}&episode=${episode}&dub=${isDubbed}`;
    }
    
    fetch(streamUrl)
        .then(res => res.json())
        .then(data => {
            if(data.url) videoPlayer.src = data.url;
        });
  };

  const renderTrailerModal = () => {
    const trailer = videos.find(video => video.type === 'Trailer' && video.site === 'YouTube');
    if (!trailer) return null;

    return (
        <div id="trailer-modal" class="modal">
            <div class="modal-content">
                <span class="close-button" onClick={() => document.getElementById('trailer-modal').style.display = 'none'}>&times;</span>
                <iframe width="560" height="315" src={`https://www.youtube.com/embed/${trailer.key}`} frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen; picture-in-picture" allowfullscreen></iframe>
            </div>
        </div>
    );
  };

  if (loading) {
    return <div class="loading-spinner"></div>;
  }

  if (!mediaData) {
    return <p class="container">Could not load media details. Please try again later.</p>;
  }
  
  const backdropUrl = mediaData.backdrop_path ? `${ORIGINAL_IMAGE_BASE_URL}${mediaData.backdrop_path}` : '';

  return (
    <div>
      <div id="backdrop" style={{ backgroundImage: `url(${backdropUrl})` }}></div>
        <main class="container" id="media-details-content">
            <section id="media-header">
                <div class="poster">
                    <img src={`${IMAGE_BASE_URL}${mediaData.poster_path}`} alt={mediaData.title || mediaData.name} />
                </div>
                <div class="info">
                    <div class="title-container">
                        <h1>{mediaData.title || mediaData.name}</h1>
                        <button id="favorite-btn" class={isShowFavorited(mediaData.id, mediaType) ? 'favorited' : ''} onClick={handleFavoriteClick}>
                            {isShowFavorited(mediaData.id, mediaType) ? '♥ Favorited' : '♡ Add to Favorites'}
                        </button>
                    </div>
                    <div class="meta">
                        <span>{mediaData.release_date || mediaData.first_air_date}</span>
                        <span>{mediaData.genres.map(g => g.name).join(', ')}</span>
                        {mediaData.runtime && <span>{mediaData.runtime} min</span>}
                        <span class="rating">★ {mediaData.vote_average.toFixed(1)}</span>
                    </div>
                    <p class="overview">{mediaData.overview}</p>
                    <div class="actions">
                         {videos.find(v => v.type === 'Trailer') &&
                            <button id="watch-trailer-btn" onClick={() => document.getElementById('trailer-modal').style.display = 'block'}>Watch Trailer</button>
                         }
                    </div>
                </div>
            </section>
            
            <section id="playback">
                <h2>Watch Now</h2>
                <div class="server-selection">
                    <button class="server-btn active" onClick={(e) => updatePlayback(e.target.dataset.server)} data-server="videasy">Videasy</button>
                    <button class="server-btn" onClick={(e) => updatePlayback(e.target.dataset.server)} data-server="vidsrc">VidSrc</button>
                    <button class="server-btn" onClick={(e) => updatePlayback(e.target.dataset.server)} data-server="embedsu">Embeds.su</button>
                </div>
                <div class="video-container">
                    <iframe id="video-player" allowfullscreen></iframe>
                </div>
                {mediaType === 'tv' && (
                    <div class="select-container">
                        <label for="dub-select">Audio:</label>
                        <select
                            id="dub-select"
                            value={isDubbed}
                            onChange={(e) => {
                                setIsDubbed(e.target.value === 'true');
                                const activeServer = document.querySelector('.server-btn.active').dataset.server;
                                const currentEpisode = selectedSeason?.episodes?.[0]?.episode_number || 1;
                                updatePlayback(activeServer, selectedSeason?.season_number, currentEpisode, e.target.value === 'true');
                            }}
                        >
                            <option value="false">Subbed</option>
                            <option value="true">Dubbed</option>
                        </select>
                    </div>
                )}
            </section>

            {mediaType === 'tv' && mediaData.seasons && (
                <section id="seasons-episodes">
                    <h2>Seasons & Episodes</h2>
                    <div class="seasons-container">
                        {mediaData.seasons.filter(s => s.season_number > 0).map(s => (
                            <div class={`season-card ${selectedSeason?.season_number === s.season_number ? 'active' : ''}`} onClick={() => handleSeasonClick(s.season_number)}>
                                <img src={s.poster_path ? `${IMAGE_BASE_URL}${s.poster_path}` : 'https://via.placeholder.com/130x200?text=No+Image'} alt={s.name} />
                                <span>{s.name}</span>
                            </div>
                        ))}
                    </div>
                    {selectedSeason && (() => {
                        const totalEpisodes = selectedSeason.episodes.length;
                        const totalPages = Math.ceil(totalEpisodes / episodesPerPage);
                        const totalPaginationPages = Math.ceil(totalPages / pagesPerPagination);

                        const startEpisode = (episodePage - 1) * episodesPerPage;
                        const endEpisode = startEpisode + episodesPerPage;
                        const episodesOnPage = selectedSeason.episodes.slice(startEpisode, endEpisode);

                        const startPagination = (paginationPage - 1) * pagesPerPagination;
                        const endPagination = startPagination + pagesPerPagination;
                        const pagesToShow = Array.from({ length: totalPages }, (_, i) => i + 1).slice(startPagination, endPagination);

                        return (
                            <div>
                                <div class="episodes-container">
                                    <h3>{selectedSeason.name}</h3>
                                    {episodesOnPage.map(ep => (
                                        <div class="episode-card" onClick={() => updatePlayback(document.querySelector('.server-btn.active').dataset.server, selectedSeason.season_number, ep.episode_number, isDubbed)}>
                                            <div class="episode-thumbnail">
                                                <img src={ep.still_path ? `${IMAGE_BASE_URL}${ep.still_path}` : 'https://via.placeholder.com/150x84?text=No+Image'} alt={ep.name} />
                                            </div>
                                            <div class="episode-info">
                                                <h4>{ep.episode_number}. {ep.name}</h4>
                                                <p>{ep.overview}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {totalPages > 1 && (
                                    <div class="pagination-controls">
                                        {paginationPage > 1 && (
                                            <button onClick={() => setPaginationPage(paginationPage - 1)}>
                                                <i class="fas fa-angle-double-left"></i>
                                            </button>
                                        )}
                                        {pagesToShow.map(page => (
                                            <button
                                                key={page}
                                                class={episodePage === page ? 'active' : ''}
                                                onClick={() => setEpisodePage(page)}
                                            >
                                                {page}
                                            </button>
                                        ))}
                                        {paginationPage < totalPaginationPages && (
                                            <button onClick={() => setPaginationPage(paginationPage + 1)}>
                                                <i class="fas fa-angle-double-right"></i>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </section>
            )}

            {recommendations.length > 0 && (
                <section id="recommendations">
                    <h2>Recommendations</h2>
                    <div class="movie-grid">
                        {recommendations.map(item => <MovieCard item={item} type={mediaType} />)}
                    </div>
                </section>
            )}
        </main>
        {renderTrailerModal()}
    </div>
  );
};

render(<MoviePage />, document.getElementById('app'));