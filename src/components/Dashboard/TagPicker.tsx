import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Tag } from '../../types';

interface TagPickerProps {
  allTags: Tag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  onCreateTag?: (name: string) => Promise<Tag>;
  placeholder?: string;
}

const fallbackColors = ['#ef4444', '#3b82f6', '#a855f7', '#22c55e', '#f59e0b', '#64748b', '#ec4899'];

function normalizeColor(c?: string | null): string {
  if (!c) return '';
  return c.trim();
}

export function TagPicker({ allTags, selectedTagIds, onChange, onCreateTag, placeholder }: TagPickerProps) {
  const [query, setQuery] = useState('');

  const selectedTags = useMemo(
    () => allTags.filter((t) => selectedTagIds.includes(t.id)),
    [allTags, selectedTagIds]
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return allTags
      .filter((t) => !selectedTagIds.includes(t.id))
      .filter((t) => t.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [allTags, query, selectedTagIds]);

  const canCreate = useMemo(() => {
    const q = query.trim();
    if (!q) return false;
    return !allTags.some((t) => t.name.toLowerCase() === q.toLowerCase());
  }, [allTags, query]);

  const addTagId = (id: string) => {
    if (selectedTagIds.includes(id)) return;
    onChange([...selectedTagIds, id]);
    setQuery('');
  };

  const removeTagId = (id: string) => {
    onChange(selectedTagIds.filter((x) => x !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {selectedTags.map((t) => {
          const c = normalizeColor(t.color) || fallbackColors[Math.abs(t.name.length) % fallbackColors.length];
          return (
            <span
              key={t.id}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border"
              style={{ background: `${c}22`, borderColor: `${c}44`, color: c }}
            >
              <span className="truncate max-w-[140px]">{t.name}</span>
              <button type="button" onClick={() => removeTagId(t.id)} className="hover:opacity-80">
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
      </div>

      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input"
          placeholder={placeholder || 'Add tags...'}
        />

        {(suggestions.length > 0 || (canCreate && onCreateTag)) && (
          <div className="absolute z-50 mt-2 w-full rounded-[12px] overflow-hidden bg-[var(--bg-secondary)] border border-[var(--bg-tertiary)] shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
            {suggestions.map((t) => (
              <button
                key={t.id}
                type="button"
                className="w-full text-left px-4 py-3 text-sm text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-tertiary)]"
                onClick={() => addTagId(t.id)}
              >
                {t.name}
              </button>
            ))}

            {canCreate && onCreateTag && (
              <button
                type="button"
                className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                onClick={async () => {
                  const name = query.trim();
                  if (!name) return;
                  const created = await onCreateTag(name);
                  addTagId(created.id);
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Create tag "{query.trim()}"</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
