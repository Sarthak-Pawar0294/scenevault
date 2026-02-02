import { useState } from 'react';
import { X, ListPlus } from 'lucide-react';

interface CreatePlaylistModalProps {
  onClose: () => void;
  onCreate: (data: { name: string; description: string }) => Promise<void>;
}

export function CreatePlaylistModal({ onClose, onCreate }: CreatePlaylistModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const canSubmit = name.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    try {
      await onCreate({ name: name.trim(), description: description.trim() });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="card max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="bg-[var(--bg-secondary)] border-b border-[var(--bg-tertiary)] p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ListPlus className="w-6 h-6 text-[var(--accent-red)]" />
            <h2 className="text-xl font-bold text-white">Create Playlist</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-tertiary)] rounded transition">
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="My favorite scenes"
              disabled={saving}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input resize-none"
              rows={3}
              placeholder="Optional"
              disabled={saving}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--bg-tertiary)]">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!canSubmit || saving}>
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
