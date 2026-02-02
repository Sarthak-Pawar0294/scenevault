import { useState } from 'react';
import { X, Tags } from 'lucide-react';
import { Tag } from '../../types';
import { TagPicker } from './TagPicker';

type Mode = 'add' | 'remove' | 'replace';

interface BulkTagsModalProps {
  allTags: Tag[];
  onClose: () => void;
  onCreateTag: (name: string) => Promise<Tag>;
  onApply: (mode: Mode, tagIds: string[]) => Promise<void>;
}

export function BulkTagsModal({ allTags, onClose, onCreateTag, onApply }: BulkTagsModalProps) {
  const [mode, setMode] = useState<Mode>('add');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const canApply = tagIds.length > 0;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="card max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="bg-[var(--bg-secondary)] border-b border-[var(--bg-tertiary)] p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tags className="w-6 h-6 text-[var(--accent-red)]" />
            <h2 className="text-xl font-bold text-white">Bulk Tags</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-tertiary)] rounded transition">
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Action</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              className="input"
            >
              <option value="add">Add tags</option>
              <option value="remove">Remove tags</option>
              <option value="replace">Replace tags</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">Tags</label>
            <TagPicker
              allTags={allTags}
              selectedTagIds={tagIds}
              onChange={setTagIds}
              onCreateTag={onCreateTag}
              placeholder="Type to search tags..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--bg-tertiary)]">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={saving}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!canApply || saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onApply(mode, tagIds);
                  onClose();
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? 'Applying...' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
