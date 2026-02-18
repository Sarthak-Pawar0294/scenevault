import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Loader2, Mail, Trash2, User } from 'lucide-react';
import { PlatformHeader } from '../components/platform/PlatformHeader';
import { useAuth } from '../contexts/AuthContext';
import { sceneService } from '../services';
import { Scene } from '../types';
import { supabase } from '../lib/supabase';

export function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const u = (user as any)?.user_metadata?.username;
    setUsername(typeof u === 'string' ? u : '');
  }, [user?.id]);

  useEffect(() => {
    const run = async () => {
      if (!user?.id) return;
      setError(null);
      setLoading(true);
      try {
        const data = await sceneService.fetchAllScenes(user.id);
        setScenes(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load profile stats');
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [user?.id]);

  const createdAtLabel = useMemo(() => {
    const raw = (user as any)?.created_at;
    if (!raw) return '—';
    const d = new Date(raw);
    if (!Number.isFinite(d.getTime())) return '—';
    return d.toLocaleDateString();
  }, [user]);

  const stats = useMemo(() => {
    const total = scenes.length;
    const byPlatform = scenes.reduce<Record<string, number>>((acc, s) => {
      const key = s.platform || 'Other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const categoryCounts = scenes.reduce<Record<string, number>>((acc, s) => {
      const key = s.category || '—';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const mostUsedCategory = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

    const lastActivityTs = scenes
      .map((s) => {
        const t = new Date((s as any).updated_at || s.created_at).getTime();
        return Number.isFinite(t) ? t : 0;
      })
      .reduce((m, v) => Math.max(m, v), 0);

    const lastActivity = lastActivityTs ? new Date(lastActivityTs).toLocaleString() : '—';
    return { total, byPlatform, mostUsedCategory, lastActivity };
  }, [scenes]);

  const handleSaveUsername = async () => {
    setUsernameMessage(null);
    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameMessage({ type: 'error', text: 'Username cannot be empty.' });
      return;
    }

    setSavingUsername(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        data: { username: trimmed },
      });
      if (updateErr) throw updateErr;
      setUsernameMessage({ type: 'success', text: 'Username updated.' });
    } catch (e: any) {
      setUsernameMessage({ type: 'error', text: e?.message || 'Failed to update username' });
    } finally {
      setSavingUsername(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('This will permanently delete all your data. Continue?')) return;
    setDeleting(true);
    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const u = authData.user;
      if (!u?.id) throw new Error('Not authenticated');

      const { error: scenesErr } = await supabase.from('scenes').delete().eq('user_id', u.id);
      if (scenesErr) throw scenesErr;

      const { error: playlistsErr } = await supabase.from('playlists').delete().eq('user_id', u.id);
      if (playlistsErr) throw playlistsErr;

      const { error: ytPlaylistsErr } = await supabase.from('youtube_playlists').delete().eq('user_id', u.id);
      if (ytPlaylistsErr) throw ytPlaylistsErr;

      const { error: tagsErr } = await supabase.from('tags').delete().eq('user_id', u.id);
      if (tagsErr) throw tagsErr;

      const { error: profilesErr } = await supabase.from('profiles').delete().eq('id', u.id);
      if (profilesErr) {
        const msg = String((profilesErr as any)?.message || '').toLowerCase();
        const safeToIgnore = msg.includes('profiles') && (msg.includes('does not exist') || msg.includes('schema cache') || msg.includes('not found'));
        if (!safeToIgnore) throw profilesErr;
      }

      const { error: signOutErr } = await supabase.auth.signOut();
      if (signOutErr) throw signOutErr;

      alert('Account data deleted. You have been signed out.');
    } catch (e: any) {
      alert(e?.message || 'Failed to delete account data');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PlatformHeader
        icon={<User className="w-6 h-6" />}
        title="Profile"
        description="Account and usage information"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="text-white font-bold text-lg">Account</div>

            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-[var(--text-secondary)]" />
                <div className="text-[var(--text-secondary)]">Email</div>
                <div className="text-white ml-auto">{user?.email || '—'}</div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
                <div className="text-[var(--text-secondary)]">Created</div>
                <div className="text-white ml-auto">{createdAtLabel}</div>
              </div>

              <div className="pt-2">
                <div className="text-sm text-[var(--text-secondary)]">Username</div>
                <div className="mt-2 flex flex-col sm:flex-row gap-3">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input flex-1"
                    placeholder="Your username"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    className="btn-primary disabled:opacity-50"
                    onClick={handleSaveUsername}
                    disabled={savingUsername}
                  >
                    {savingUsername ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </span>
                    ) : (
                      'Save'
                    )}
                  </button>
                </div>

                {usernameMessage && (
                  <div
                    className={
                      usernameMessage.type === 'success'
                        ? 'mt-3 text-sm rounded-[12px] border px-4 py-3 bg-[rgba(34,197,94,0.10)] border-[rgba(34,197,94,0.18)] text-[var(--status-available)]'
                        : 'mt-3 text-sm rounded-[12px] border px-4 py-3 bg-[rgba(239,68,68,0.10)] border-[rgba(239,68,68,0.18)] text-[var(--status-unavailable)]'
                    }
                  >
                    {usernameMessage.text}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="text-white font-bold text-lg">Danger Zone</div>
            <div className="mt-2 text-sm text-[var(--text-secondary)]">
              Permanently delete your SceneVault data.
            </div>
            <div className="mt-3 text-sm text-[var(--text-secondary)]">
              Note: Your Google account remains active. Only SceneVault data is deleted.
            </div>

            <div className="mt-5">
              <button
                type="button"
                className="px-4 py-2 rounded-[12px] bg-[rgba(239,68,68,0.18)] text-white border border-[rgba(239,68,68,0.35)] hover:bg-[rgba(239,68,68,0.28)] transition disabled:opacity-60"
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Account Data</span>
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="text-white font-bold text-lg">Statistics</div>
            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="text-sm text-[var(--text-secondary)] inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading stats...</span>
                </div>
              ) : error ? (
                <div className="text-sm text-[var(--status-unavailable)]">{error}</div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-[var(--text-secondary)]">Total scenes</div>
                    <div className="text-white font-semibold">{stats.total}</div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="text-[var(--text-secondary)]">Most used category</div>
                    <div className="text-white font-semibold">{stats.mostUsedCategory}</div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="text-[var(--text-secondary)]">Last activity</div>
                    <div className="text-white font-semibold text-right">{stats.lastActivity}</div>
                  </div>

                  <div className="pt-3 border-t border-[var(--bg-tertiary)]">
                    <div className="text-sm text-[var(--text-secondary)] mb-2">By platform</div>
                    <div className="space-y-2">
                      {Object.keys(stats.byPlatform).length === 0 ? (
                        <div className="text-sm text-[var(--text-secondary)]">—</div>
                      ) : (
                        Object.entries(stats.byPlatform)
                          .sort((a, b) => b[1] - a[1])
                          .map(([platform, count]) => (
                            <div key={platform} className="flex items-center justify-between text-sm">
                              <div className="text-[var(--text-secondary)]">{platform}</div>
                              <div className="text-white font-semibold">{count}</div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
