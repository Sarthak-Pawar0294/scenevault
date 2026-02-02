import { supabase } from '../lib/supabase';

export const sceneTagsService = {
  async fetchSceneTags(sceneIds: string[]) {
    if (sceneIds.length === 0) return [] as any[];

    const { data, error } = await supabase
      .from('scene_tags')
      .select('scene_id, tag:tags(*)')
      .in('scene_id', sceneIds);

    if (error) throw error;
    return (data || []) as any[];
  },

  async replaceTagsForScene(sceneId: string, tagIds: string[]) {
    const { error: delErr } = await supabase
      .from('scene_tags')
      .delete()
      .eq('scene_id', sceneId);

    if (delErr) throw delErr;

    if (tagIds.length === 0) return;

    const payload = tagIds.map((tagId) => ({ scene_id: sceneId, tag_id: tagId }));

    const { error } = await supabase
      .from('scene_tags')
      .insert(payload);

    if (error) throw error;
  },

  async addTagsToScenes(sceneIds: string[], tagIds: string[]) {
    if (sceneIds.length === 0 || tagIds.length === 0) return;

    const payload: Array<{ scene_id: string; tag_id: string }> = [];
    for (const sceneId of sceneIds) {
      for (const tagId of tagIds) {
        payload.push({ scene_id: sceneId, tag_id: tagId });
      }
    }

    const { error } = await supabase.from('scene_tags').upsert(payload, { onConflict: 'scene_id,tag_id' });
    if (error) throw error;
  },

  async removeTagsFromScenes(sceneIds: string[], tagIds: string[]) {
    if (sceneIds.length === 0 || tagIds.length === 0) return;

    const { error } = await supabase
      .from('scene_tags')
      .delete()
      .in('scene_id', sceneIds)
      .in('tag_id', tagIds);

    if (error) throw error;
  },

  async replaceTagsOnScenes(sceneIds: string[], tagIds: string[]) {
    if (sceneIds.length === 0) return;

    const { error: delErr } = await supabase
      .from('scene_tags')
      .delete()
      .in('scene_id', sceneIds);

    if (delErr) throw delErr;

    await this.addTagsToScenes(sceneIds, tagIds);
  },
};
