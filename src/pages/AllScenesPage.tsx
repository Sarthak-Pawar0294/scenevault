import { useCallback, useEffect, useMemo, useState } from 'react';
import { Film, Plus } from 'lucide-react';
import { PlatformHeader } from '../components/platform/PlatformHeader';
import { StatsBar } from '../components/platform/StatsBar';
import { AdvancedSearchBar, AdvancedSortOption, FilterChipId } from '../components/platform/AdvancedSearchBar';
import { EmptyState } from '../components/platform/EmptyState';
import { SceneCard } from '../components/Dashboard/SceneCard';
import { SceneForm } from '../components/Dashboard/SceneForm';
import { SceneDetailModal } from '../components/Dashboard/SceneDetailModal';
import { SceneGridSkeleton } from '../components/Dashboard/Skeletons';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { sceneService, sceneTagsService, tagService, youtubeService } from '../services';
import { Scene, SceneFormData, Tag } from '../types';

export function AllScenesPage() {
  const { user } = useAuth();

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<AdvancedSortOption>('newest');
  const [activeChip, setActiveChip] = useState<FilterChipId>('all');

  const debouncedQuery = useDebounce(query, 300);

  const [showForm, setShowForm] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | undefined>(undefined);
  const [detailScene, setDetailScene] = useState<Scene | undefined>(undefined);

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

  const stats = useMemo(() => {
    const available = scenes.filter((s) => s.status === 'available').length;
    const unavailable = scenes.filter((s) => s.status === 'unavailable' || s.status === 'private').length;
    const platforms = new Set(scenes.map((s) => s.platform)).size;
    return {
      total: scenes.length,
      available,
      unavailable,
      platforms,
    };
  }, [scenes]);

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
  }, [activeChip, debouncedQuery, scenes, sortBy]);

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
        onOpenFilters={() => {}}
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
    </div>
  );
}
