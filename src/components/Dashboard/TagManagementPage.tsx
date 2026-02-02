import { useMemo, useState } from 'react';
import { Plus, Trash2, Pencil, Tag as TagIcon } from 'lucide-react';
import { Tag } from '../../types';

interface TagManagementPageProps {
  tags: Tag[];
  userId: string;
  onCreate: (input: { name: string; color?: string | null }) => Promise<void>;
  onUpdate: (id: string, updates: { name?: string; color?: string | null }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  showHeader?: boolean;
}

function normalizeColor(c?: string | null): string {
  const v = (c || '').trim();
  return v;
}

export function TagManagementPage({ tags, userId, onCreate, onUpdate, onDelete, showHeader = true }: TagManagementPageProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#64748b');
  const [busy, setBusy] = useState<string | null>(null);

  const canCreate = name.trim().length > 0;

  const grouped = useMemo(() => {
    const global = tags.filter((t) => !t.user_id);
    const mine = tags.filter((t) => t.user_id === userId);
    return { global, mine };
  }, [tags, userId]);

  const handleCreate = async () => {
    const n = name.trim();
    if (!n) return;
    setBusy('create');
    try {
      await onCreate({ name: n, color: color || null });
      setName('');
    } finally {
      setBusy(null);
    }
  };

  const renderTagRow = (t: Tag) => {
    const isGlobal = !t.user_id;
    const c = normalizeColor(t.color) || '#64748b';

    return (
      <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 rounded-[12px] bg-[var(--bg-tertiary)] border border-[var(--surface-border)]">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ background: c }} />
            <div className="text-white font-semibold truncate">{t.name}</div>
            {isGlobal && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-white/10 text-white border border-white/10">
                Global
              </span>
            )}
          </div>
          {t.created_at && (
            <div className="text-xs text-[var(--text-secondary)] mt-1">{t.created_at}</div>
          )}
        </div>

        {!isGlobal && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-[12px] hover:bg-black/20 transition text-sm text-[var(--text-secondary)] hover:text-white flex items-center gap-2"
              onClick={async () => {
                const nextName = prompt('Edit tag name', t.name) || '';
                if (!nextName.trim()) return;
                const nextColor = prompt('Edit tag color (hex)', c) || c;
                setBusy(t.id);
                try {
                  await onUpdate(t.id, { name: nextName.trim(), color: nextColor.trim() });
                } finally {
                  setBusy(null);
                }
              }}
              disabled={busy !== null}
              title="Edit tag"
            >
              <Pencil className="w-4 h-4" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              className="px-3 py-2 rounded-[12px] hover:bg-red-500/20 transition text-sm text-[var(--accent-red)] flex items-center gap-2"
              onClick={async () => {
                if (!confirm(`Delete tag "${t.name}"?`)) return;
                setBusy(t.id);
                try {
                  await onDelete(t.id);
                } finally {
                  setBusy(null);
                }
              }}
              disabled={busy !== null}
              title="Delete tag"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex items-center gap-3">
          <TagIcon className="w-6 h-6 text-[var(--accent-red)]" />
          <div>
            <h1 className="text-2xl font-bold text-white">Tags</h1>
            <div className="text-sm text-[var(--text-secondary)]">Create, edit, and reuse tags across scenes</div>
          </div>
        </div>
      )}

      <div className="card p-6">
        <div className="text-sm font-semibold text-white mb-4">Create Tag</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Tag name (e.g. Favorites)"
          />
          <input
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="input"
            placeholder="#64748b"
          />
          <button
            type="button"
            className="btn-primary flex items-center justify-center gap-2"
            onClick={handleCreate}
            disabled={!canCreate || busy !== null}
          >
            <Plus className="w-4 h-4" />
            <span>{busy === 'create' ? 'Creating...' : 'Create'}</span>
          </button>
        </div>
      </div>

      {grouped.mine.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-white">Your Tags</div>
          <div className="space-y-2">{grouped.mine.map(renderTagRow)}</div>
        </div>
      )}

      {grouped.global.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-semibold text-white">Default Tags</div>
          <div className="space-y-2">{grouped.global.map(renderTagRow)}</div>
        </div>
      )}
    </div>
  );
}
