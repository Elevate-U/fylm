import { create } from 'zustand';
import { supabase } from './supabase';
import { persist } from 'zustand/middleware';
import { getContinueWatching } from './utils/watchHistory';


const fetchAllPages = async (url, totalPages = 3) => {
    let allResults = [];
    for (let page = 1; page <= totalPages; page++) {
        try {
            const response = await fetch(`${url}?page=${page}`);
            if (response.ok) {
                const data = await response.json();
                allResults = [...allResults, ...(data.results || [])];
            }
        } catch (error) {
            console.error(`Error fetching page ${page} from ${url}:`, error);
        }
    }
    return allResults;
};


export const useStore = create(
    persist(
    (set, get) => ({
      trending: [],
      popularMovies: [],
      popularTv: [],
      topRatedMovies: [],
      topRatedTv: [],
      upcomingMovies: [],
      nowPlayingMovies: [],
      airingTodayTv: [],
      favorites: [],
      favoritesFetched: false,
      favoritedMedia: new Set(),
      currentMediaItem: null,
      continueWatching: [],
      continueWatchingFetched: false,

      fetchContinueWatching: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            set({ continueWatching: [], continueWatchingFetched: true });
            return;
        }

        const items = await getContinueWatching();
        if (!items || items.length === 0) {
            set({ continueWatching: [], continueWatchingFetched: true });
            return;
        }

        const uniqueInProgressItems = items.reduce((acc, current) => {
            if (!acc.some(item => item.media_id === current.media_id)) {
                acc.push(current);
            }
            return acc;
        }, []);

        set({ continueWatching: uniqueInProgressItems, continueWatchingFetched: true });
      },

      removeContinueWatchingItem: (mediaId) => {
        set((state) => ({
            continueWatching: state.continueWatching.filter(item => item.media_id !== mediaId)
        }));
      },

      setCurrentMediaItem: (mediaItem) => set({ currentMediaItem: mediaItem }),

      fetchTrending: async () => {
        if (get().trending.length > 0) return;
        try {
            const response = await fetch(`/api/tmdb/trending/all/week`);
            if (response.ok) {
                const data = await response.json();
                set({ trending: data.results || [] });
            }
        } catch (error) {
            console.error('Error fetching trending:', error);
        }
      },
      fetchPopularMovies: async () => {
        if (get().popularMovies.length > 0) return;
        const results = await fetchAllPages(`/api/tmdb/movie/popular`);
        set({ popularMovies: results });
      },
      fetchPopularTv: async () => {
        if (get().popularTv.length > 0) return;
        const results = await fetchAllPages(`/api/tmdb/tv/popular`);
        set({ popularTv: results });
      },
      fetchTopRatedMovies: async () => {
        if (get().topRatedMovies.length > 0) return;
        const results = await fetchAllPages(`/api/tmdb/movie/top_rated`);
        set({ topRatedMovies: results });
      },
      fetchTopRatedTv: async () => {
        if (get().topRatedTv.length > 0) return;
        const results = await fetchAllPages(`/api/tmdb/tv/top_rated`);
        set({ topRatedTv: results });
      },
      fetchUpcomingMovies: async () => {
        if (get().upcomingMovies.length > 0) return;
        const results = await fetchAllPages(`/api/tmdb/movie/upcoming`);
        set({ upcomingMovies: results });
      },
      fetchNowPlayingMovies: async () => {
        if (get().nowPlayingMovies.length > 0) return;
        const results = await fetchAllPages(`/api/tmdb/movie/now_playing`);
        set({ nowPlayingMovies: results });
      },
      fetchAiringTodayTv: async () => {
        if (get().airingTodayTv.length > 0) return;
        const results = await fetchAllPages(`/api/tmdb/tv/airing_today`);
        set({ airingTodayTv: results });
      },

      // Favorites
      fetchFavorites: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            set({ favorites: [], favoritesFetched: true });
            return;
        }

        const { data, error } = await supabase
            .from('favorites')
            .select('media_id, media_type, season_number, episode_number, episode_name')
            .eq('user_id', user.id);
        
        if (error) {
            console.error('Error fetching favorites:', error);
            set({ favoritesFetched: true });
            return;
        }

        // Create a unique key for each favorited item for reliable lookup
        const favoritedMedia = new Set(data.map(fav => 
            `${fav.media_id}-${fav.media_type}-${fav.season_number || null}-${fav.episode_number || null}`
        ));
        set({ favoritedMedia, favoritesFetched: true });
        
        const favoritesWithDetails = await Promise.all(data.map(async (fav) => {
            try {
                const response = await fetch(`/api/tmdb/${fav.media_type}/${fav.media_id}`);
                if (response.ok) {
                    const details = await response.json();
                    
                    // For TV episodes, we need to fetch episode-specific data
                    if (fav.media_type === 'tv' && fav.season_number && fav.episode_number) {
                        try {
                            const episodeResponse = await fetch(`/api/tmdb/tv/${fav.media_id}/season/${fav.season_number}/episode/${fav.episode_number}`);
                            if (episodeResponse.ok) {
                                const episodeDetails = await episodeResponse.json();
                                return {
                                    ...details,
                                    type: fav.media_type,
                                    season_number: fav.season_number,
                                    episode_number: fav.episode_number,
                                    episode_name: episodeDetails.name || fav.episode_name,
                                    still_path: episodeDetails.still_path,
                                    vote_average: episodeDetails.vote_average || details.vote_average,
                                    overview: episodeDetails.overview || details.overview
                                };
                            }
                        } catch (error) {
                            console.error('Error fetching episode details:', error);
                        }
                        
                        // Fallback to stored episode data if API fails
                        return {
                            ...details,
                            type: fav.media_type,
                            season_number: fav.season_number,
                            episode_number: fav.episode_number,
                            episode_name: fav.episode_name
                        };
                    }
                    
                    return { ...details, type: fav.media_type };
                }
                return null;
            } catch (err) {
                console.warn(`Could not fetch details for favorited item ${fav.media_type}:${fav.media_id}. It will not appear in the favorites list.`, err);
                return null;
            }
        }));
        
        set({ favorites: favoritesWithDetails.filter(Boolean) });
      },

      isFavorited: (mediaId, mediaType, seasonNumber = null, episodeNumber = null) => {
        const key = `${mediaId}-${mediaType}-${seasonNumber || null}-${episodeNumber || null}`;
        return get().favoritedMedia.has(key);
      },

      addFavorite: async (mediaItem) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { id, type, season_number, episode_number, name, title, poster_path, vote_average } = mediaItem;
        const key = `${id}-${type}-${season_number || null}-${episode_number || null}`;

        // Prevent adding if it's already in the local state, as a safeguard
        if (get().favoritedMedia.has(key)) {
            console.warn('Attempted to add an already existing favorite. Aborting.', mediaItem);
            return;
        }
        
        // Optimistic update
        set((state) => ({ 
            favorites: [mediaItem, ...state.favorites],
            favoritedMedia: new Set(state.favoritedMedia).add(key)
        }));

        const favoriteData = {
            user_id: user.id, 
            media_id: id, 
            media_type: type
        };

        // Add episode-specific data for TV shows
        if (type === 'tv' && season_number && episode_number) {
            favoriteData.season_number = season_number;
            favoriteData.episode_number = episode_number;
            favoriteData.episode_name = mediaItem.episode_name;
        }

        const { error } = await supabase
            .from('favorites')
            .insert(favoriteData, { onConflict: 'user_id, media_id, media_type, season_number, episode_number' });

        if (error) {
            console.error('Error adding favorite:', error);
            // Revert on error
            set((state) => {
                const newFavoritedMedia = new Set(state.favoritedMedia);
                newFavoritedMedia.delete(key);
                return { 
                    favoritedMedia: newFavoritedMedia,
                    favorites: state.favorites.filter(f => 
                        f.id !== id || 
                        f.season_number !== season_number || 
                        f.episode_number !== episode_number
                    )
                }
            });
        }
      },
      removeFavorite: async (mediaId, seasonNumber = null, episodeNumber = null) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const mediaItem = get().favorites.find(item => 
            item.id === mediaId && 
            item.season_number === seasonNumber && 
            item.episode_number === episodeNumber
        );

        const key = `${mediaId}-${mediaItem?.type || ''}-${seasonNumber || null}-${episodeNumber || null}`;

        const originalFavorites = get().favorites;
        const originalFavoritedMedia = get().favoritedMedia;

        // Optimistic update - remove matching favorite
        set((state) => {
            const newFavoritedMedia = new Set(state.favoritedMedia);
            newFavoritedMedia.delete(key);
            return {
                favoritedMedia: newFavoritedMedia,
                favorites: state.favorites.filter((item) => 
                    !(item.id === mediaId && 
                      item.season_number === seasonNumber && 
                      item.episode_number === episodeNumber)
                )
            }
        });

        const deleteQuery = supabase
            .from('favorites')
            .delete()
            .match({ user_id: user.id, media_id: mediaId });

        // Add episode-specific filters if provided
        if (seasonNumber !== null && episodeNumber !== null) {
            deleteQuery.match({ season_number: seasonNumber, episode_number: episodeNumber });
        } else {
            // For movies, ensure we're only deleting items without episode data
            deleteQuery.is('season_number', null).is('episode_number', null);
        }

        const { error } = await deleteQuery;
        
        if (error) {
            console.error('Error removing favorite:', error);
            // Revert on error
            set({ favorites: originalFavorites, favoritedMedia: originalFavoritedMedia });
        }
      },
      isFavorited: (mediaId, mediaType, seasonNumber = null, episodeNumber = null) => {
        const { favoritedMedia, favoritesFetched } = get();
        if (!favoritesFetched) {
            return false;
        }
        const key = `${mediaId}-${mediaType}-${seasonNumber || null}-${episodeNumber || null}`;
        return favoritedMedia.has(key);
      }
    }),
    {
        name: 'freestream-storage', // name of the item in the storage (must be unique)
        storage: localStorage, // Updated from deprecated getStorage
        partialize: (state) => ({ 
            favorites: state.favorites,
            favoritedMedia: state.favoritedMedia,
            trending: state.trending,
            popularMovies: state.popularMovies,
            popularTv: state.popularTv,
            topRatedMovies: state.topRatedMovies,
            topRatedTv: state.topRatedTv,
            upcomingMovies: state.upcomingMovies,
            nowPlayingMovies: state.nowPlayingMovies,
            airingTodayTv: state.airingTodayTv,
            continueWatching: state.continueWatching
        }),
    }
    )
); 