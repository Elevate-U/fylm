import { create } from 'zustand';
import { supabase } from './supabase';
import { persist } from 'zustand/middleware';
import { getContinueWatching } from './utils/watchHistory';
import toast from './components/Toast';


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
      trendingLoading: false,
      popularMovies: [],
      popularMoviesLoading: false,
      popularTv: [],
      popularTvLoading: false,
      topRatedMovies: [],
      topRatedMoviesLoading: false,
      topRatedTv: [],
      topRatedTvLoading: false,
      upcomingMovies: [],
      upcomingMoviesLoading: false,
      nowPlayingMovies: [],
      nowPlayingMoviesLoading: false,
      airingTodayTv: [],
      airingTodayTvLoading: false,
      favorites: [],
      favoritesFetched: false,
      favoritedMedia: new Set(),
      currentMediaItem: null,
      continueWatching: [],
      continueWatchingFetched: false,
      continueWatchingLoading: false,

      fetchContinueWatching: async () => {
        if (get().continueWatchingLoading) return;

        set({ continueWatchingLoading: true });

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            set({ continueWatching: [], continueWatchingFetched: true, continueWatchingLoading: false });
            return;
        }

        const items = await getContinueWatching(user.id);
        set({ continueWatching: items || [], continueWatchingFetched: true, continueWatchingLoading: false });
      },

      removeContinueWatchingItem: (mediaId) => {
        set((state) => ({
            continueWatching: state.continueWatching.filter(item => item.media_id !== mediaId)
        }));
      },

      setCurrentMediaItem: (mediaItem) => set({ currentMediaItem: mediaItem }),

      fetchTrending: async () => {
        if (get().trending.length > 0) return;
        set({ trendingLoading: true });
        try {
            const response = await fetch(`/api/tmdb/trending/all/week`);
            if (response.ok) {
                const data = await response.json();
                set({ trending: data.results || [] });
            }
        } catch (error) {
            console.error('Error fetching trending:', error);
        } finally {
            set({ trendingLoading: false });
        }
      },
      fetchPopularMovies: async () => {
        if (get().popularMovies.length > 0) return;
        set({ popularMoviesLoading: true });
        try {
            const results = await fetchAllPages(`/api/tmdb/movie/popular`);
            set({ popularMovies: results });
        } finally {
            set({ popularMoviesLoading: false });
        }
      },
      fetchPopularTv: async () => {
        if (get().popularTv.length > 0) return;
        set({ popularTvLoading: true });
        try {
            const results = await fetchAllPages(`/api/tmdb/tv/popular`);
            set({ popularTv: results });
        } finally {
            set({ popularTvLoading: false });
        }
      },
      fetchTopRatedMovies: async () => {
        if (get().topRatedMovies.length > 0) return;
        set({ topRatedMoviesLoading: true });
        try {
            const results = await fetchAllPages(`/api/tmdb/movie/top_rated`);
            set({ topRatedMovies: results });
        } finally {
            set({ topRatedMoviesLoading: false });
        }
      },
      fetchTopRatedTv: async () => {
        if (get().topRatedTv.length > 0) return;
        set({ topRatedTvLoading: true });
        try {
            const results = await fetchAllPages(`/api/tmdb/tv/top_rated`);
            set({ topRatedTv: results });
        } finally {
            set({ topRatedTvLoading: false });
        }
      },
      fetchUpcomingMovies: async () => {
        if (get().upcomingMovies.length > 0) return;
        set({ upcomingMoviesLoading: true });
        try {
            const results = await fetchAllPages(`/api/tmdb/movie/upcoming`);
            set({ upcomingMovies: results });
        } finally {
            set({ upcomingMoviesLoading: false });
        }
      },
      fetchNowPlayingMovies: async () => {
        if (get().nowPlayingMovies.length > 0) return;
        set({ nowPlayingMoviesLoading: true });
        try {
            const results = await fetchAllPages(`/api/tmdb/movie/now_playing`);
            set({ nowPlayingMovies: results });
        } finally {
            set({ nowPlayingMoviesLoading: false });
        }
      },
      fetchAiringTodayTv: async () => {
        if (get().airingTodayTv.length > 0) return;
        set({ airingTodayTvLoading: true });
        try {
            const results = await fetchAllPages(`/api/tmdb/tv/airing_today`);
            set({ airingTodayTv: results });
        } finally {
            set({ airingTodayTvLoading: false });
        }
      },

      // Favorites
      fetchFavorites: async (userId) => {
        if (!userId) {
          set({ favorites: [], favoritesFetched: true });
          return;
        }

        const { data, error } = await supabase
          .from('favorites')
          .select('media_id, media_type')
          .eq('user_id', userId);

        if (error) {
          console.error('Error fetching favorites:', error);
          set({ favoritesFetched: true });
          return;
        }

        const favoritedMedia = new Set(data.map(fav => `${fav.media_id}-${fav.media_type}`));
        set({ favoritedMedia, favoritesFetched: true });

        const favoritesWithDetails = await Promise.all(
          data.map(async (fav) => {
            try {
              const response = await fetch(`/api/tmdb/${fav.media_type}/${fav.media_id}`);
              if (response.ok) {
                const details = await response.json();
                return { ...details, type: fav.media_type };
              }
              return null;
            } catch (err) {
              console.warn(`Could not fetch details for favorited item ${fav.media_type}:${fav.media_id}. It will not appear in the favorites list.`, err);
              return null;
            }
          })
        );

        set({ favorites: favoritesWithDetails.filter(Boolean) });
      },

      isShowFavorited: (mediaId, mediaType, seasonNumber, episodeNumber) => {
        // For anime content, we need to check if the mediaId exists with either 'tv' or 'anime' type
        if (mediaType === 'anime') {
          return get().favoritedMedia.has(`${mediaId}-anime`) || get().favoritedMedia.has(`${mediaId}-tv`);
        }
        // For TV shows
        else if (mediaType === 'tv') {
          return get().favoritedMedia.has(`${mediaId}-tv`);
        }
        // For movies and other content types
        return get().favoritedMedia.has(`${mediaId}-${mediaType}`);
      },

      addFavorite: async (userId, mediaItem) => {
        if (!userId) return;
      
        const { id, type } = mediaItem;
        const key = `${id}-${type}`;
      
        if (get().favoritedMedia.has(key)) {
          return;
        }
      
        // Optimistic update
        set((state) => ({
          favorites: [mediaItem, ...state.favorites],
          favoritedMedia: new Set(state.favoritedMedia).add(key)
        }));

        toast.success(`"${mediaItem.title || mediaItem.name}" added to favorites!`);
      
        const { error } = await supabase.from('favorites').insert({
          user_id: userId,
          media_id: id,
          media_type: type
        });
      
        if (error) {
          console.error('Error adding favorite:', error);
          // Revert on error
          set((state) => {
            const newFavoritedMedia = new Set(state.favoritedMedia);
            newFavoritedMedia.delete(key);
            return {
              favoritedMedia: newFavoritedMedia,
              favorites: state.favorites.filter(f => f.id !== id || f.type !== type)
            };
          });
        }
      },
      
      removeFavorite: async (userId, mediaId, mediaType) => {
        if (!userId) return;
      
        const key = `${mediaId}-${mediaType}`;
        const mediaItem = get().favorites.find(item => item.id === mediaId && item.type === mediaType);

        // Optimistic update
        set((state) => {
          const newFavoritedMedia = new Set(state.favoritedMedia);
          newFavoritedMedia.delete(key);
          return {
            favoritedMedia: newFavoritedMedia,
            favorites: state.favorites.filter(item => !(item.id === mediaId && item.type === mediaType))
          };
        });

        if (mediaItem) {
            toast.error(`"${mediaItem.title || mediaItem.name}" removed from favorites.`);
        }
      
        const { error } = await supabase.from('favorites').delete().match({
          user_id: userId,
          media_id: mediaId,
          media_type: mediaType
        });
      
        if (error) {
          console.error('Error removing favorite:', error);
          // Revert on error
          set((state) => ({
            ...state,
            favorites: get().favorites,
            favoritedMedia: get().favoritedMedia
          }));
        }
      }
    }),
    {
        name: 'Fylm-storage', // name of the item in the storage (must be unique)
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