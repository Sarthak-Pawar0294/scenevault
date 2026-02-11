import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Loader2, Plus, RefreshCw } from 'lucide-react';
import { PlatformHeader } from '../components/platform/PlatformHeader';
import { StatsBar } from '../components/platform/StatsBar';
import {
  AdvancedFilters,
  AdvancedSearchBar,
  AdvancedSortOption,
  defaultAdvancedFilters,
  FilterChipId,
} from '../components/platform/AdvancedSearchBar';
import { EmptyState } from '../components/platform/EmptyState';
import { SceneCard } from '../components/Dashboard/SceneCard';
import { SceneForm } from '../components/Dashboard/SceneForm';
import { SceneDetailModal } from '../components/Dashboard/SceneDetailModal';
import { SceneGridSkeleton } from '../components/Dashboard/Skeletons';
import { CheckAllVideosModal } from '../components/Dashboard/CheckAllVideosModal';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { sceneService, sceneTagsService, tagService, youtubeService } from '../services';
import { Scene, SceneFormData, Tag } from '../types';
import { supabase } from '../lib/supabase';

export function AllScenesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<AdvancedSortOption>('newest');
  const [activeChip, setActiveChip] = useState<FilterChipId>('all');
  const [filters, setFilters] = useState<AdvancedFilters>(defaultAdvancedFilters);

  const debouncedQuery = useDebounce(query, 300);

  const [showForm, setShowForm] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | undefined>(undefined);
  const [detailScene, setDetailScene] = useState<Scene | undefined>(undefined);

  const [checkModalOpen, setCheckModalOpen] = useState(false);
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkProgress, setCheckProgress] = useState({ current: 0, total: 0 });
  const [checkError, setCheckError] = useState<string | null>(null);
  const cancelCheckRef = useRef(false);

  const [exactStats, setExactStats] = useState<{
    total: number;
    available: number;
    unavailable: number;
    platforms: number;
  } | null>(null);

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    setError(null);
    setLoading(true);
    try {
      const [scenesData, tagsData] = await Promise.all([
        sceneService.fetchAllScenes(user.id),
        tagService.fetchTags(user.id),
      ]);
      setScenes(scenesData);
      setAllTags(tagsData);
    } catch (e: any) {
      setError(e?.message || 'Failed to load scenes');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const loadExactStats = useCallback(async () => {
    if (!user?.id) return;
    const userId = user.id;

    try {
      const [{ count: totalCount, error: totalErr }, { count: availableCount, error: availErr }, { count: unavailableCount, error: unavailErr }] =
        await Promise.all([
          supabase.from('scenes').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase
            .from('scenes')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'available'),
          supabase
            .from('scenes')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .in('status', ['unavailable', 'private']),
        ]);

      if (totalErr) throw totalErr;
      if (availErr) throw availErr;
      if (unavailErr) throw unavailErr;

      let platforms = new Set(scenes.map((s) => s.platform)).size;
      try {
        const { data: platformsCount, error: platformsErr } = await supabase.rpc('count_distinct_scene_platforms', { p_user_id: userId });
        if (!platformsErr && typeof platformsCount === 'number') {
          platforms = platformsCount;
        }
      } catch {
        void 0;
      }

      setExactStats({
        total: totalCount || 0,
        available: availableCount || 0,
        unavailable: unavailableCount || 0,
        platforms,
      });
    } catch {
      setExactStats(null);
    }
  }, [scenes, user?.id]);

  useEffect(() => {
    void loadExactStats();
  }, [loadExactStats]);

  const stats = useMemo(() => {
    if (exactStats) return exactStats;
    const available = scenes.filter((s) => s.status === 'available').length;
    const unavailable = scenes.filter((s) => s.status === 'unavailable' || s.status === 'private').length;
    const platforms = new Set(scenes.map((s) => s.platform)).size;
    return {
      total: scenes.length,
      available,
      unavailable,
      platforms,
    };
  }, [exactStats, scenes]);

  const filteredScenes = useMemo(() => {
    let filtered = [...scenes];

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

    if (filters.categories.length > 0) {
      filtered = filtered.filter((s) => filters.categories.includes(s.category));
    }

    if (filters.platforms.length > 0) {
      filtered = filtered.filter((s) => filters.platforms.includes(s.platform));
    }

    if (filters.statuses.length > 0) {
      filtered = filtered.filter((s) => {
        const wantsAvailable = filters.statuses.includes('available');
        const wantsUnavailable = filters.statuses.includes('unavailable');
        const isUnavailable = s.status === 'unavailable' || s.status === 'private';
        return (wantsAvailable && s.status === 'available') || (wantsUnavailable && isUnavailable);
      });
    }

    if (filters.dateRange !== 'all') {
      const now = Date.now();
      const days = filters.dateRange === '7d' ? 7 : (filters.dateRange === '30d' ? 30 : 90);
      const cutoff = now - days * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((s) => {
        const t = new Date(s.created_at).getTime();
        return Number.isFinite(t) && t >= cutoff;
      });
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
  }, [activeChip, debouncedQuery, filters.categories, filters.dateRange, filters.platforms, filters.statuses, scenes, sortBy]);

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
    } as any);

    await sceneTagsService.replaceTagsForScene(created.id, tagIds || []);
    await loadData();
    await loadExactStats();
  };

  const handleCancelCheckAll = () => {
    cancelCheckRef.current = true;
    setCheckingAll(false);
  };

  const handleCheckAllVideos = async () => {
    if (!user?.id) return;

    const youtubeScenes = scenes.filter((s) => s.platform === 'YouTube' && !!s.video_id);
    const total = youtubeScenes.length;

    cancelCheckRef.current = false;
    setCheckError(null);
    setCheckProgress({ current: 0, total });
    setCheckModalOpen(true);

    const apiKey = localStorage.getItem('youtube_api_key') || '';
    if (!apiKey) {
      setCheckError('YouTube API key not configured. Go to Settings.');
      return;
    }

    setCheckingAll(true);
    let checkedCount = 0;

    try {
      for (let i = 0; i < youtubeScenes.length; i += 50) {
        if (cancelCheckRef.current) break;

        const batch = youtubeScenes.slice(i, i + 50);
        const ids = batch.map((s) => s.video_id || '').filter(Boolean);
        const statusMap = await youtubeService.fetchVideoPrivacyStatusBatch(ids, apiKey);

        for (const scene of batch) {
          if (cancelCheckRef.current) break;

          const privacy = statusMap[scene.video_id || ''];
          let newStatus: 'available' | 'unavailable' | 'private' = 'unavailable';
          if (privacy) {
            if (privacy === 'public') newStatus = 'available';
            else if (privacy === 'private') newStatus = 'private';
            else newStatus = 'unavailable';
          }

          const { error: updateErr } = await supabase
            .from('scenes')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', scene.id);
          if (updateErr) throw updateErr;

          checkedCount++;
          setCheckProgress({ current: checkedCount, total });
        }
      }

      await loadData();
      await loadExactStats();
      setCheckingAll(false);
    } catch (e: any) {
      setCheckingAll(false);
      setCheckError(e?.message || 'Failed to check videos');
    }
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
    await loadExactStats();
  };

  const handleDeleteScene = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scene?')) return;
    try {
      await sceneService.deleteScene(id);
      await loadData();
      await loadExactStats();
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
    await loadExactStats();
  };

  return (
    <div className="space-y-6">
      <PlatformHeader
        icon={<Film className="w-6 h-6" />}
        title="All Scenes"
        description="Your complete library across all platforms"
        primaryAction={{
          label: 'Add Scene',
          onClick: handleOpenAdd,
          icon: <Plus className="w-5 h-5" />,
        }}
        menuActions={[
          {
            label: checkingAll ? 'Checking…' : 'Check All Videos',
            onClick: handleCheckAllVideos,
            icon: checkingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />,
            disabled: checkingAll,
          },
        ]}
      />

      <StatsBar
        total={stats.total}
        available={stats.available}
        unavailable={stats.unavailable}
        extraLabel="Platforms"
        extraValue={stats.platforms}
        extraIcon={<Film className="w-5 h-5" />}
      />

      <AdvancedSearchBar
        query={query}
        onQueryChange={setQuery}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        activeChip={activeChip}
        onChipChange={setActiveChip}
        enablePlatformFilter
        filters={filters}
        onApplyFilters={setFilters}
        onClearAllFilters={() => setFilters(defaultAdvancedFilters)}
      />

      <CheckAllVideosModal
        open={checkModalOpen}
        checking={checkingAll}
        current={checkProgress.current}
        total={checkProgress.total}
        error={checkError}
        onCancel={handleCancelCheckAll}
        onClose={() => {
          if (checkingAll) return;
          setCheckModalOpen(false);
          setCheckError(null);
        }}
        onOpenSettings={() => navigate('/settings')}
      />

      {loading && <SceneGridSkeleton count={12} />}

      {!loading && error && (
        <div className="card p-6 text-[var(--status-unavailable)] border border-[rgba(239,68,68,0.25)]">
          {error}
        </div>
      )}

      {!loading && !error && filteredScenes.length === 0 && (
        <EmptyState
          icon={<Film className="w-7 h-7" />}
          title={scenes.length === 0 ? 'No scenes yet' : 'No results'}
          description={
            scenes.length === 0
              ? 'Start building your collection by adding your first scene.'
              : 'Try adjusting your search, filters, or sorting.'
          }
          actionLabel={scenes.length === 0 ? 'Add Scene' : undefined}
          onAction={scenes.length === 0 ? handleOpenAdd : undefined}
        />
      )}

      {!loading && !error && filteredScenes.length > 0 && (
        <div className="grid grid-cols-1 sm:[grid-template-columns:repeat(auto-fill,minmax(320px,1fr))] gap-6">
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
          onUpdate={async (scene, data) => {
            await sceneService.updateScene(scene.id, {
              ...data,
              updated_at: new Date().toISOString(),
            } as any);
            await loadData();
            await loadExactStats();
            setDetailScene((prev) => (prev && prev.id === scene.id ? { ...prev, ...data, updated_at: new Date().toISOString() } as any : prev));
          }}
        />
      )}
    </div>
  );
}
