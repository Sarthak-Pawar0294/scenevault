import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Settings, ShieldCheck, ShieldX } from 'lucide-react';
import { PlatformHeader } from '../components/platform/PlatformHeader';

export function SettingsPage() {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [deletedPlaylistVideos, setDeletedPlaylistVideos] = useState<'mark' | 'remove'>('mark');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('youtube_api_key');
    if (saved) setApiKey(saved);

    const storedDeletedPref = localStorage.getItem('youtube_deleted_playlist_videos');
    if (storedDeletedPref === 'remove' || storedDeletedPref === 'mark') {
      setDeletedPlaylistVideos(storedDeletedPref);
    }
  }, []);

  const handleSave = async () => {
    setMessage(null);
    setSaving(true);
    try {
      localStorage.setItem('youtube_api_key', apiKey.trim());
      localStorage.setItem('youtube_deleted_playlist_videos', deletedPlaylistVideos);
      setMessage({ type: 'success', text: 'API key saved!' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setMessage(null);
    setTesting(true);
    try {
      const key = apiKey.trim();
      if (!key) {
        setMessage({ type: 'error', text: 'Please enter an API key first.' });
        return;
      }

      const testUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=jNQXAC9IVRw&key=${encodeURIComponent(key)}`;
      const response = await fetch(testUrl);
      const data: any = await response.json().catch(() => ({}));

      if (!response.ok || data?.error) {
        const msg = data?.error?.message || `API key is invalid (HTTP ${response.status})`;
        setMessage({ type: 'error', text: msg });
        return;
      }

      setMessage({ type: 'success', text: 'API key is valid!' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e?.message || 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PlatformHeader
        icon={<Settings className="w-6 h-6" />}
        title="Settings"
        description="Preferences and configuration"
        tertiaryAction={{
          label: 'Back',
          onClick: () => {
            const idx = (window.history.state as any)?.idx;
            if (typeof idx === 'number' && idx > 0) {
              navigate(-1);
              return;
            }
            navigate('/all-scenes');
          },
        }}
      />

      <div className="card p-6 max-w-2xl">
        <div className="text-white font-bold text-lg">YouTube API Key</div>
        <div className="text-sm text-[var(--text-secondary)] mt-1">
          Required for playlist import (thumbnails, metadata, and pagination).
        </div>

        <div className="mt-5 space-y-3">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="input w-full"
            placeholder="AIzaSy..."
            autoComplete="off"
          />

          {message && (
            <div
              className={
                message.type === 'success'
                  ? 'flex items-start gap-3 rounded-[12px] border px-4 py-3 bg-[rgba(34,197,94,0.10)] border-[rgba(34,197,94,0.18)] text-[var(--status-available)]'
                  : 'flex items-start gap-3 rounded-[12px] border px-4 py-3 bg-[rgba(239,68,68,0.10)] border-[rgba(239,68,68,0.18)] text-[var(--status-unavailable)]'
              }
            >
              {message.type === 'success' ? (
                <ShieldCheck className="w-5 h-5 mt-0.5" />
              ) : (
                <ShieldX className="w-5 h-5 mt-0.5" />
              )}
              <div className="text-sm text-white/90">{message.text}</div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </span>
              ) : (
                'Save'
              )}
            </button>

            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="px-4 py-2 rounded-[12px] bg-[var(--bg-tertiary)] text-white border border-[var(--bg-tertiary)] hover:bg-black/20 transition disabled:opacity-50"
            >
              {testing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Testing...</span>
                </span>
              ) : (
                'Test API Key'
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="card p-6 max-w-2xl">
        <div className="text-white font-bold text-lg">YouTube Playlist Refresh</div>
        <div className="text-sm text-[var(--text-secondary)] mt-1">
          Choose what to do when a video is removed from a playlist on YouTube.
        </div>

        <div className="mt-5 space-y-3">
          <label className="block text-sm font-medium text-white">When YouTube video is deleted from playlist:</label>
          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="youtube_deleted_playlist_videos"
                value="mark"
                checked={deletedPlaylistVideos === 'mark'}
                onChange={() => setDeletedPlaylistVideos('mark')}
              />
              <div>
                <div className="text-sm text-white">Mark as unavailable (keep in SceneVault)</div>
                <div className="text-xs text-[var(--text-secondary)]">Keeps the scene, but sets status to unavailable.</div>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="youtube_deleted_playlist_videos"
                value="remove"
                checked={deletedPlaylistVideos === 'remove'}
                onChange={() => setDeletedPlaylistVideos('remove')}
              />
              <div>
                <div className="text-sm text-white">Remove from SceneVault completely</div>
                <div className="text-xs text-[var(--text-secondary)]">Deletes the scene from your library when it’s no longer in the playlist.</div>
              </div>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </span>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
