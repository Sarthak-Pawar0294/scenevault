import { X, ListPlus } from 'lucide-react';
import { Playlist } from '../../types';

interface AddToPlaylistModalProps {
  playlists: Playlist[];
  sceneCount: number;
  onClose: () => void;
  onAdd: (playlistId: string) => Promise<void>;
}

export function AddToPlaylistModal({ playlists, sceneCount, onClose, onAdd }: AddToPlaylistModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="card max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="bg-[var(--bg-secondary)] border-b border-[var(--bg-tertiary)] p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ListPlus className="w-6 h-6 text-[var(--accent-red)]" />
            <h2 className="text-xl font-bold text-white">Add to Playlist</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-tertiary)] rounded transition">
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-sm text-[var(--text-secondary)]">
            Choose a playlist for {sceneCount} scene{sceneCount === 1 ? '' : 's'}.
          </div>

          {playlists.length === 0 ? (
            <div className="text-sm text-[var(--text-secondary)]">No playlists yet. Create one first.</div>
          ) : (
            <div className="space-y-2">
              {playlists.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={async () => {
                    await onAdd(p.id);
                    onClose();
                  }}
                  className="w-full text-left px-4 py-3 rounded-[12px] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition"
                >
                  <div className="text-white font-semibold">{p.name}</div>
                  {p.description && <div className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{p.description}</div>}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
