import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set, get) => ({
      favorites: [],
      history: [],

      // Favorites
      addFavorite: (mediaItem) => set((state) => ({ favorites: [mediaItem, ...state.favorites] })),
      removeFavorite: (mediaId) => set((state) => ({ favorites: state.favorites.filter((item) => item.id !== mediaId) })),
      isFavorited: (mediaId) => get().favorites.some((item) => item.id === mediaId),

      // History
      addToHistory: (mediaItem) => {
        set((state) => {
          const newHistory = [mediaItem, ...state.history.filter((item) => item.id !== mediaItem.id)];
          if (newHistory.length > 50) {
            newHistory.pop();
          }
          return { history: newHistory };
        });
      },
    }),
    {
      name: 'mystream-storage', // name of the item in the storage (must be unique)
    }
  )
); 