import { useState, useEffect } from 'react';
import { X, Youtube, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import { Category } from '../../types';

interface YouTubeImportProps {
  onImport: (playlistUrl: string, category: Category) => Promise<{ playlistTitle: string; addedCount: number }>;
  onCancel: () => void;
  onOpenSettings: () => void;
}

const categories: Category[] = ['F/M', 'F/F', 'M/F', 'M/M'];

export function YouTubeImport({ onImport, onCancel, onOpenSettings }: YouTubeImportProps) {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [category, setCategory] = useState<Category>('F/M');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [hasApiKey, setHasApiKey] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const apiKey = localStorage.getItem('youtube_api_key');
    setHasApiKey(!!apiKey);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const value = String(playlistUrl || '').trim();
    const looksLikePlaylistId = /^[A-Za-z0-9_-]{10,}$/.test(value) && !value.includes('http') && !value.includes('youtube');
    const hasListParam = value.includes('list=');
    const looksLikePlaylistUrl = value.includes('youtube.com/playlist') || value.includes('youtube.com') || value.includes('youtu.be');

    if (!value || (!looksLikePlaylistId && !hasListParam && !looksLikePlaylistUrl)) {
      setError('Invalid playlist URL');
      return;
    }

    setLoading(true);
    try {
      const result = await onImport(playlistUrl, category);
      setSuccessMessage(
        `Successfully imported playlist: ${result.playlistTitle}. Added ${result.addedCount} videos. Go to the YouTube section to view.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import playlist');
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="card max-w-lg w-full">
        <div className="bg-[var(--bg-secondary)] border-b border-[var(--bg-tertiary)] p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Youtube className="w-6 h-6 text-[var(--accent-red)]" />
            <h2 className="text-xl font-bold text-white">Import YouTube Playlist</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-[var(--bg-tertiary)] rounded transition"
          >
            <X className="w-5 h-5 text-[var(--text-secondary)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-start space-x-3 bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start space-x-3 bg-green-500/20 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{successMessage}</p>
            </div>
          )}

          {loading && progress.total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-zinc-300">
                  Importing videos...
                </p>
                <p className="text-xs text-zinc-400">
                  {progress.current} / {progress.total}
                </p>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-300"
                  style={{
                    width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Playlist URL *
            </label>
            <input
              type="text"
              required
              value={playlistUrl}
              onChange={(e) => setPlaylistUrl(e.target.value)}
              className="input"
              placeholder="https://www.youtube.com/playlist?list=... or PLxxxxxxxx"
              disabled={loading}
            />
            <p className="mt-2 text-xs text-zinc-400">
              Paste the playlist URL or just the playlist ID
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Category for all videos *
            </label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="input"
              disabled={loading}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-zinc-400">
              All imported videos will be assigned this category
            </p>
          </div>

          {!hasApiKey && (
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-200 mb-2">
                    YouTube Data API Key Not Configured
                  </p>
                  <p className="text-xs text-blue-100 mb-3">
                    Without an API key, full playlist data (thumbnails, metadata, pagination) won't be available. Add your key in Settings to unlock the full import experience.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenSettings();
                    }}
                    className="text-xs font-medium text-blue-300 hover:text-blue-200 transition flex items-center space-x-1"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Open Settings</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-xs text-zinc-300 space-y-2">
            <p className="font-medium text-zinc-200">How it works:</p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400">
              <li>Paste a YouTube playlist URL (e.g., youtube.com/playlist?list=...)</li>
              <li>Select a category for all videos</li>
              <li>With API key: fetches all metadata, thumbnails, and handles 100+ videos</li>
              <li>Without API key: you will be prompted to add one in Settings</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-700">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Importing...' : 'Import Playlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
