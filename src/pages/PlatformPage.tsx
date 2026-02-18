import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Grid, Loader2, Monitor, PlaySquare, Plus, RefreshCw, Tv, Youtube } from 'lucide-react';
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
import { SceneGridSkeleton, PlaylistGridSkeleton } from '../components/Dashboard/Skeletons';
import { CheckAllVideosModal } from '../components/Dashboard/CheckAllVideosModal';
import { RefreshPlaylistModal } from '../components/Dashboard/RefreshPlaylistModal';
import { YouTubeImport } from '../components/Dashboard/YouTubeImport';
import { ThreeDotMenu } from '../components/ui/ThreeDotMenu';
import { useAuth } from '../contexts/AuthContext';
import { useDebounce } from '../hooks/useDebounce';
import { sceneService, sceneTagsService, tagService, youtubeService } from '../services';
import { Category, Platform, Scene, SceneFormData, Tag, YouTubePlaylist } from '../types';
import { supabase } from '../lib/supabase';

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
  const [filters, setFilters] = useState<AdvancedFilters>(defaultAdvancedFilters);

  const debouncedQuery = useDebounce(query, 300);

  const [showForm, setShowForm] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | undefined>(undefined);
  const [detailScene, setDetailScene] = useState<Scene | undefined>(undefined);

  const [selectedYouTubePlaylistId, setSelectedYouTubePlaylistId] = useState<string | null>(null);
  const [showYouTubeImport, setShowYouTubeImport] = useState(false);

  const [checkModalOpen, setCheckModalOpen] = useState(false);
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkProgress, setCheckProgress] = useState({ current: 0, total: 0 });
  const [checkError, setCheckError] = useState<string | null>(null);
  const cancelCheckRef = useRef(false);

  const [refreshModalOpen, setRefreshModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState('');
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [refreshResult, setRefreshResult] = useState<{
    newVideos: number;
    deletedVideos: number;
    deletedAction: 'marked' | 'removed';
    totalVideos: number;
  } | null>(null);
  const [refreshingPlaylistId, setRefreshingPlaylistId] = useState<string | null>(null);
  const cancelRefreshRef = useRef(false);

  const [youtubeStats, setYoutubeStats] = useState<{
    total: number;
    available: number;
    unavailable: number;
    playlists: number;
  } | null>(null);

  const [playlistEditOpen, setPlaylistEditOpen] = useState(false);
  const [playlistEditTarget, setPlaylistEditTarget] = useState<YouTubePlaylist | null>(null);
  const [playlistEditTitle, setPlaylistEditTitle] = useState('');
  const [playlistEditCategory, setPlaylistEditCategory] = useState<Category>('F/M');
  const [playlistEditSaving, setPlaylistEditSaving] = useState(false);

  const [playlistDeleteOpen, setPlaylistDeleteOpen] = useState(false);
  const [playlistDeleteTargets, setPlaylistDeleteTargets] = useState<YouTubePlaylist[]>([]);
  const [playlistDeleteWorking, setPlaylistDeleteWorking] = useState(false);

  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<string>>(new Set());
  const [selectionBarAnimateIn, setSelectionBarAnimateIn] = useState(false);

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

  const loadYouTubeStats = useCallback(async () => {
    if (!user?.id) return;
    if (!isYouTube) {
      setYoutubeStats(null);
      return;
    }

    const userId = user.id;

    try {
      const [{ count: totalCount, error: totalErr }, { count: availableCount, error: availErr }, { count: unavailableCount, error: unavailErr }, { count: playlistCount, error: playlistErr }] =
        await Promise.all([
          supabase
            .from('scenes')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('platform', 'YouTube'),
          supabase
            .from('scenes')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('platform', 'YouTube')
            .eq('status', 'available'),
          supabase
            .from('scenes')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('platform', 'YouTube')
            .in('status', ['unavailable', 'private']),
          supabase
            .from('youtube_playlists')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId),
        ]);

      if (totalErr) throw totalErr;
      if (availErr) throw availErr;
      if (unavailErr) throw unavailErr;
      if (playlistErr) throw playlistErr;

      setYoutubeStats({
        total: totalCount || 0,
        available: availableCount || 0,
        unavailable: unavailableCount || 0,
        playlists: playlistCount || 0,
      });
    } catch {
      setYoutubeStats(null);
    }
  }, [isYouTube, user?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    void loadYouTubeStats();
  }, [loadYouTubeStats]);

  useEffect(() => {
    setSelectedYouTubePlaylistId(null);
  }, [platform]);

  const platformScenes = useMemo(() => {
    if (!platformType) return [] as Scene[];
    return scenes.filter((s) => s.platform === platformType);
  }, [platformType, scenes]);

  const playlistsForCards = useMemo(() => {
    if (!isYouTube) return [] as Array<{ playlist_id: string; title: string; thumbnail?: string; video_count: number; hasMeta: boolean }>;

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
        hasMeta: true,
      })),
      ...Array.from(playlistIdSet)
        .filter((id) => !youtubePlaylists.some((p) => p.playlist_id === id))
        .map((id) => ({
          playlist_id: id,
          title: `Playlist: ${id}`,
          thumbnail: playlistFirstThumb[id] || '',
          video_count: playlistSceneCounts[id] || 0,
          imported_at: '',
          hasMeta: false,
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

    const list = platformScenes.filter((s) => s.playlist_id === selectedYouTubePlaylistId);
    return list.sort((a, b) => {
      const ap = typeof (a as any).playlist_position === 'number' ? (a as any).playlist_position : null;
      const bp = typeof (b as any).playlist_position === 'number' ? (b as any).playlist_position : null;
      if (ap === null && bp === null) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (ap === null) return 1;
      if (bp === null) return -1;
      if (ap !== bp) return ap - bp;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [isYouTube, platformScenes, selectedYouTubePlaylistId]);

  const filteredScenes = useMemo(() => {
    let filtered = [...filteredPlatformScenes];

    const isYouTubePlaylistView =
      isYouTube && !!selectedYouTubePlaylistId && selectedYouTubePlaylistId !== '__manual__';

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

    if (isYouTubePlaylistView) {
      filtered.sort((a, b) => {
        const ap = typeof (a as any).playlist_position === 'number' ? (a as any).playlist_position : null;
        const bp = typeof (b as any).playlist_position === 'number' ? (b as any).playlist_position : null;
        if (ap === null && bp === null) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        if (ap === null) return 1;
        if (bp === null) return -1;
        if (ap !== bp) return ap - bp;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else {
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
    }

    return filtered;
  }, [activeChip, debouncedQuery, filters.categories, filters.dateRange, filters.statuses, filteredPlatformScenes, isYouTube, selectedYouTubePlaylistId, sortBy]);

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

  const effectiveStats = useMemo(() => {
    if (!isYouTube || !youtubeStats) return stats;
    return {
      total: youtubeStats.total,
      available: youtubeStats.available,
      unavailable: youtubeStats.unavailable,
      extraValue: youtubeStats.playlists,
    };
  }, [isYouTube, stats, youtubeStats]);

  const openEditPlaylist = (playlistId: string) => {
    const meta = youtubePlaylists.find((x) => x.playlist_id === playlistId) || null;
    if (!meta) {
      alert('Playlist details are not available yet. Refresh/import the playlist first.');
      return;
    }
    setPlaylistEditTarget(meta);
    setPlaylistEditTitle(meta.title || '');
    setPlaylistEditCategory((meta.default_category as Category) || 'F/M');
    setPlaylistEditOpen(true);
  };

  const saveEditPlaylist = async () => {
    if (!user?.id) return;
    if (!playlistEditTarget) return;
    if (playlistEditSaving) return;

    const nextTitle = playlistEditTitle.trim();
    if (!nextTitle) {
      alert('Playlist name cannot be empty.');
      return;
    }

    setPlaylistEditSaving(true);
    try {
      const { error: upErr } = await supabase
        .from('youtube_playlists')
        .update({
          title: nextTitle,
          default_category: playlistEditCategory,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('playlist_id', playlistEditTarget.playlist_id);
      if (upErr) throw upErr;

      setPlaylistEditOpen(false);
      setPlaylistEditTarget(null);
      await loadData();
      await loadYouTubeStats();
    } catch (e: any) {
      alert(e?.message || 'Failed to update playlist');
    } finally {
      setPlaylistEditSaving(false);
    }
  };

  const openDeletePlaylists = (playlistIds: string[]) => {
    const metas = playlistIds
      .map((id) => youtubePlaylists.find((x) => x.playlist_id === id) || null)
      .filter((x): x is YouTubePlaylist => !!x);

    if (metas.length === 0) {
      alert('Playlist details are not available yet. Refresh/import the playlist first.');
      return;
    }

    setPlaylistDeleteTargets(metas);
    setPlaylistDeleteOpen(true);
  };

  const openDeletePlaylist = (playlistId: string) => {
    openDeletePlaylists([playlistId]);
  };

  const confirmDeletePlaylists = async (mode: 'keep_videos' | 'delete_all') => {
    if (!user?.id) return;
    if (playlistDeleteTargets.length === 0) return;
    if (playlistDeleteWorking) return;

    setPlaylistDeleteWorking(true);
    const playlistIds = playlistDeleteTargets.map((p) => p.playlist_id);
    const playlistNames = playlistDeleteTargets.map((p) => p.title).filter(Boolean);

    try {
      if (mode === 'delete_all') {
        const { error: sceneErr } = await supabase
          .from('scenes')
          .delete()
          .eq('user_id', user.id)
          .eq('platform', 'YouTube')
          .in('playlist_id', playlistIds);
        if (sceneErr) throw sceneErr;
      } else {
        const { error: sceneErr } = await supabase
          .from('scenes')
          .update({
            playlist_id: null,
            source_type: 'manual',
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('platform', 'YouTube')
          .in('playlist_id', playlistIds);
        if (sceneErr) throw sceneErr;
      }

      const { error: plErr } = await supabase
        .from('youtube_playlists')
        .delete()
        .eq('user_id', user.id)
        .in('playlist_id', playlistIds);
      if (plErr) throw plErr;

      setPlaylistDeleteOpen(false);
      setPlaylistDeleteTargets([]);
      setSelectedPlaylistIds(new Set());

      await loadData();
      await loadYouTubeStats();

      alert(
        mode === 'delete_all'
          ? `Deleted ${playlistIds.length} playlist(s) and all their videos.${playlistNames.length ? `\n${playlistNames.join('\n')}` : ''}`
          : `Deleted ${playlistIds.length} playlist(s). Videos were moved to Individual Videos.${playlistNames.length ? `\n${playlistNames.join('\n')}` : ''}`
      );
    } catch (e: any) {
      alert(e?.message || 'Failed to delete playlist');
    } finally {
      setPlaylistDeleteWorking(false);
    }
  };

  const togglePlaylistSelection = (playlistId: string, checked: boolean) => {
    setSelectedPlaylistIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(playlistId);
      else next.delete(playlistId);
      return next;
    });
  };

  useEffect(() => {
    if (selectedPlaylistIds.size === 0) {
      setSelectionBarAnimateIn(false);
      return;
    }

    const raf = requestAnimationFrame(() => setSelectionBarAnimateIn(true));
    return () => cancelAnimationFrame(raf);
  }, [selectedPlaylistIds.size]);

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

  const handleCancelCheckAll = () => {
    cancelCheckRef.current = true;
    setCheckingAll(false);
  };

  const handleCheckAllVideos = async () => {
    if (!user?.id) return;
    if (!isYouTube) return;

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
    let availableCount = 0;
    let unavailableCount = 0;

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
            if (privacy === 'public') {
              newStatus = 'available';
              availableCount++;
            } else if (privacy === 'private') {
              newStatus = 'private';
              unavailableCount++;
            } else {
              newStatus = 'unavailable';
              unavailableCount++;
            }
          } else {
            unavailableCount++;
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
      setCheckingAll(false);

      if (!cancelCheckRef.current) {
        alert(`Check complete!\n${availableCount} available\n${unavailableCount} unavailable`);
      }
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

  const selectedPlaylistMeta = useMemo(() => {
    if (!isYouTube || !selectedYouTubePlaylistId || selectedYouTubePlaylistId === '__manual__') return null;
    return youtubePlaylists.find((p) => p.playlist_id === selectedYouTubePlaylistId) || null;
  }, [isYouTube, selectedYouTubePlaylistId, youtubePlaylists]);

  const handleCancelRefresh = () => {
    cancelRefreshRef.current = true;
    setRefreshProgress('Canceling...');
  };

  const handleRefreshPlaylist = async (playlistId: string, playlistTitle?: string) => {
    if (!user?.id) return;
    if (!isYouTube) return;
    if (!playlistId || playlistId === '__manual__') return;
    if (refreshing) return;

    cancelRefreshRef.current = false;
    setRefreshError(null);
    setRefreshResult(null);
    setRefreshProgress('Fetching latest videos from YouTube...');
    setRefreshing(true);
    setRefreshingPlaylistId(playlistId);
    setRefreshModalOpen(true);

    try {
      const apiKey = localStorage.getItem('youtube_api_key') || '';
      if (!apiKey) throw new Error('YouTube API key not configured. Go to Settings.');

      const deletedPreference = (localStorage.getItem('youtube_deleted_playlist_videos') || 'mark') as
        | 'mark'
        | 'remove';
      const deletedActionLabel: 'marked' | 'removed' = deletedPreference === 'remove' ? 'removed' : 'marked';

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const authUser = authData.user;
      if (!authUser?.id) throw new Error('Not authenticated');

      const allYoutubeVideos: Array<{
        videoId: string;
        title: string;
        thumbnail?: string;
        channelTitle?: string;
        url: string;
        position: number | null;
      }> = [];

      let pageIndex = 0;
      let nextPageToken: string | null = null;
      do {
        if (cancelRefreshRef.current) break;

        pageIndex += 1;
        setRefreshProgress(`Fetching latest videos from YouTube... (page ${pageIndex}, ${allYoutubeVideos.length} found)`);

        const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('playlistId', playlistId);
        url.searchParams.set('maxResults', '50');
        url.searchParams.set('key', apiKey);
        if (nextPageToken) url.searchParams.set('pageToken', nextPageToken);

        const response = await fetch(url.toString());
        const data: any = await response.json().catch(() => ({}));
        if (data?.error) {
          throw new Error(`YouTube API Error: ${data.error.message || 'Unknown error'}`);
        }

        const items: any[] = Array.isArray(data?.items) ? data.items : [];
        const videos = items
          .filter((item) => item?.snippet?.resourceId?.videoId)
          .map((item) => {
            const vid = String(item.snippet.resourceId.videoId);
            const title = String(item?.snippet?.title || '').trim() || `Video: ${vid}`;
            const thumb =
              item?.snippet?.thumbnails?.medium?.url ||
              item?.snippet?.thumbnails?.default?.url ||
              '';
            const channelTitle = String(item?.snippet?.channelTitle || '').trim();
            const position = Number(item?.snippet?.position);
            return {
              videoId: vid,
              title,
              thumbnail: thumb,
              channelTitle,
              url: `https://www.youtube.com/watch?v=${vid}`,
              position: Number.isFinite(position) ? position : null,
            };
          });

        allYoutubeVideos.push(...videos);
        nextPageToken = data?.nextPageToken || null;
      } while (nextPageToken);

      if (cancelRefreshRef.current) {
        setRefreshProgress('Canceled.');
        return;
      }

      setRefreshProgress('Comparing playlist with your library...');

      const youtubeVideoIdSet = new Set(allYoutubeVideos.map((v) => v.videoId).filter(Boolean));
      const youtubeVideoPositionMap = new Map<string, number | null>();
      for (const v of allYoutubeVideos) {
        if (!v.videoId) continue;
        youtubeVideoPositionMap.set(v.videoId, v.position);
      }

      const { data: existingScenes, error: existingErr } = await supabase
        .from('scenes')
        .select('id, video_id, title, platform, category')
        .eq('user_id', authUser.id)
        .eq('platform', 'YouTube')
        .eq('playlist_id', playlistId)
        .not('video_id', 'is', null);
      if (existingErr) throw existingErr;

      const existingRows = (existingScenes || []) as any[];
      const existingVideoIds = new Set(existingRows.map((s: any) => String(s.video_id || '')).filter(Boolean));

      const deletedSceneIds = existingRows
        .filter((s: any) => {
          const vid = String(s?.video_id || '').trim();
          return !!vid && !youtubeVideoIdSet.has(vid);
        })
        .map((s: any) => String(s?.id || '').trim())
        .filter(Boolean);

      const newVideos = allYoutubeVideos.filter((v) => !existingVideoIds.has(v.videoId));

      setRefreshProgress('Syncing playlist order...');
      const positionUpdates = existingRows
        .map((s: any) => {
          const vid = String(s?.video_id || '').trim();
          if (!vid) return null;
          const pos = youtubeVideoPositionMap.get(vid);
          if (pos === undefined) return null;
          return {
            id: String(s?.id || '').trim(),
            user_id: authUser.id,
            playlist_position: typeof pos === 'number' && Number.isFinite(pos) ? pos : null,
            updated_at: new Date().toISOString(),
            title: s.title,
            platform: s.platform,
            category: s.category,
          };
        })
        .filter((x: any) => !!x && !!x.id);

      if (positionUpdates.length > 0) {
        const chunk = <T,>(arr: T[], size: number) => {
          const out: T[][] = [];
          for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
          return out;
        };

        const batches = chunk(positionUpdates, 200);
        for (const batch of batches) {
          const { error: upErr } = await supabase.from('scenes').upsert(batch as any, { onConflict: 'id' });
          if (upErr) {
            const msg = String((upErr as any)?.message || '').toLowerCase();
            const looksLikeColumnErr = msg.includes('column') || msg.includes('does not exist') || msg.includes('schema cache');
            if (!looksLikeColumnErr) throw upErr;
            const fallbackBatch = (batch as any[]).map(({ playlist_position, ...rest }) => rest);
            const { error: fallbackErr } = await supabase.from('scenes').upsert(fallbackBatch as any, { onConflict: 'id' });
            if (fallbackErr) throw fallbackErr;
          }
        }
      }

      let deletedCount = 0;

      if (deletedSceneIds.length > 0) {
        deletedCount = deletedSceneIds.length;
        setRefreshProgress(
          `${deletedPreference === 'remove' ? 'Removing' : 'Marking'} ${deletedSceneIds.length} deleted video${
            deletedSceneIds.length === 1 ? '' : 's'
          }...`
        );

        if (deletedPreference === 'remove') {
          const { error: deleteErr } = await supabase
            .from('scenes')
            .delete()
            .eq('user_id', authUser.id)
            .in('id', deletedSceneIds);
          if (deleteErr) throw deleteErr;
        } else {
          const checkedAt = new Date().toISOString();
          const { error: updateErr } = await supabase
            .from('scenes')
            .update({ status: 'unavailable', updated_at: checkedAt })
            .eq('user_id', authUser.id)
            .in('id', deletedSceneIds);
          if (updateErr) throw updateErr;
        }
      }

      setRefreshProgress(`Found ${newVideos.length} new video${newVideos.length === 1 ? '' : 's'}. Adding...`);

      if (newVideos.length > 0) {
        const scenesToInsert = newVideos.map((video) => ({
          user_id: authUser.id,
          playlist_id: playlistId,
          title: video.title,
          platform: 'YouTube' as const,
          category: 'F/M' as const,
          url: video.url,
          thumbnail: video.thumbnail || null,
          video_id: video.videoId,
          playlist_position: video.position,
          channel_name: video.channelTitle || null,
          status: 'available' as const,
          source_type: 'youtube_playlist' as const,
          updated_at: new Date().toISOString(),
        }));

        const { error: insertErr } = await supabase.from('scenes').insert(scenesToInsert as any).select();
        if (insertErr) {
          const msg = String((insertErr as any)?.message || '').toLowerCase();
          const looksLikeColumnErr = msg.includes('column') || msg.includes('does not exist') || msg.includes('schema cache');
          if (!looksLikeColumnErr) throw insertErr;

          const minimalScenes = newVideos.map((video) => ({
            user_id: authUser.id,
            playlist_id: playlistId,
            title: video.title,
            platform: 'YouTube' as const,
            category: 'F/M' as const,
            url: video.url,
            thumbnail: video.thumbnail || null,
            status: 'available' as const,
            updated_at: new Date().toISOString(),
          }));
          const { error: fallbackErr } = await supabase.from('scenes').insert(minimalScenes as any).select();
          if (fallbackErr) throw fallbackErr;
        }
      }

      const thumbForPlaylist =
        selectedPlaylistMeta?.thumbnail ||
        allYoutubeVideos.find((v) => !!v.thumbnail)?.thumbnail ||
        null;

      await youtubeService.createPlaylist({
        user_id: authUser.id,
        playlist_id: playlistId,
        title: playlistTitle || selectedPlaylistMeta?.title || `Playlist: ${playlistId}`,
        thumbnail: thumbForPlaylist || undefined,
        description: selectedPlaylistMeta?.description,
        video_count: allYoutubeVideos.length,
        last_checked: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setRefreshProgress('Done!');
      setRefreshResult({
        newVideos: newVideos.length,
        deletedVideos: deletedCount,
        deletedAction: deletedActionLabel,
        totalVideos: allYoutubeVideos.length,
      });

      await loadData();
    } catch (e: any) {
      setRefreshError(e?.message || 'Failed to refresh playlist');
    } finally {
      setRefreshing(false);
      setRefreshingPlaylistId(null);
    }
  };

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
        additionalActions={
          isYouTube
            ? [
                {
                  label: checkingAll ? 'Checking…' : 'Check All Videos',
                  onClick: handleCheckAllVideos,
                  icon: checkingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />,
                  disabled: checkingAll,
                },
              ]
            : undefined
        }
        secondaryAction={
          isYouTube && selectedYouTubePlaylistId && selectedYouTubePlaylistId !== '__manual__'
            ? {
                label: refreshing && refreshingPlaylistId === selectedYouTubePlaylistId ? 'Refreshing…' : 'Refresh Playlist',
                onClick: () => {
                  void handleRefreshPlaylist(selectedYouTubePlaylistId, selectedPlaylistMeta?.title);
                },
                icon: refreshing && refreshingPlaylistId === selectedYouTubePlaylistId ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5" />
                ),
              }
            : isYouTube
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
                icon: <ArrowLeft className="w-5 h-5" />,
              }
            : undefined
        }
      />

      {playlistEditOpen && playlistEditTarget && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => {
              if (playlistEditSaving) return;
              setPlaylistEditOpen(false);
              setPlaylistEditTarget(null);
            }}
            role="button"
            tabIndex={-1}
          />

          <div className="relative w-full max-w-lg rounded-[16px] border border-[var(--bg-tertiary)] bg-[var(--bg-secondary)] shadow-[0_20px_60px_rgba(0,0,0,0.55)] overflow-hidden">
            <div className="p-5 border-b border-[var(--bg-tertiary)] flex items-center justify-between">
              <div className="text-white font-semibold">Edit Playlist</div>
              <button
                type="button"
                className="p-2 rounded-[12px] text-[var(--text-secondary)] hover:text-white hover:bg-black/20 transition disabled:opacity-50"
                onClick={() => {
                  if (playlistEditSaving) return;
                  setPlaylistEditOpen(false);
                  setPlaylistEditTarget(null);
                }}
                aria-label="Close"
                disabled={playlistEditSaving}
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Playlist name</label>
                <input
                  value={playlistEditTitle}
                  onChange={(e) => setPlaylistEditTitle(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Default category</label>
                <select
                  value={playlistEditCategory}
                  onChange={(e) => setPlaylistEditCategory(e.target.value as Category)}
                  className="input w-full"
                >
                  <option value="F/M">F/M</option>
                  <option value="F/F">F/F</option>
                  <option value="M/F">M/F</option>
                  <option value="M/M">M/M</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-[12px] bg-[rgba(255,255,255,0.06)] text-white border border-[rgba(255,255,255,0.10)] hover:bg-black/20 transition disabled:opacity-50"
                  onClick={() => {
                    if (playlistEditSaving) return;
                    setPlaylistEditOpen(false);
                    setPlaylistEditTarget(null);
                  }}
                  disabled={playlistEditSaving}
                >
                  Cancel
                </button>
                <button type="button" className="btn-primary disabled:opacity-50" onClick={() => void saveEditPlaylist()} disabled={playlistEditSaving}>
                  {playlistEditSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {playlistDeleteOpen && playlistDeleteTargets.length > 0 && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => {
              if (playlistDeleteWorking) return;
              setPlaylistDeleteOpen(false);
              setPlaylistDeleteTargets([]);
            }}
            role="button"
            tabIndex={-1}
          />

          <div className="relative w-full max-w-lg rounded-[16px] border border-[var(--bg-tertiary)] bg-[var(--bg-secondary)] shadow-[0_20px_60px_rgba(0,0,0,0.55)] overflow-hidden">
            <div className="p-5 border-b border-[var(--bg-tertiary)] flex items-center justify-between">
              <div className="text-white font-semibold">Delete Playlist</div>
              <button
                type="button"
                className="p-2 rounded-[12px] text-[var(--text-secondary)] hover:text-white hover:bg-black/20 transition disabled:opacity-50"
                onClick={() => {
                  if (playlistDeleteWorking) return;
                  setPlaylistDeleteOpen(false);
                  setPlaylistDeleteTargets([]);
                }}
                aria-label="Close"
                disabled={playlistDeleteWorking}
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-sm text-[var(--text-secondary)] whitespace-pre-line">
                {playlistDeleteTargets.length === 1
                  ? `Delete ${playlistDeleteTargets[0].title}? Choose an option:`
                  : `Delete ${playlistDeleteTargets.length} playlists? Choose an option:`}
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  className="w-full px-4 py-3 rounded-[12px] bg-[rgba(255,255,255,0.06)] text-white border border-[rgba(255,255,255,0.10)] hover:bg-black/20 transition disabled:opacity-50 text-left"
                  onClick={() => void confirmDeletePlaylists('keep_videos')}
                  disabled={playlistDeleteWorking}
                >
                  Keep videos in Individual Videos
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-3 rounded-[12px] bg-[rgba(239,68,68,0.12)] text-[#ef4444] border border-[rgba(239,68,68,0.30)] hover:bg-[rgba(239,68,68,0.18)] transition disabled:opacity-50 text-left"
                  onClick={() => void confirmDeletePlaylists('delete_all')}
                  disabled={playlistDeleteWorking}
                >
                  Delete playlist AND all its videos
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-[12px] bg-[rgba(255,255,255,0.06)] text-white border border-[rgba(255,255,255,0.10)] hover:bg-black/20 transition disabled:opacity-50"
                  onClick={() => {
                    if (playlistDeleteWorking) return;
                    setPlaylistDeleteOpen(false);
                    setPlaylistDeleteTargets([]);
                  }}
                  disabled={playlistDeleteWorking}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <StatsBar
        total={effectiveStats.total}
        available={effectiveStats.available}
        unavailable={effectiveStats.unavailable}
        extraLabel={isYouTube ? 'Playlists' : 'Categories'}
        extraValue={effectiveStats.extraValue}
        extraIcon={platformIcon(platform)}
      />

      <AdvancedSearchBar
        query={query}
        onQueryChange={setQuery}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        activeChip={activeChip}
        onChipChange={setActiveChip}
        filters={filters}
        onApplyFilters={setFilters}
        onClearAllFilters={() => setFilters(defaultAdvancedFilters)}
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
          <div className="grid grid-cols-1 sm:[grid-template-columns:repeat(auto-fill,minmax(320px,1fr))] gap-6">
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
              <div
                key={p.playlist_id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedYouTubePlaylistId(p.playlist_id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedYouTubePlaylistId(p.playlist_id);
                  }
                }}
                className="card p-5 text-left hover:shadow-[0_18px_40px_rgba(0,0,0,0.55)] transition relative group cursor-pointer"
              >
                <div className="absolute top-3 left-3 z-10">
                  <input
                    type="checkbox"
                    checked={selectedPlaylistIds.has(p.playlist_id)}
                    disabled={!p.hasMeta}
                    onChange={(e) => togglePlaylistSelection(p.playlist_id, e.target.checked)}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                    className="w-5 h-5 accent-[#ef4444]"
                    aria-label="Select playlist"
                  />
                </div>

                <div className="absolute top-3 right-3">
                  <ThreeDotMenu
                    buttonAriaLabel="Playlist menu"
                    items={[
                      {
                        label: '🔄 Refresh Playlist',
                        onClick: () => {
                          if (refreshing) return;
                          void handleRefreshPlaylist(p.playlist_id, p.title);
                        },
                        disabled: refreshing,
                      },
                      {
                        label: 'ℹ️ View Details',
                        onClick: () => {
                          const meta = youtubePlaylists.find((x) => x.playlist_id === p.playlist_id) || null;
                          const lastChecked = meta?.last_checked ? new Date(meta.last_checked).toLocaleString() : 'Never';
                          const category = meta?.default_category || 'Not set';
                          alert(
                            [
                              `Playlist name: ${p.title}`,
                              `Video count: ${p.video_count}`,
                              `Last checked: ${lastChecked}`,
                              `Category: ${category}`,
                              `YouTube playlist ID: ${p.playlist_id}`,
                            ].join('\n')
                          );
                        },
                      },
                      {
                        label: '✏️ Edit Playlist',
                        onClick: () => openEditPlaylist(p.playlist_id),
                      },
                      { type: 'divider' },
                      {
                        label: '🗑️ Delete Playlist',
                        onClick: () => openDeletePlaylist(p.playlist_id),
                        danger: true,
                      },
                    ]}
                  />
                </div>

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
              </div>
            ))}
          </div>

          {selectedPlaylistIds.size > 0 && (
            <div
              className="fixed left-0 right-0 bottom-0 z-[1100] px-4 pb-4 transition-all duration-200"
              style={{
                transform: selectionBarAnimateIn ? 'translateY(0px)' : 'translateY(24px)',
                opacity: selectionBarAnimateIn ? 1 : 0,
              }}
            >
              <div className="max-w-6xl mx-auto rounded-[16px] border border-[rgba(239,68,68,0.35)] bg-[#111122] shadow-[0_18px_40px_rgba(0,0,0,0.65)] overflow-hidden">
                <div className="h-1" style={{ background: '#ef4444' }} />
                <div className="p-4 flex items-center justify-between gap-3">
                  <div className="text-white font-semibold">{selectedPlaylistIds.size} playlists selected</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-[12px] bg-[rgba(239,68,68,0.14)] text-[#ef4444] border border-[rgba(239,68,68,0.35)] hover:bg-[rgba(239,68,68,0.20)] transition"
                      onClick={() => {
                        const ids = Array.from(selectedPlaylistIds);
                        openDeletePlaylists(ids);
                      }}
                    >
                      Delete Selected
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 rounded-[12px] bg-[rgba(255,255,255,0.06)] text-white border border-[rgba(255,255,255,0.10)] hover:bg-black/20 transition"
                      onClick={() => setSelectedPlaylistIds(new Set())}
                    >
                      Cancel Selection
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
          onUpdate={async (scene, data) => {
            await sceneService.updateScene(scene.id, {
              ...data,
              updated_at: new Date().toISOString(),
            } as any);
            await loadData();
            setDetailScene((prev) => (prev && prev.id === scene.id ? { ...prev, ...data, updated_at: new Date().toISOString() } as any : prev));
          }}
        />
      )}

      {showYouTubeImport && (
        <YouTubeImport
          onImport={handleYouTubeImport}
          onCancel={() => setShowYouTubeImport(false)}
          onOpenSettings={() => navigate('/settings')}
        />
      )}

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

      <RefreshPlaylistModal
        open={refreshModalOpen}
        refreshing={refreshing}
        progress={refreshProgress}
        error={refreshError}
        result={refreshResult}
        onCancel={handleCancelRefresh}
        onClose={() => {
          if (refreshing) return;
          setRefreshModalOpen(false);
          setRefreshError(null);
          setRefreshResult(null);
          setRefreshProgress('');
        }}
        onOpenSettings={() => navigate('/settings')}
      />
    </div>
  );
}
