import { useState, useEffect } from 'react';
import { Scene, SceneFormData, Platform, Category, Tag } from '../../types';
import { X } from 'lucide-react';
import { TagPicker } from './TagPicker';

interface SceneFormProps {
  scene?: Scene;
  defaultPlatform?: Platform;
  recentScenes?: Scene[];
  allTags?: Tag[];
  onCreateTag?: (name: string) => Promise<Tag>;
  onSubmit: (data: SceneFormData) => Promise<void>;
  onCancel: () => void;
}

const platforms: Platform[] = ['YouTube', 'JioHotstar', 'Zee5', 'SonyLIV', 'Other'];
const categories: Category[] = ['F/M', 'F/F', 'M/F', 'M/M'];

export function SceneForm({ scene, defaultPlatform, onSubmit, onCancel, allTags = [], onCreateTag }: SceneFormProps) {
  const [loading, setLoading] = useState(false);
  const [thumbnailPreviewOk, setThumbnailPreviewOk] = useState(true);
  const [formData, setFormData] = useState<SceneFormData>({
    title: scene?.title || '',
    platform: scene?.platform || defaultPlatform || 'YouTube',
    category: scene?.category || 'F/M',
    url: scene?.url || '',
    thumbnail: scene?.thumbnail || '',
    timestamp: scene?.timestamp || '',
    notes: scene?.notes || '',
    status: scene?.status || 'available',
    tagIds: (scene?.tags || []).map((t) => t.id),
  });

  useEffect(() => {
    if (scene) {
      setFormData({
        title: scene.title,
        platform: scene.platform,
        category: scene.category,
        url: scene.url || '',
        thumbnail: scene.thumbnail || '',
        timestamp: scene.timestamp || '',
        notes: scene.notes || '',
        status: scene.status,
        tagIds: (scene.tags || []).map((t) => t.id),
      });
    }
  }, [scene]);

  useEffect(() => {
    setThumbnailPreviewOk(true);
  }, [formData.thumbnail]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }
      const isSubmitCombo = (e.ctrlKey || e.metaKey) && e.key === 'Enter';
      if (isSubmitCombo) {
        e.preventDefault();
        if (!loading) {
          const form = document.getElementById('scene-form') as HTMLFormElement | null;
          form?.requestSubmit();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [loading, onCancel]);

  useEffect(() => {
    if (scene) return;
    if (!defaultPlatform) return;
    setFormData((prev) => ({
      ...prev,
      platform: defaultPlatform,
    }));
  }, [defaultPlatform, scene]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    try {
      await onSubmit(formData);
      onCancel();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#27272a] border-b border-zinc-700 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">{scene ? 'Edit Scene' : 'Add Scene'}</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-zinc-700 rounded transition"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <form
          id="scene-form"
          onSubmit={handleSubmit}
          className="p-6 space-y-6"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Title *</label>
              <input
                type="text"
                required
                maxLength={200}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Platform *</label>
              <select
                required
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value as Platform })}
                className="input w-full"
              >
                {platforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Category *</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
                className="input w-full"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Tags</label>
              <TagPicker
                allTags={allTags}
                selectedTagIds={formData.tagIds || []}
                onChange={(tagIds) => setFormData({ ...formData, tagIds })}
                onCreateTag={onCreateTag}
                placeholder="Type to search tags..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Video URL (optional)</label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Thumbnail URL (optional)</label>
              <input
                type="url"
                value={formData.thumbnail}
                onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                className="input w-full"
              />
              {(formData.thumbnail || '').trim() && thumbnailPreviewOk && (
                <div className="mt-3">
                  <div className="w-full max-w-sm aspect-video rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900">
                    <img
                      src={formData.thumbnail || ''}
                      alt="Thumbnail preview"
                      className="w-full h-full object-cover"
                      onError={() => setThumbnailPreviewOk(false)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Timestamp (optional)</label>
              <input
                type="text"
                value={formData.timestamp}
                onChange={(e) => setFormData({ ...formData, timestamp: e.target.value })}
                className="input w-full"
                placeholder="12:30 or Episode 5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Notes (optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="input w-full resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-700">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
              {loading ? 'Saving...' : scene ? 'Update Scene' : 'Add Scene'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
