import { create } from 'zustand';
import { supabase } from './supabase';
import { persist } from 'zustand/middleware';


export const useStore = create(
    persist(
    (set, get) => ({
      trending: [],
      popularMovies: [],
      popularTv: [],
      topRatedMovies: [],
      topRatedTv: [],
      favorites: [],
      favoritesFetched: false,
      currentMediaItem: null,

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
        try {
            const response = await fetch(`/api/tmdb/movie/popular`);
             if (response.ok) {
                const data = await response.json();
                set({ popularMovies: data.results || [] });
            }
        } catch (error) {
            console.error('Error fetching popular movies:', error);
        }
      },
      fetchPopularTv: async () => {
        if (get().popularTv.length > 0) return;
        try {
            const response = await fetch(`/api/tmdb/tv/popular`);
            if (response.ok) {
                const data = await response.json();
                set({ popularTv: data.results || [] });
            }
        } catch (error) {
            console.error('Error fetching popular TV:', error);
        }
      },
      fetchTopRatedMovies: async () => {
        if (get().topRatedMovies.length > 0) return;
        try {
            const response = await fetch(`/api/tmdb/movie/top_rated`);
            if (response.ok) {
                const data = await response.json();
                set({ topRatedMovies: data.results || [] });
            }
        } catch (error) {
            console.error('Error fetching top rated movies:', error);
        }
      },
      fetchTopRatedTv: async () => {
        if (get().topRatedTv.length > 0) return;
        try {
            const response = await fetch(`/api/tmdb/tv/top_rated`);
            if (response.ok) {
                const data = await response.json();
                set({ topRatedTv: data.results || [] });
            }
        } catch (error) {
            console.error('Error fetching top rated TV:', error);
        }
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
            .select('media_id, media_type')
            .eq('user_id', user.id);
        
        if (error) {
            console.error('Error fetching favorites:', error);
            set({ favoritesFetched: true });
            return;
        }
        
        const favoritesWithDetails = await Promise.all(data.map(async (fav) => {
            const response = await fetch(`/api/tmdb/${fav.media_type}/${fav.media_id}`);
            if (response.ok) {
                const details = await response.json();
                return { ...details, type: fav.media_type };
            }
            return null;
        }));
        
        set({ favorites: favoritesWithDetails.filter(Boolean), favoritesFetched: true });
      },

      addFavorite: async (mediaItem) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Optimistic update
        set((state) => ({ favorites: [mediaItem, ...state.favorites] }));

        const { error } = await supabase
            .from('favorites')
            .insert({ 
                user_id: user.id, 
                media_id: mediaItem.id, 
                media_type: mediaItem.type 
            });

        if (error) {
            console.error('Error adding favorite:', error);
            // Revert on error
            set((state) => ({ favorites: state.favorites.filter(f => f.id !== mediaItem.id)}));
        }
      },
      removeFavorite: async (mediaId) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const originalFavorites = get().favorites;
        // Optimistic update
        set((state) => ({ favorites: state.favorites.filter((item) => item.id !== mediaId) }));

        const { error } = await supabase
            .from('favorites')
            .delete()
            .match({ user_id: user.id, media_id: mediaId });
        
        if (error) {
            console.error('Error removing favorite:', error);
            // Revert on error
            set({ favorites: originalFavorites });
        }
      },
      isFavorited: (mediaId) => {
        const { favorites, favoritesFetched } = get();
        if (!favoritesFetched) {
            // You might want to show a loading state or disable the button
            // until favorites are fetched. For now, we return false.
            return false;
        }
        return favorites.some((item) => item.id === mediaId);
      }
    }),
    {
        name: 'freestream-storage', // name of the item in the storage (must be unique)
        getStorage: () => localStorage, // (optional) by default, 'localStorage' is used
        partialize: (state) => ({ 
            favorites: state.favorites,
            trending: state.trending,
            popularMovies: state.popularMovies,
            popularTv: state.popularTv,
            topRatedMovies: state.topRatedMovies,
            topRatedTv: state.topRatedTv
        }),
    }
    )
); 