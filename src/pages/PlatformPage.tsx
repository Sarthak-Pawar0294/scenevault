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
  }, [activeChip, debouncedQuery, filters.categories, filters.dateRange, filters.statuses, filteredPlatformScenes, sortBy]);

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
            return {
              videoId: vid,
              title,
              thumbnail: thumb,
              channelTitle,
              url: `https://www.youtube.com/watch?v=${vid}`,
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

      const { data: existingScenes, error: existingErr } = await supabase
        .from('scenes')
        .select('id, video_id')
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
              <button
                key={p.playlist_id}
                type="button"
                onClick={() => {
                  setSelectedYouTubePlaylistId(p.playlist_id);
                }}
                className="card p-5 text-left hover:shadow-[0_18px_40px_rgba(0,0,0,0.55)] transition relative group"
              >
                {p.hasMeta && (
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div
                      role="button"
                      tabIndex={-1}
                      aria-label="Refresh playlist"
                      title="Refresh Playlist"
                      className="w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/80 border border-white/10"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (refreshing) return;
                        void handleRefreshPlaylist(p.playlist_id, p.title);
                      }}
                    >
                      {refreshing && refreshingPlaylistId === p.playlist_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                )}

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
