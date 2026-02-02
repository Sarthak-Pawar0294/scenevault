import { useCallback, useEffect, useState } from 'react';
import { Tags } from 'lucide-react';
import { PlatformHeader } from '../components/platform/PlatformHeader';
import { TagManagementPage } from '../components/Dashboard/TagManagementPage';
import { useAuth } from '../contexts/AuthContext';
import { tagService } from '../services';
import { Tag } from '../types';

export function TagsPage() {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTags = useCallback(async () => {
    if (!user?.id) return;
    setError(null);
    setLoading(true);
    try {
      const data = await tagService.fetchTags(user.id);
      setTags(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  const handleCreate = async (input: { name: string; color?: string | null }) => {
    if (!user?.id) throw new Error('Not authenticated');
    await tagService.createTag({ user_id: user.id, name: input.name, color: input.color || null });
    await loadTags();
  };

  const handleUpdate = async (id: string, updates: { name?: string; color?: string | null }) => {
    await tagService.updateTag(id, updates);
    await loadTags();
  };

  const handleDelete = async (id: string) => {
    await tagService.deleteTag(id);
    await loadTags();
  };

  return (
    <div className="space-y-6">
      <PlatformHeader
        icon={<Tags className="w-6 h-6" />}
        title="Tags"
        description="Create, edit, and reuse tags across your scenes"
      />

      {loading && (
        <div className="card p-6 text-[var(--text-secondary)]">Loading tags...</div>
      )}

      {!loading && error && (
        <div className="card p-6 text-[var(--status-unavailable)] border border-[rgba(239,68,68,0.25)]">
          {error}
        </div>
      )}

      {!loading && !error && user?.id && (
        <TagManagementPage
          tags={tags}
          userId={user.id}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          showHeader={false}
        />
      )}
    </div>
  );
}
