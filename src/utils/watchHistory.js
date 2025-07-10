import { supabase } from '../supabase';

const getCurrentUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
};

export const getWatchHistory = async () => {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
        .from('watch_history')
        .select('*')
        .eq('user_id', userId)
        .order('watched_at', { ascending: false });

    if (error) {
        console.error('Error fetching watch history:', error);
        return [];
    }
    return data;
};

export const getWatchProgressForMedia = async (mediaId, mediaType, season, episode) => {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    let query = supabase
        .from('watch_progress')
        .select('progress_seconds, duration_seconds')
        .eq('user_id', userId)
        .eq('media_id', mediaId)
        .eq('media_type', mediaType);
    
    if (mediaType !== 'movie') {
        query = query.eq('season_number', season).eq('episode_number', episode);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') { // Ignore 'exact one row' error
        console.error('Error fetching watch progress:', error);
    }
    return data;
};


export const saveWatchProgress = async (item, progress, durationInMinutes) => {
    // No need to get userId here, as it's handled by the RPC function's auth context
    if (!item || typeof progress === 'undefined' || progress < 5) return;

    const params = {
        p_media_id: item.id,
        p_media_type: item.type,
        p_season_number: item.season,
        p_episode_number: item.episode,
        p_progress_seconds: Math.round(progress)
    };

    if (durationInMinutes) {
        params.p_duration_seconds = durationInMinutes * 60;
    }

    const { error } = await supabase.rpc('save_watch_progress', params);

    if (error) {
        console.error('Error saving watch progress:', error);
    }
};

export const deleteWatchItem = async (item) => {
    if (!item) return;
    
    const { error } = await supabase.rpc('delete_watch_item', {
        p_media_id: item.media_id,
        p_media_type: item.media_type,
        p_season_number: item.season_number,
        p_episode_number: item.episode_number
    });

    if (error) {
        console.error('Error deleting watch item:', error);
    }
};


export const getSeriesHistory = async (seriesId) => {
    const userId = await getCurrentUserId();
    if (!userId) return {};

    const { data, error } = await supabase
        .from('watch_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('media_id', seriesId);
    
    if (error) {
        console.error('Error fetching series history:', error);
        return {};
    }
    
    const seriesData = {};
    data.forEach(item => {
        const key = `tv-${item.media_id}-s${item.season_number}-e${item.episode_number}`;
        seriesData[key] = {
            id: item.media_id,
            type: item.media_type,
            season: item.season_number,
            episode: item.episode_number,
            progress: item.progress_seconds,
            duration: item.duration_seconds,
        };
    });
    return seriesData;
};

export const getLastWatchedEpisode = async (seriesId) => {
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const { data, error } = await supabase
        .from('watch_history')
        .select('season_number, episode_number')
        .eq('user_id', userId)
        .eq('media_id', seriesId)
        .order('watched_at', { ascending: false })
        .limit(1)
        .single();
    
    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching last watched episode:', error);
        return null;
    }
    
    return data ? { season: data.season_number, episode: data.episode_number } : null;
}; 