import { supabase } from '../lib/supabase';
import { Playlist } from '../types';

export const playlistService = {
  async fetchPlaylists(userId: string) {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Playlist[];
  },

  async createPlaylist(input: { user_id: string; name: string; description?: string }) {
    const { data, error } = await supabase
      .from('playlists')
      .insert({
        user_id: input.user_id,
        name: input.name,
        description: input.description || null,
        is_youtube_import: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Playlist;
  },

  async updatePlaylist(id: string, updates: Partial<Pick<Playlist, 'name' | 'description' | 'thumbnail_url'>>) {
    const { data, error } = await supabase
      .from('playlists')
      .update({
        ...updates,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Playlist;
  },

  async deletePlaylist(id: string) {
    const { error } = await supabase.from('playlists').delete().eq('id', id);
    if (error) throw error;
  },
};
