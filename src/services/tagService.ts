import { supabase } from '../lib/supabase';
import { Tag } from '../types';

export const tagService = {
  async fetchTags(userId: string) {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []) as Tag[];
  },

  async createTag(input: { user_id: string; name: string; color?: string | null }) {
    const { data, error } = await supabase
      .from('tags')
      .insert({
        user_id: input.user_id,
        name: input.name,
        color: input.color || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Tag;
  },

  async updateTag(id: string, updates: Partial<Pick<Tag, 'name' | 'color'>>) {
    const { data, error } = await supabase
      .from('tags')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Tag;
  },

  async deleteTag(id: string) {
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if (error) throw error;
  },
};
