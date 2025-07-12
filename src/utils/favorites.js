import { supabase } from './supabase';
import { useStore } from '../store';
import { route } from 'preact-router';

/**
 * Adds a show to the user's favorites.
 *
 * @param {object} show - The show object to add.
 * @returns {Promise<void>}
 */
export const addFavoriteShow = async (show) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (confirm('You need to log in to save favorites. Would you like to go to the login page?')) {
      route('/login');
    }
    return;
  }

  const showId = show.id;
  const { getState, setState } = useStore;
  const state = getState();

  // Prevent adding if already favorited
  const favoriteKey = `${showId}-tv`;
  if (state.favoritedMedia.has(favoriteKey)) {
    return;
  }

  // Optimistic update
  setState((currentState) => ({
    favorites: [{ ...show, type: 'tv' }, ...currentState.favorites],
    favoritedMedia: new Set(currentState.favoritedMedia).add(favoriteKey),
  }));

  // Show a notification
  alert(`'${show.name || show.title}' has been added to your Favorites.`);
  
  // Add to Supabase
  const { error } = await supabase.from('favorites').insert({
    user_id: user.id,
    media_id: showId,
    media_type: 'tv',
  });

  if (error) {
    console.error('Error adding favorite show:', error);
    // Revert on error
    setState((currentState) => {
        const newFavoritedMedia = new Set(currentState.favoritedMedia);
        newFavoritedMedia.delete(favoriteKey);
        return {
            favoritedMedia: newFavoritedMedia,
            favorites: currentState.favorites.filter(f => f.id !== showId)
        };
    });
  }
};

/**
 * Removes a show from the user's favorites after confirmation.
 *
 * @param {object} show - The show object to remove.
 * @returns {Promise<void>}
 */
export const removeFavoriteShow = async (show) => {
  if (confirm(`This will remove the entire show '${show.name || show.title}' and all its episodes from your Favorites. Do you wish to continue?`)) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const showId = show.id;
    const { getState, setState } = useStore;
    const favoriteKey = `${showId}-tv`;

    const originalFavorites = getState().favorites;
    const originalFavoritedMedia = getState().favoritedMedia;

    // Optimistic update
    setState((currentState) => ({
      favorites: currentState.favorites.filter(fav => fav.id !== showId),
      favoritedMedia: new Set([...currentState.favoritedMedia].filter(id => id !== favoriteKey)),
    }));

    // Remove from Supabase
    const { error } = await supabase.from('favorites').delete().match({ user_id: user.id, media_id: showId, media_type: 'tv' });

    if (error) {
        console.error('Error removing favorite show:', error);
        // Revert on error
        setState({ favorites: originalFavorites, favoritedMedia: originalFavoritedMedia });
    }
  }
};

/**
 * Checks if a show is favorited.
 *
 * @param {number} showId - The ID of the show.
 * @returns {boolean}
 */
export const isShowFavorited = (showId) => {
  return useStore.getState().favoritedMedia.has(`${showId}-tv`);
};