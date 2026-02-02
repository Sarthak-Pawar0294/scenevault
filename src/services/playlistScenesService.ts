import { supabase } from '../lib/supabase';
import { PlaylistSceneRow, Scene } from '../types';

export const playlistScenesService = {
  async fetchPlaylistScenes(playlistId: string) {
    const { data, error } = await supabase
      .from('playlist_scenes')
      .select('id, playlist_id, scene_id, position, scene:scenes(*)')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: true });

    if (error) throw error;

    const rows = (data || []) as any[];
    return rows
      .filter((r) => r.scene)
      .map((r) => ({
        id: r.id,
        playlist_id: r.playlist_id,
        scene_id: r.scene_id,
        position: r.position,
        scene: r.scene as Scene,
      })) as PlaylistSceneRow[];
  },

  async addScenesToPlaylist(playlistId: string, sceneIds: string[]) {
    if (sceneIds.length === 0) return;

    const { data: last, error: lastErr } = await supabase
      .from('playlist_scenes')
      .select('position')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: false })
      .limit(1);

    if (lastErr) throw lastErr;

    const startPos = typeof (last?.[0] as any)?.position === 'number' ? Number((last?.[0] as any).position) + 1 : 0;

    const payload = sceneIds.map((sceneId, idx) => ({
      playlist_id: playlistId,
      scene_id: sceneId,
      position: startPos + idx,
    }));

    const { error } = await supabase.from('playlist_scenes').upsert(payload, { onConflict: 'playlist_id,scene_id' });
    if (error) throw error;
  },

  async removeSceneFromPlaylist(playlistId: string, sceneId: string) {
    const { error } = await supabase
      .from('playlist_scenes')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('scene_id', sceneId);

    if (error) throw error;
  },

  async updatePositions(playlistId: string, ordered: Array<{ id: string; position: number }>) {
    if (ordered.length === 0) return;

    const payload = ordered.map((x) => ({
      id: x.id,
      playlist_id: playlistId,
      position: x.position,
    }));

    const { error } = await supabase.from('playlist_scenes').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
  },
};
