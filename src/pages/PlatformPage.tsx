import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Grid, Monitor, PlaySquare, Plus, Tv, Youtube } from 'lucide-react';
import { PlatformHeader } from '../components/platform/PlatformHeader';
import { StatsBar } from '../components/platform/StatsBar';
import { AdvancedSearchBar, AdvancedSortOption, FilterChipId } from '../components/platform/AdvancedSearchBar';
import { EmptyState } from '../components/platform/EmptyState';
import { SceneCard } from '../components/Dashboard/SceneCard';
import { SceneForm } from '../components/Dashboard/SceneForm';
import { SceneDetailModal } from '../components/Dashboard/SceneDetailModal';
import { SceneGridSkeleton, PlaylistGridSkeleton } from '../components/Dashboard/Skeletons';
import { YouTubeImport } from '../components/Dashboard/YouTubeImport';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { sceneService, sceneTagsService, tagService, youtubeService } from '../services';
import { Category, Platform, Scene, SceneFormData, Tag, YouTubePlaylist } from '../types';

function formatPlatformName(segment: string | undefined): string {
  const s = (segment || '').toLowerCase();
  switch (s) {
    case 'youtube':
      return 'YouTube';
    case 'jiohotstar':
      return 'JioHotstar';
    case 'zee5':
      return 'Zee5';
    case 'sonyliv':
      return 'SonyLIV';
    case 'other':
      return 'Other';
    default:
      return 'Platform';
  }
}

function toPlatform(segment: string | undefined): Platform | null {
  const s = (segment || '').toLowerCase();
  switch (s) {
    case 'youtube':
      return 'YouTube';
    case 'jiohotstar':
      return 'JioHotstar';
    case 'zee5':
      return 'Zee5';
    case 'sonyliv':
      return 'SonyLIV';
    case 'other':
      return 'Other';
    default:
      return null;
  }
}

function platformIcon(segment: string | undefined) {
  const s = (segment || '').toLowerCase();
  switch (s) {
    case 'youtube':
      return <Youtube className="w-6 h-6" />;
    case 'jiohotstar':
      return <Tv className="w-6 h-6" />;
    case 'zee5':
      return <PlaySquare className="w-6 h-6" />;
    case 'sonyliv':
      return <Monitor className="w-6 h-6" />;
    case 'other':
      return <Grid className="w-6 h-6" />;
    default:
      return <Grid className="w-6 h-6" />;
  }
}

export function PlatformPage() {
  const { platform } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const platformType = useMemo(() => toPlatform(platform), [platform]);
  const platformName = useMemo(() => formatPlatformName(platform), [platform]);

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [youtubePlaylists, setYoutubePlaylists] = useState<YouTubePlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<AdvancedSortOption>('newest');
  const [activeChip, setActiveChip] = useState<FilterChipId>('all');

  const debouncedQuery = useDebounce(query, 300);

  const [showForm, setShowForm] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | undefined>(undefined);
  const [detailScene, setDetailScene] = useState<Scene | undefined>(undefined);

  const [selectedYouTubePlaylistId, setSelectedYouTubePlaylistId] = useState<string | null>(null);
  const [showYouTubeImport, setShowYouTubeImport] = useState(false);

  const isYouTube = (platform || '').toLowerCase() === 'youtube';
  const description = isYouTube
    ? 'Playlists and saved video scenes'
    : 'Dedicated platform library';

  const loadData = useCallback(async () => {
    if (!user?.id || !platformType) return;

    setError(null);
    setLoading(true);
    try {
      const [scenesData, tagsData, playlistsData] = await Promise.all([
        sceneService.fetchAllScenes(user.id),
        tagService.fetchTags(user.id),
        isYouTube ? youtubeService.fetchPlaylists(user.id) : Promise.resolve([] as YouTubePlaylist[]),
      ]);
      setScenes(scenesData);
      setAllTags(tagsData);
      setYoutubePlaylists(playlistsData);
    } catch (e: any) {
      setError(e?.message || 'Failed to load platform data');
    } finally {
      setLoading(false);
    }
  }, [isYouTube, platformType, user?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setSelectedYouTubePlaylistId(null);
  }, [platform]);

  const platformScenes = useMemo(() => {
    if (!platformType) return [] as Scene[];
    return scenes.filter((s) => s.platform === platformType);
  }, [platformType, scenes]);

  const playlistsForCards = useMemo(() => {
    if (!isYouTube) return [] as Array<{ playlist_id: string; title: string; thumbnail?: string; video_count: number }>;

    const playlistSceneCounts = platformScenes
      .filter((s) => s.platform === 'YouTube' && s.source_type === 'youtube_playlist' && !!s.playlist_id)
      .reduce<Record<string, number>>((acc, s) => {
        const id = s.playlist_id as string;
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {});

    const playlistFirstThumb = platformScenes
      .filter((s) => s.platform === 'YouTube' && s.source_type === 'youtube_playlist' && !!s.playlist_id)
      .reduce<Record<string, string>>((acc, s) => {
        const id = s.playlist_id as string;
        if (!acc[id] && s.thumbnail) acc[id] = s.thumbnail;
        return acc;
      }, {});

    const playlistIdSet = new Set(Object.keys(playlistSceneCounts));

    const merged = [
      ...youtubePlaylists.map((p) => ({
        playlist_id: p.playlist_id,
        title: p.title,
        thumbnail: p.thumbnail,
        video_count: p.video_count,
        imported_at: p.imported_at,
      })),
      ...Array.from(playlistIdSet)
        .filter((id) => !youtubePlaylists.some((p) => p.playlist_id === id))
        .map((id) => ({
          playlist_id: id,
          title: `Playlist: ${id}`,
          thumbnail: playlistFirstThumb[id] || '',
          video_count: playlistSceneCounts[id] || 0,
          imported_at: '',
        })),
    ].sort((a, b) => {
      const aTime = a.imported_at ? new Date(a.imported_at).getTime() : 0;
      const bTime = b.imported_at ? new Date(b.imported_at).getTime() : 0;
      return bTime - aTime;
    });

    return merged;
  }, [isYouTube, platformScenes, youtubePlaylists]);

  const filteredPlatformScenes = useMemo(() => {
    if (!isYouTube || !selectedYouTubePlaylistId) return platformScenes;

    if (selectedYouTubePlaylistId === '__manual__') {
      return platformScenes.filter((s) => s.source_type === 'manual' || !s.playlist_id);
    }

    return platformScenes.filter((s) => s.playlist_id === selectedYouTubePlaylistId);
  }, [isYouTube, platformScenes, selectedYouTubePlaylistId]);

  const filteredScenes = useMemo(() => {
    let filtered = [...filteredPlatformScenes];

    const q = debouncedQuery.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((s) => {
        const title = (s.title || '').toLowerCase();
        const channel = (s.channel_name || '').toLowerCase();
        const notes = (s.notes || '').toLowerCase();
        return title.includes(q) || channel.includes(q) || notes.includes(q);
      });
    }

    if (activeChip !== 'all') {
      if (activeChip === 'available') {
        filtered = filtered.filter((s) => s.status === 'available');
      } else if (activeChip === 'unavailable') {
        filtered = filtered.filter((s) => s.status === 'unavailable' || s.status === 'private');
      } else {
        filtered = filtered.filter((s) => s.category === activeChip);
      }
    }

    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'title-asc':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'title-desc':
        filtered.sort((a, b) => b.title.localeCompare(a.title));
        break;
    }

    return filtered;
  }, [activeChip, debouncedQuery, filteredPlatformScenes, sortBy]);

  const stats = useMemo(() => {
    const available = platformScenes.filter((s) => s.status === 'available').length;
    const unavailable = platformScenes.filter((s) => s.status === 'unavailable' || s.status === 'private').length;
    const extraValue = isYouTube
      ? playlistsForCards.length
      : new Set(platformScenes.map((s) => s.category)).size;
    return {
      total: platformScenes.length,
      available,
      unavailable,
      extraValue,
    };
  }, [isYouTube, platformScenes, playlistsForCards.length]);

  const handleOpenAdd = () => {
    setEditingScene(undefined);
    setShowForm(true);
  };

  const handleEdit = (scene: Scene) => {
    setEditingScene(scene);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingScene(undefined);
  };

  const handleCreateTag = async (name: string) => {
    if (!user?.id) throw new Error('Not authenticated');
    const created = await tagService.createTag({ user_id: user.id, name });
    const updatedTags = await tagService.fetchTags(user.id);
    setAllTags(updatedTags);
    return created;
  };

  const handleAddScene = async (data: SceneFormData) => {
    if (!user?.id) throw new Error('Not authenticated');

    const { tagIds, ...sceneData } = data;
    const created = await sceneService.createScene({
      ...sceneData,
      user_id: user.id,
      source_type: 'manual',
      platform: platformType || sceneData.platform,
    } as any);

    await sceneTagsService.replaceTagsForScene(created.id, tagIds || []);
    await loadData();
  };

  const handleUpdateScene = async (data: SceneFormData) => {
    if (!editingScene) return;

    const { tagIds, ...sceneData } = data;
    await sceneService.updateScene(editingScene.id, {
      ...sceneData,
      updated_at: new Date().toISOString(),
    } as any);

    await sceneTagsService.replaceTagsForScene(editingScene.id, tagIds || []);
    await loadData();
  };

  const handleDeleteScene = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scene?')) return;
    try {
      await sceneService.deleteScene(id);
      await loadData();
    } catch (e: any) {
      alert(e?.message || 'Failed to delete scene');
    }
  };

  const handleCheckStatus = async (sceneId: string) => {
    const scene = scenes.find((s) => s.id === sceneId);
    if (!scene || scene.platform !== 'YouTube' || !scene.video_id) return;

    const availability = await youtubeService.checkVideoAvailability(scene.video_id);
    await sceneService.updateScene(scene.id, {
      status: availability,
      updated_at: new Date().toISOString(),
    });
    await loadData();
  };

  const handleYouTubeImport = async (playlistUrl: string, category: Category) => {
    if (!user?.id) throw new Error('Not authenticated');
    const apiKey = localStorage.getItem('youtube_api_key') || '';
    const result = await youtubeService.importPlaylist(playlistUrl, category, apiKey, user.id);
    await loadData();
    return result;
  };

  const handleBackToPlaylists = () => {
    setSelectedYouTubePlaylistId(null);
  };

  const showPlaylistGrid = isYouTube && !selectedYouTubePlaylistId;

  return (
    <div className="space-y-6">
      <PlatformHeader
        icon={platformIcon(platform)}
        title={platformName}
        description={description}
        primaryAction={{
          label: 'Add Scene',
          onClick: handleOpenAdd,
          icon: <Plus className="w-5 h-5" />,
        }}
        secondaryAction={
          isYouTube
            ? {
                label: 'Import Playlist',
                onClick: () => setShowYouTubeImport(true),
                icon: <Youtube className="w-5 h-5" />,
              }
            : undefined
        }
        tertiaryAction={
          isYouTube && selectedYouTubePlaylistId
            ? {
                label: 'Back to Playlists',
                onClick: handleBackToPlaylists,
              }
            : undefined
        }
      />

      <StatsBar
        total={stats.total}
        available={stats.available}
        unavailable={stats.unavailable}
        extraLabel={isYouTube ? 'Playlists' : 'Categories'}
        extraValue={stats.extraValue}
        extraIcon={platformIcon(platform)}
      />

      <AdvancedSearchBar
        query={query}
        onQueryChange={setQuery}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        activeChip={activeChip}
        onChipChange={setActiveChip}
        onOpenFilters={() => {}}
      />

      {!platformType && (
        <EmptyState
          icon={platformIcon(platform)}
          title="Unknown platform"
          description="This platform route is not recognized."
        />
      )}

      {platformType && loading && (showPlaylistGrid ? <PlaylistGridSkeleton count={6} /> : <SceneGridSkeleton count={12} />)}

      {platformType && !loading && error && (
        <div className="card p-6 text-[var(--status-unavailable)] border border-[rgba(239,68,68,0.25)]">
          {error}
        </div>
      )}

      {platformType && !loading && !error && showPlaylistGrid && (
        <div className="space-y-6">
          <div className="grid [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))] gap-6">
            <button
              type="button"
              onClick={() => setSelectedYouTubePlaylistId('__manual__')}
              className="card p-5 text-left hover:shadow-[0_18px_40px_rgba(0,0,0,0.55)] transition"
            >
              <div className="w-full aspect-video rounded-[12px] bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                <Plus className="w-10 h-10 text-[var(--text-secondary)]" />
              </div>
              <div className="text-white font-bold">Individual Videos</div>
              <div className="text-sm text-[var(--text-secondary)] mt-1">
                {platformScenes.filter((s) => s.source_type === 'manual' || !s.playlist_id).length} video(s)
              </div>
            </button>

            {playlistsForCards.map((p) => (
              <button
                key={p.playlist_id}
                type="button"
                onClick={() => {
                  setSelectedYouTubePlaylistId(p.playlist_id);
                }}
                className="card p-5 text-left hover:shadow-[0_18px_40px_rgba(0,0,0,0.55)] transition"
              >
                <div className="w-full aspect-video rounded-[12px] bg-[var(--bg-tertiary)] border border-[var(--bg-tertiary)] overflow-hidden mb-4">
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Youtube className="w-10 h-10 text-[var(--text-secondary)]" />
                    </div>
                  )}
                </div>
                <div className="text-white font-bold line-clamp-2">{p.title}</div>
                <div className="text-sm text-[var(--text-secondary)] mt-1">{p.video_count} video(s)</div>
              </button>
            ))}
          </div>

          {playlistsForCards.length === 0 && (
            <EmptyState
              icon={platformIcon(platform)}
              title="No playlists yet"
              description="Import a playlist to start building your YouTube library."
              actionLabel="Import Playlist"
              onAction={() => setShowYouTubeImport(true)}
            />
          )}
        </div>
      )}

      {platformType && !loading && !error && !showPlaylistGrid && filteredScenes.length === 0 && (
        <EmptyState
          icon={platformIcon(platform)}
          title={platformScenes.length === 0 ? `No ${platformName} scenes yet` : 'No results'}
          description={
            platformScenes.length === 0
              ? 'Add your first scene to start building this platform library.'
              : 'Try adjusting your search, filters, or sorting.'
          }
          actionLabel={platformScenes.length === 0 ? 'Add Scene' : undefined}
          onAction={platformScenes.length === 0 ? handleOpenAdd : undefined}
        />
      )}

      {platformType && !loading && !error && !showPlaylistGrid && filteredScenes.length > 0 && (
        <div className="grid [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))] gap-6">
          {filteredScenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              onEdit={handleEdit}
              onDelete={handleDeleteScene}
              onViewDetails={setDetailScene}
              onCheckStatus={handleCheckStatus}
            />
          ))}
        </div>
      )}

      {showForm && (
        <SceneForm
          scene={editingScene}
          defaultPlatform={platformType || undefined}
          onSubmit={editingScene ? handleUpdateScene : handleAddScene}
          onCancel={handleCancelForm}
          allTags={allTags}
          onCreateTag={handleCreateTag}
        />
      )}

      {detailScene && (
        <SceneDetailModal
          scene={detailScene}
          onClose={() => setDetailScene(undefined)}
          onEdit={(scene) => {
            setDetailScene(undefined);
            handleEdit(scene);
          }}
          onDelete={handleDeleteScene}
          onCheckStatus={handleCheckStatus}
        />
      )}

      {showYouTubeImport && (
        <YouTubeImport
          onImport={handleYouTubeImport}
          onCancel={() => setShowYouTubeImport(false)}
          onOpenSettings={() => navigate('/settings')}
        />
      )}
    </div>
  );
}
