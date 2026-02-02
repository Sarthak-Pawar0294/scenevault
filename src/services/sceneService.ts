import { supabase } from '../lib/supabase';
import { Scene, Status } from '../types';

export const sceneService = {
  // Paginated scenes fetch
  async fetchScenes(userId: string, page = 0, pageSize = 50) {
    void page;
    void pageSize;
    return this.fetchAllScenes(userId);
  },

  // Full fetch (fallback for small datasets or export)
  async fetchAllScenes(userId: string) {
    const { data, error } = await supabase
      .from('scenes')
      .select('*, scene_tags:scene_tags(tag:tags(*))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const normalized = (data || []).map((s: any) => ({
      ...s,
      status: s.status === 'available' ? 'available' : (s.status === 'private' ? 'private' : 'unavailable'),
      tags: Array.isArray(s.scene_tags)
        ? s.scene_tags.map((st: any) => st.tag).filter(Boolean)
        : [],
    })) as Scene[];
    return normalized;
  },

  async createScene(scene: Omit<Scene, 'id' | 'created_at' | 'updated_at'> & { user_id: string }) {
    const { data, error } = await supabase.from('scenes').insert(scene).select().single();
    if (error) throw error;
    return data as Scene;
  },

  async updateScene(id: string, updates: Partial<Scene>) {
    const { data, error } = await supabase.from('scenes').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as Scene;
  },

  async deleteScene(id: string) {
    const { error } = await supabase.from('scenes').delete().eq('id', id);
    if (error) throw error;
  },

  async batchUpdateStatus(sceneIds: string[], status: Status) {
    const { error } = await supabase.from('scenes').update({ status }).in('id', sceneIds);
    if (error) throw error;
  },

  async batchDelete(sceneIds: string[]) {
    const { error } = await supabase.from('scenes').delete().in('id', sceneIds);
    if (error) throw error;
  },
};
