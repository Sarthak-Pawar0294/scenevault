import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Scene, SceneFormData, Stats, Platform, Category, Status, YouTubePlaylist, Tag } from '../../types';
import { StatsPanel } from './StatsPanel';
import { FilterBar } from './FilterBar';
import { SceneCard } from './SceneCard';
import { SceneForm } from './SceneForm';
import { YouTubeImport } from './YouTubeImport';
import { SettingsModal } from './SettingsModal';
import { SceneDetailModal } from './SceneDetailModal';
import { Plus, Youtube, CheckCircle, Loader2 } from 'lucide-react';
import { BulkActionBar } from './BulkActionBar';
import { BulkCategoryModal } from './BulkCategoryModal';
import { ExportModal } from './ExportModal';
import { ImportModal } from './ImportModal';
import { downloadJSON, downloadCSV, downloadHTML, generateFilename } from '../../utils/exportUtils';
import { Sidebar, SidebarSection } from './Sidebar';
import { SceneGridSkeleton } from './Skeletons';
import { sceneService, youtubeService, tagService, sceneTagsService } from '../../services';
import { useDebounce } from '../../hooks/useDebounce';
import { CommandPalette } from './CommandPalette';
import { AdvancedSearch, AdvancedSortOption } from './AdvancedSearch';
import { Tv, PlaySquare, Monitor, Grid } from 'lucide-react';
import { TagManagementPage } from './TagManagementPage';
import { BulkTagsModal } from './BulkTagsModal';

type SortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc';

const STORAGE_KEY = 'sceneVault_filterState';

interface FilterState {
  searchQuery: string;
  selectedPlatform: Platform | 'all';
  selectedCategory: Category | 'all';
  selectedStatus: Status | 'all';
  selectedTagIds: string[];
  tagMatchMode: 'and' | 'or';
  sortBy: SortOption;
}

const defaultFilterState: FilterState = {
  searchQuery: '',
  selectedPlatform: 'all',
  selectedCategory: 'all',
  selectedStatus: 'all',
  selectedTagIds: [],
  tagMatchMode: 'and',
  sortBy: 'newest',
};

export function Dashboard() {
  const { user } = useAuth();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [filteredScenes, setFilteredScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showYouTubeImport, setShowYouTubeImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | undefined>();
  const [filterState, setFilterState] = useState<FilterState>(defaultFilterState);
  const [checkingProgress, setCheckingProgress] = useState<{ current: number; total: number } | null>(null);
  const [detailScene, setDetailScene] = useState<Scene | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBulkTagsModal, setShowBulkTagsModal] = useState(false);
  const [defaultPlatformForNewScene, setDefaultPlatformForNewScene] = useState<Platform | undefined>(undefined);
  const [youtubePlaylists, setYoutubePlaylists] = useState<YouTubePlaylist[]>([]);
  const [selectedYouTubePlaylistId, setSelectedYouTubePlaylistId] = useState<string | null>(null);
  const [youtubePlaylistSearch, setYoutubePlaylistSearch] = useState('');
  const [youtubePlaylistCategory, setYoutubePlaylistCategory] = useState<Category | 'all'>('all');
  const [exportContextScenes, setExportContextScenes] = useState<Scene[] | null>(null);
  const [activeSection, setActiveSection] = useState<SidebarSection>('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const debouncedSearchQuery = useDebounce(filterState.searchQuery, 300);

  const [platformQuery, setPlatformQuery] = useState('');
  const [platformCategories, setPlatformCategories] = useState<Category[]>([]);
  const [platformStatuses, setPlatformStatuses] = useState<Array<'available' | 'unavailable'>>([]);
  const [platformSortBy, setPlatformSortBy] = useState<AdvancedSortOption>('newest');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsedState = JSON.parse(saved);
        const migrated = { ...defaultFilterState, ...parsedState };
        if ((migrated as any).sortBy === 'channel-asc') {
          migrated.sortBy = 'newest';
        }
        setFilterState(migrated);
      } catch (error) {
        console.error('Error loading filter state:', error);
      }
    }

    localStorage.getItem('sceneVault_lastBackup');
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filterState));
  }, [filterState]);

  useEffect(() => {
    if (user) {
      loadScenes();
      loadYouTubePlaylists();
      loadTags();
    }
  }, [user]);

  const loadTags = async () => {
    if (!user) return;
    try {
      const data = await tagService.fetchTags(user.id);
      setAllTags(data);
    } catch (error) {
      console.error('Error loading tags:', error);
      setAllTags([]);
    }
  };

  const handleCreateTag = async (name: string): Promise<Tag> => {
    if (!user) throw new Error('Not authenticated');
    const created = await tagService.createTag({
      user_id: user.id,
      name,
      color: null,
    });
    setAllTags((prev) => {
      const next = [...prev, created];
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });
    return created;
  };

  useEffect(() => {
    if (debouncedSearchQuery !== filterState.searchQuery) return;
    filterAndSortScenes();
  }, [debouncedSearchQuery, filterState.selectedPlatform, filterState.selectedCategory, filterState.selectedStatus, filterState.sortBy, scenes]);

  useEffect(() => {
    if (activeSection === 'all') {
      updateFilterState({ selectedPlatform: 'all' });
      setSelectedYouTubePlaylistId(null);
      return;
    }

    if (activeSection === 'profile') {
      setSelectedYouTubePlaylistId(null);
      return;
    }

    if (activeSection === 'tags') {
      setSelectedYouTubePlaylistId(null);
      return;
    }

    if (activeSection === 'YouTube') {
      setSelectedYouTubePlaylistId(null);
      return;
    }
  }, [activeSection]);

  useEffect(() => {
    if (activeSection === 'all' || activeSection === 'YouTube' || activeSection === 'profile') return;
    setPlatformQuery('');
    setPlatformCategories([]);
    setPlatformStatuses([]);
    setPlatformSortBy('newest');
  }, [activeSection]);

  const getPlatformBrand = (platform: Platform) => {
    switch (platform) {
      case 'Zee5':
        return { label: 'Zee5 Collection', colorClass: 'text-purple-300', icon: <PlaySquare className="w-6 h-6" /> };
      case 'JioHotstar':
        return { label: 'JioHotstar Collection', colorClass: 'text-cyan-300', icon: <Tv className="w-6 h-6" /> };
      case 'SonyLIV':
        return { label: 'SonyLIV Collection', colorClass: 'text-blue-300', icon: <Monitor className="w-6 h-6" /> };
      case 'Other':
      default:
        return { label: `${platform} Collection`, colorClass: 'text-zinc-300', icon: <Grid className="w-6 h-6" /> };
    }
  };

  const formatDateShort = (iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const loadScenes = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await sceneService.fetchAllScenes(user.id);
      setScenes(data);
    } catch (error) {
      console.error('Error loading scenes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadYouTubePlaylists = async () => {
    if (!user) return;
    try {
      const data = await youtubeService.fetchPlaylists(user.id);
      setYoutubePlaylists(data);
    } catch (error) {
      console.error('Error loading YouTube playlists:', error);
      setYoutubePlaylists([]);
    }
  };

  const filterAndSortScenes = () => {
    let filtered = [...scenes];

    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter((scene) =>
        scene.title.toLowerCase().includes(query) ||
        scene.channel_name?.toLowerCase().includes(query) ||
        scene.notes?.toLowerCase().includes(query) ||
        scene.timestamp?.toLowerCase().includes(query)
      );
    }

    if (filterState.selectedPlatform !== 'all') {
      filtered = filtered.filter((scene) => scene.platform === filterState.selectedPlatform);
    }

    if (filterState.selectedCategory !== 'all') {
      filtered = filtered.filter((scene) => scene.category === filterState.selectedCategory);
    }

    if (filterState.selectedStatus !== 'all') {
      filtered = filtered.filter((scene) => scene.status === filterState.selectedStatus);
    }

    if (filterState.selectedTagIds.length > 0) {
      const wanted = new Set(filterState.selectedTagIds);
      filtered = filtered.filter((scene) => {
        const ids = new Set((scene.tags || []).map((t) => t.id));
        if (filterState.tagMatchMode === 'and') {
          for (const id of wanted) {
            if (!ids.has(id)) return false;
          }
          return true;
        }
        for (const id of wanted) {
          if (ids.has(id)) return true;
        }
        return false;
      });
    }

    filtered.sort((a, b) => {
      switch (filterState.sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    setFilteredScenes(filtered);
  };

  const isPlatformPage = activeSection !== 'all' && activeSection !== 'profile' && activeSection !== 'YouTube';
  const platformPageScenes = isPlatformPage
    ? scenes.filter((s) => s.platform === (activeSection as Platform))
    : [];

  const filteredPlatformScenes = (() => {
    if (!isPlatformPage) return [];
    let list = [...platformPageScenes];

    const q = platformQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((s) =>
        s.title.toLowerCase().includes(q) ||
        s.channel_name?.toLowerCase().includes(q) ||
        s.notes?.toLowerCase().includes(q)
      );
    }

    if (platformCategories.length > 0) {
      list = list.filter((s) => platformCategories.includes(s.category));
    }

    if (platformStatuses.length > 0) {
      list = list.filter((s) => {
        if (platformStatuses.includes('available') && s.status === 'available') return true;
        if (platformStatuses.includes('unavailable') && s.status !== 'available') return true;
        return false;
      });
    }

    list.sort((a, b) => {
      switch (platformSortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return list;
  })();

  const updateFilterState = (updates: Partial<FilterState>) => {
    setFilterState((prev) => ({ ...prev, ...updates }));
  };

  const clearAllFilters = () => {
    setFilterState(defaultFilterState);
  };

  const getActiveFilters = () => {
    const active: { type: any; value: string }[] = [];
    if (debouncedSearchQuery) active.push({ type: 'search', value: debouncedSearchQuery });
    if (filterState.selectedPlatform !== 'all') active.push({ type: 'platform', value: filterState.selectedPlatform });
    if (filterState.selectedCategory !== 'all') active.push({ type: 'category', value: filterState.selectedCategory });
    if (filterState.selectedStatus !== 'all') active.push({ type: 'status', value: filterState.selectedStatus });
    return active;
  };

  const handleApplyBulkTags = async (mode: 'add' | 'remove' | 'replace', tagIds: string[]) => {
    const sceneIds = Array.from(selectedIds);
    if (sceneIds.length === 0) return;

    try {
      if (mode === 'add') {
        await sceneTagsService.addTagsToScenes(sceneIds, tagIds);
      } else if (mode === 'remove') {
        await sceneTagsService.removeTagsFromScenes(sceneIds, tagIds);
      } else {
        await sceneTagsService.replaceTagsOnScenes(sceneIds, tagIds);
      }

      await loadScenes();
      handleClearSelection();
    } catch (error) {
      console.error('Bulk tag update failed:', error);
      alert('Failed to update tags for selected scenes');
    }
  };

  const handleSelectScene = (id: string, shiftKey: boolean) => {
    const selectionList = isPlatformPage ? filteredPlatformScenes : filteredScenes;
    if (shiftKey && lastSelectedId) {
      const lastIndex = selectionList.findIndex((s) => s.id === lastSelectedId);
      const currentIndex = selectionList.findIndex((s) => s.id === id);
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const newSelected = new Set(selectedIds);
        for (let i = start; i <= end; i++) {
          newSelected.add(selectionList[i].id);
        }
        setSelectedIds(newSelected);
      }
    } else {
      const newSelected = new Set(selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setSelectedIds(newSelected);
    }
    setLastSelectedId(id);
  };

  const handleSelectAll = () => {
    const selectionList = isPlatformPage ? filteredPlatformScenes : filteredScenes;
    if (selectedIds.size === selectionList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectionList.map((s) => s.id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} scene(s)? This action cannot be undone.`)) return;

    try {
      for (const id of selectedIds) {
        await supabase.from('scenes').delete().eq('id', id);
      }
      await loadScenes();
      handleClearSelection();
    } catch (error) {
      console.error('Error deleting scenes:', error);
      alert('Failed to delete some scenes');
    }
  };

  const handleBulkCategoryChange = async (category: Category) => {
    if (selectedIds.size === 0) return;

    try {
      for (const id of selectedIds) {
        await supabase
          .from('scenes')
          .update({ category, updated_at: new Date().toISOString() })
          .eq('id', id);
      }
      await loadScenes();
      handleClearSelection();
    } catch (error) {
      console.error('Error updating categories:', error);
      alert('Failed to update some scenes');
    }
  };

  const handleBulkStatusChange = async () => {
    if (selectedIds.size === 0) return;

    try {
      for (const id of selectedIds) {
        await supabase
          .from('scenes')
          .update({ status: 'unavailable', updated_at: new Date().toISOString() })
          .eq('id', id);
      }
      await loadScenes();
      handleClearSelection();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update some scenes');
    }
  };

  const handleBulkExport = () => {
    if (selectedIds.size === 0) return;

    const selectedScenes = scenes.filter((s) => selectedIds.has(s.id));
    const dataStr = JSON.stringify(selectedScenes, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `scenevault-export-selected-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleExportScenes = (scenesToExport: Scene[], format: 'json' | 'csv' | 'html') => {
    const filename = generateFilename(format);

    switch (format) {
      case 'json':
        downloadJSON(scenesToExport, filename);
        break;
      case 'csv':
        downloadCSV(scenesToExport, filename);
        break;
      case 'html':
        downloadHTML(scenesToExport, filename);
        break;
    }

    localStorage.setItem('sceneVault_lastBackup', Date.now().toString());
  };

  const handleImport = async (importedScenes: Scene[], mode: 'merge' | 'replace') => {
    try {
      if (mode === 'replace') {
        const allIds = scenes.map((s) => s.id);
        for (const id of allIds) {
          await supabase.from('scenes').delete().eq('id', id);
        }
      }

      for (const scene of importedScenes) {
        const { id, ...sceneData } = scene;
        await supabase.from('scenes').insert([
          {
            ...sceneData,
            user_id: user!.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
      }

      await loadScenes();
      alert(`Successfully imported ${importedScenes.length} scene${importedScenes.length !== 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error importing scenes:', error);
      alert('Failed to import scenes. Please try again.');
    }
  };

  const calculateStats = (): Stats => {
    const stats: Stats = {
      total: scenes.length,
      available: 0,
      unavailable: 0,
      byPlatform: {
        YouTube: 0,
        JioHotstar: 0,
        Zee5: 0,
        SonyLIV: 0,
        Other: 0,
      },
      byCategory: {
        'F/M': 0,
        'F/F': 0,
        'M/F': 0,
        'M/M': 0,
      },
    };

    scenes.forEach((scene) => {
      if (scene.status === 'available') stats.available++;
      if (scene.status === 'unavailable' || scene.status === 'private') stats.unavailable++;
      stats.byPlatform[scene.platform]++;
      stats.byCategory[scene.category]++;
    });

    return stats;
  };

  const handleAddScene = async (data: SceneFormData) => {
    try {
      const created = await sceneService.createScene({
        ...data,
        user_id: user!.id,
        source_type: 'manual',
      });

      if (data.tagIds) {
        await sceneTagsService.replaceTagsForScene(created.id, data.tagIds);
      }
      await loadScenes();
    } catch (error) {
      console.error('Error adding scene:', error);
      throw error;
    }
  };

  const handleUpdateScene = async (data: SceneFormData) => {
    if (!editingScene) return;

    try {
      await sceneService.updateScene(editingScene.id, {
        ...data,
        updated_at: new Date().toISOString(),
      });

      if (data.tagIds) {
        await sceneTagsService.replaceTagsForScene(editingScene.id, data.tagIds);
      }
      await loadScenes();
    } catch (error) {
      console.error('Error updating scene:', error);
      throw error;
    }
  };

  const handleDeleteScene = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scene?')) return;
    try {
      await sceneService.deleteScene(id);
      setScenes((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Error deleting scene:', error);
      alert('Error deleting scene. Please try again.');
    }
  };

  const handleEdit = (scene: Scene) => {
    setEditingScene(scene);
    setDefaultPlatformForNewScene(undefined);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingScene(undefined);
    setDefaultPlatformForNewScene(undefined);
  };

  const handleYouTubeImport = async (playlistUrl: string, category: Category): Promise<{ playlistTitle: string; addedCount: number }> => {
    console.log('[YouTube Import] Playlist URL received:', playlistUrl);

    const playlistId = extractPlaylistId(playlistUrl);
    console.log('[YouTube Import] Parsed playlistId:', playlistId);
    if (!playlistId) {
      throw new Error('Invalid playlist URL');
    }

    const apiKey = localStorage.getItem('youtube_api_key');
    console.log('[YouTube Import] API key exists:', !!apiKey);

    if (!apiKey) {
      throw new Error('Please add YouTube API key in Settings');
    }

    try {
      const parseYouTubeError = async (res: Response) => {
        const raw = await res.text().catch(() => '');
        console.log('[YouTube Import] YouTube error body (raw):', raw);
        const parsed = (() => {
          try {
            return JSON.parse(raw || '{}');
          } catch {
            return {};
          }
        })() as any;
        const message = parsed?.error?.message || `YouTube API request failed (${res.status})`;
        return { message, parsed };
      };

      const playlistInfoUrl = new URL('https://www.googleapis.com/youtube/v3/playlists');
      playlistInfoUrl.searchParams.set('part', 'snippet');
      playlistInfoUrl.searchParams.set('id', playlistId);
      playlistInfoUrl.searchParams.set('key', apiKey);

      console.log('[YouTube Import] Fetch playlist info request:', {
        url: playlistInfoUrl.toString().replace(apiKey, '***REDACTED***'),
      });

      let playlistMeta: any = null;
      let playlistTitleFromApi: string | null = null;
      let playlistDescriptionFromApi: string | null = null;
      let playlistThumbnailFromApi: string | null = null;

      const playlistInfoRes = await fetch(playlistInfoUrl.toString());
      console.log('[YouTube Import] Playlist info response:', {
        ok: playlistInfoRes.ok,
        status: playlistInfoRes.status,
        statusText: playlistInfoRes.statusText,
      });

      if (!playlistInfoRes.ok) {
        const { message } = await parseYouTubeError(playlistInfoRes);
        const lower = String(message || '').toLowerCase();
        if (playlistInfoRes.status === 403 && lower.includes('quota')) {
          throw new Error('YouTube API quota exceeded. Please try again tomorrow.');
        }
        if (playlistInfoRes.status === 403) {
          throw new Error('Invalid YouTube API key. Please check your API key in Settings.');
        }
        if (playlistInfoRes.status === 404) {
          throw new Error("Playlist is private or doesn't exist");
        }
        throw new Error(message || 'Failed to fetch playlist info');
      }

      playlistMeta = await playlistInfoRes.json().catch(() => ({}));
      console.log('[YouTube Import] Playlist info JSON:', playlistMeta);
      const playlistItem = playlistMeta?.items?.[0];
      if (playlistItem?.snippet) {
        playlistTitleFromApi = String(playlistItem.snippet.title || '').trim() || null;
        playlistDescriptionFromApi = String(playlistItem.snippet.description || '').trim() || null;
        playlistThumbnailFromApi =
          playlistItem.snippet.thumbnails?.medium?.url ||
          playlistItem.snippet.thumbnails?.default?.url ||
          playlistItem.snippet.thumbnails?.high?.url ||
          null;
      }

      console.log('[YouTube Import] Parsed playlist info:', {
        title: playlistTitleFromApi,
        hasDescription: !!playlistDescriptionFromApi,
        hasThumbnail: !!playlistThumbnailFromApi,
      });

      const allItems: any[] = [];
      let pageToken: string | null = null;
      let hasMore = true;

      const existingVideoIds = new Set(
        scenes
          .filter((s) => s.platform === 'YouTube' && s.playlist_id === playlistId && !!s.video_id)
          .map((s) => s.video_id as string)
      );
      console.log('[YouTube Import] Existing video IDs in this playlist:', existingVideoIds.size);

      while (hasMore) {
        console.log('[YouTube Import] Fetch playlistItems page:', { playlistId, pageToken });
        const playlistItemsUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
        playlistItemsUrl.searchParams.set('part', 'snippet');
        playlistItemsUrl.searchParams.set('playlistId', playlistId);
        playlistItemsUrl.searchParams.set('maxResults', '50');
        playlistItemsUrl.searchParams.set('key', apiKey);
        if (pageToken) {
          playlistItemsUrl.searchParams.set('pageToken', pageToken);
        }

        console.log('[YouTube Import] Fetch playlistItems request:', {
          url: playlistItemsUrl.toString().replace(apiKey, '***REDACTED***'),
        });

        const response = await fetch(playlistItemsUrl.toString());
        console.log('[YouTube Import] PlaylistItems response:', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
        });

        if (!response.ok) {
          const { message } = await parseYouTubeError(response);
          const lower = String(message || '').toLowerCase();
          if (response.status === 403 && lower.includes('quota')) {
            throw new Error('YouTube API quota exceeded. Please try again tomorrow.');
          }
          if (response.status === 403) {
            throw new Error('Invalid YouTube API key. Please check your API key in Settings.');
          }
          if (response.status === 404) {
            throw new Error("Playlist is private or doesn't exist");
          }
          throw new Error(message || 'Failed to fetch playlist');
        }

        const data: any = await response.json().catch(() => ({}));
        console.log('[YouTube Import] PlaylistItems page JSON:', data);
        const rawItems = data.items || [];
        const items = rawItems.map((item: any) => {
          const snippet = item?.snippet || {};
          const videoId = snippet?.resourceId?.videoId || '';
          return {
            title: snippet?.title || 'Untitled',
            videoId,
            thumbnail: snippet?.thumbnails?.medium?.url || snippet?.thumbnails?.default?.url || '',
            channelName: snippet?.channelTitle || 'Unknown Channel',
            uploadDate: snippet?.publishedAt || new Date().toISOString(),
            url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
          };
        });

        if (items.length === 0 && allItems.length === 0) {
          throw new Error('No videos found in this playlist.');
        }

        allItems.push(...items);
        pageToken = data.nextPageToken || null;
        hasMore = pageToken !== null;
        console.log('[YouTube Import] Accumulated items:', { count: allItems.length, hasMore, nextPageToken: pageToken });

        if (allItems.length > 500) {
          throw new Error('Playlist is too large (500+ videos). Please select a smaller playlist.');
        }
      }

      if (allItems.length === 0) {
        throw new Error('No videos found in this playlist.');
      }

      const scenesToInsert = allItems
        .filter((item: any) => item.videoId && !existingVideoIds.has(item.videoId))
        .map((item: any) => ({
          user_id: user!.id,
          title: item.title,
          platform: 'YouTube' as Platform,
          category,
          url: item.url,
          video_id: item.videoId,
          thumbnail: item.thumbnail,
          channel_name: item.channelName,
          upload_date: new Date(item.uploadDate).toISOString(),
          status: 'available' as Status,
          source_type: 'youtube_playlist',
          playlist_id: playlistId,
        }));

      console.log('[YouTube Import] Scenes to insert:', { count: scenesToInsert.length });

      if (scenesToInsert.length > 0) {
        console.log('[YouTube Import] Inserting scenes into Supabase:', { table: 'scenes' });
        const { error } = await supabase.from('scenes').insert(scenesToInsert);
        if (error) throw error;
        console.log('[YouTube Import] Scenes insert complete');
      }

      const existingPlaylist = youtubePlaylists.find((p) => p.playlist_id === playlistId);
      const thumbnail =
        (playlistThumbnailFromApi as string) ||
        (scenesToInsert[0]?.thumbnail as string) ||
        (existingPlaylist?.thumbnail as string) ||
        '';

      const upsertPayload: any = {
        user_id: user!.id,
        playlist_id: playlistId,
        title: playlistTitleFromApi || existingPlaylist?.title || `Playlist: ${playlistId}`,
        description: playlistDescriptionFromApi || existingPlaylist?.description || '',
        thumbnail,
        video_count: allItems.length,
        updated_at: new Date().toISOString(),
      };
      if (!existingPlaylist) {
        upsertPayload.imported_at = new Date().toISOString();
      }

      console.log('[YouTube Import] Upserting playlist into Supabase:', {
        table: 'youtube_playlists',
        playlist_id: upsertPayload.playlist_id,
        title: upsertPayload.title,
        video_count: upsertPayload.video_count,
      });

      const { error: playlistError } = await supabase
        .from('youtube_playlists')
        .upsert(upsertPayload, { onConflict: 'user_id,playlist_id' });
      if (playlistError) throw playlistError;

      console.log('[YouTube Import] Playlist upsert complete');

      await loadScenes();
      await loadYouTubePlaylists();

      console.log('[YouTube Import] Import complete:', {
        playlistId,
        playlistTitle: upsertPayload.title,
        addedCount: scenesToInsert.length,
        totalVideosFetched: allItems.length,
      });
      return {
        playlistTitle: upsertPayload.title,
        addedCount: scenesToInsert.length,
      };
    } catch (error) {
      console.error('[YouTube Import] Error importing playlist (full details):', error);
      if (error instanceof Error && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
        throw new Error('Check your internet connection');
      }
      throw error;
    }
  };

  const handleOpenPlaylistOnYouTube = (playlistId: string) => {
    window.open(`https://www.youtube.com/playlist?list=${playlistId}`, '_blank', 'noopener,noreferrer');
  };

  const handleRenamePlaylist = async (playlistId: string) => {
    const p = youtubePlaylists.find((x) => x.playlist_id === playlistId);
    const next = prompt('Edit playlist name', p?.title || '');
    if (!next || !next.trim()) return;

    try {
      const { error } = await supabase
        .from('youtube_playlists')
        .update({ title: next.trim(), updated_at: new Date().toISOString() })
        .eq('user_id', user!.id)
        .eq('playlist_id', playlistId);
      if (error) throw error;
      await loadYouTubePlaylists();
    } catch (error) {
      console.error('Error renaming playlist:', error);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!confirm('Delete this playlist and all its videos? This cannot be undone.')) return;
    try {
      const { error: sceneError } = await supabase
        .from('scenes')
        .delete()
        .eq('user_id', user!.id)
        .eq('playlist_id', playlistId);
      if (sceneError) throw sceneError;

      const { error: plError } = await supabase
        .from('youtube_playlists')
        .delete()
        .eq('user_id', user!.id)
        .eq('playlist_id', playlistId);
      if (plError) throw plError;

      setSelectedYouTubePlaylistId(null);
      await loadScenes();
      await loadYouTubePlaylists();
    } catch (error) {
      console.error('Error deleting playlist:', error);
    }
  };

  const handleRefreshPlaylist = async (playlistId: string) => {
    const playlistScenes = scenes.filter((s) => s.platform === 'YouTube' && s.playlist_id === playlistId);
    const defaultCategory = (playlistScenes[0]?.category || 'F/M') as Category;
    const nextCategory = prompt('Category for any newly added videos (F/M, F/F, M/F, M/M)', defaultCategory);
    const validCategories: Category[] = ['F/M', 'F/F', 'M/F', 'M/M'];
    const chosen = validCategories.includes(nextCategory as Category) ? (nextCategory as Category) : defaultCategory;
    await handleYouTubeImport(`https://www.youtube.com/playlist?list=${playlistId}`, chosen);
  };

  const handleExportPlaylist = (playlistScenes: Scene[]) => {
    setExportContextScenes(playlistScenes);
    setShowExportModal(true);
  };

  const extractPlaylistId = (url: string): string | null => {
    const value = String(url || '').trim();
    if (!value) return null;

    if (/^[A-Za-z0-9_-]{10,}$/.test(value) && !value.includes('youtube') && !value.includes('http')) {
      return value;
    }

    if (value.includes('list=')) {
      const rawQuery = value.includes('?') ? value.split('?')[1] : value;
      const params = new URLSearchParams(rawQuery);
      const list = params.get('list');
      if (list) return list;
    }

    try {
      const normalized = value.startsWith('http') ? value : `https://${value}`;
      const parsed = new URL(normalized);
      const params = new URLSearchParams(parsed.search);
      const list = params.get('list');
      return list || null;
    } catch {
      return null;
    }
  };

  const updateSceneDetails = async (scene: Scene, data: Partial<Scene>) => {
    try {
      const { error } = await supabase
        .from('scenes')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', scene.id);

      if (error) throw error;
      await loadScenes();
      setDetailScene(undefined);
    } catch (error) {
      console.error('Error updating scene:', error);
      throw error;
    }
  };

  const checkSingleVideoStatus = async (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene || !scene.video_id) return;

    const apiKey = localStorage.getItem('youtube_api_key');
    if (!apiKey) {
      alert('Please add your YouTube API key in Settings first');
      return;
    }

    try {
      console.log('[YouTube Status] Checking single video:', { sceneId, videoId: scene.video_id });

      const url = new URL('https://www.googleapis.com/youtube/v3/videos');
      url.searchParams.set('part', 'status');
      url.searchParams.set('id', scene.video_id);
      url.searchParams.set('key', apiKey);

      console.log('[YouTube Status] Fetch videos.list request:', {
        url: url.toString().replace(apiKey, '***REDACTED***'),
      });

      const response = await fetch(url.toString());
      console.log('[YouTube Status] videos.list response:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
      });

      if (!response.ok) {
        const raw = await response.text().catch(() => '');
        console.log('[YouTube Status] videos.list error body (raw):', raw);
        const message = (() => {
          try {
            const parsed = JSON.parse(raw || '{}') as any;
            return parsed?.error?.message || '';
          } catch {
            return '';
          }
        })();
        const lower = String(message || '').toLowerCase();
        if (response.status === 403 && lower.includes('quota')) {
          alert('YouTube API quota exceeded. Please try again tomorrow.');
        } else if (response.status === 403) {
          alert('Invalid API key. Please check your settings.');
        }
        return;
      }

      const data: any = await response.json().catch(() => ({}));
      console.log('[YouTube Status] videos.list JSON:', data);
      const item = data?.items?.[0];

      const normalizedStatus: Status = item
        ? (item?.status?.privacyStatus === 'private' ? 'private' : 'available')
        : 'unavailable';

      const { error } = await supabase
        .from('scenes')
        .update({
          status: normalizedStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sceneId);

      if (error) throw error;
      await loadScenes();
    } catch (error) {
      console.error('Error checking video status:', error);
    }
  };

  const checkAllYouTubeVideos = async () => {
    const youtubeScenes = scenes.filter(s => s.platform === 'YouTube' && s.video_id);
    if (youtubeScenes.length === 0) {
      alert('No YouTube videos found to check');
      return;
    }

    const apiKey = localStorage.getItem('youtube_api_key');
    if (!apiKey) {
      alert('Please add your YouTube API key in Settings first');
      return;
    }

    setCheckingProgress({ current: 0, total: youtubeScenes.length });

    try {
      const videoIds = youtubeScenes.map(s => s.video_id!);

      console.log('[YouTube Status] Checking all videos:', { count: videoIds.length });

      const statusByVideoId = new Map<string, Status>();
      for (let offset = 0; offset < videoIds.length; offset += 50) {
        const chunk = videoIds.slice(offset, offset + 50);
        console.log('[YouTube Status] Fetch videos.list chunk:', { offset, size: chunk.length });

        const url = new URL('https://www.googleapis.com/youtube/v3/videos');
        url.searchParams.set('part', 'status');
        url.searchParams.set('id', chunk.join(','));
        url.searchParams.set('key', apiKey);

        console.log('[YouTube Status] Fetch videos.list request:', {
          url: url.toString().replace(apiKey, '***REDACTED***'),
        });

        const response = await fetch(url.toString());
        console.log('[YouTube Status] videos.list response:', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
        });

        if (!response.ok) {
          const raw = await response.text().catch(() => '');
          console.log('[YouTube Status] videos.list error body (raw):', raw);
          const message = (() => {
            try {
              const parsed = JSON.parse(raw || '{}') as any;
              return parsed?.error?.message || '';
            } catch {
              return '';
            }
          })();
          const lower = String(message || '').toLowerCase();
          if (response.status === 403 && lower.includes('quota')) {
            alert('YouTube API quota exceeded. Please try again tomorrow.');
          } else if (response.status === 403) {
            alert('Invalid API key. Please check your settings.');
          }
          setCheckingProgress(null);
          return;
        }

        const data: any = await response.json().catch(() => ({}));
        console.log('[YouTube Status] videos.list chunk JSON:', data);
        const items: any[] = data?.items || [];

        const foundIds = new Set<string>();
        for (const item of items) {
          const id = String(item?.id || '');
          if (!id) continue;
          foundIds.add(id);
          const privacyStatus = String(item?.status?.privacyStatus || '').toLowerCase();
          statusByVideoId.set(id, privacyStatus === 'private' ? 'private' : 'available');
        }

        for (const id of chunk) {
          if (!foundIds.has(id)) {
            statusByVideoId.set(id, 'unavailable');
          }
        }
      }

      console.log('[YouTube Status] Status map built:', { count: statusByVideoId.size });

      for (let i = 0; i < youtubeScenes.length; i++) {
        const scene = youtubeScenes[i];
        const nextStatus = statusByVideoId.get(scene.video_id!) || 'unavailable';

        const { error } = await supabase
          .from('scenes')
          .update({
            status: nextStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', scene.id);

        if (error) throw error;
        setCheckingProgress({ current: i + 1, total: youtubeScenes.length });
      }

      await loadScenes();

      const statuses = Array.from(statusByVideoId.values());
      const available = statuses.filter((s) => s === 'available').length;
      const unavailable = statuses.filter((s) => s !== 'available').length;

      alert(`Checked ${statuses.length} videos: ${available} available, ${unavailable} unavailable`);
    } catch (error) {
      console.error('Error checking all videos:', error);
      alert('Error checking videos. Please try again.');
    } finally {
      setCheckingProgress(null);
    }
  };

  const handleOpenExportModal = () => {
    setShowExportModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center p-6">
        <div className="w-full max-w-6xl">
          <SceneGridSkeleton count={12} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[var(--app-bg)]">
        <Sidebar
          active={activeSection}
          onNavigate={(section) => setActiveSection(section)}
          onOpenSettings={() => setShowSettings(true)}
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
        />

        <main className="min-h-screen md:pl-[240px] px-6 py-8">
          {activeSection !== 'profile' && <StatsPanel stats={calculateStats()} />}

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary flex items-center justify-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Add Scene</span>
            </button>

            {activeSection === 'YouTube' && (
              <button
                onClick={() => setShowYouTubeImport(true)}
                className="btn-primary flex items-center justify-center space-x-2"
              >
                <Youtube className="w-5 h-5" />
                <span>Import Playlist</span>
              </button>
            )}

            <button
              onClick={checkAllYouTubeVideos}
              disabled={checkingProgress !== null}
              className="btn-secondary flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {checkingProgress ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Checking {checkingProgress.current}/{checkingProgress.total}</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Check All Videos</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="btn-secondary"
            >
              Import
            </button>
            <button
              onClick={handleOpenExportModal}
              className="btn-secondary"
            >
              Export
            </button>
          </div>

          {activeSection === 'YouTube' ? (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">YouTube</h1>
                <div className="text-sm text-[var(--text-secondary)]">Playlists and videos</div>
              </div>

              {selectedYouTubePlaylistId ? (
                (() => {
                  const isManual = selectedYouTubePlaylistId === '__manual__';
                  const playlist = youtubePlaylists.find((p) => p.playlist_id === selectedYouTubePlaylistId);
                  const playlistScenes = isManual
                    ? scenes.filter((s) => s.platform === 'YouTube' && (s.source_type === 'manual' || !s.playlist_id))
                    : scenes.filter((s) => s.platform === 'YouTube' && s.playlist_id === selectedYouTubePlaylistId);

                  const filteredPlaylistScenes = playlistScenes
                    .filter((s) => {
                      const q = youtubePlaylistSearch.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        s.title.toLowerCase().includes(q) ||
                        s.channel_name?.toLowerCase().includes(q) ||
                        s.notes?.toLowerCase().includes(q) ||
                        s.timestamp?.toLowerCase().includes(q)
                      );
                    })
                    .filter((s) => (youtubePlaylistCategory === 'all' ? true : s.category === youtubePlaylistCategory));

                  const availableCount = playlistScenes.filter((s) => s.status === 'available').length;
                  const unavailableCount = playlistScenes.filter((s) => s.status === 'unavailable' || s.status === 'private').length;

                  const title = isManual ? `Individual Videos` : (playlist?.title || `Playlist: ${selectedYouTubePlaylistId}`);
                  const description = isManual ? '' : (playlist?.description || '');
                  const importedAt = isManual ? '' : (playlist?.imported_at || '');
                  const thumbnail = isManual ? '' : (playlist?.thumbnail || playlistScenes[0]?.thumbnail || '');
                  const totalCountLabel = isManual
                    ? playlistScenes.length
                    : (playlist?.video_count && playlist?.video_count > 0 ? playlist.video_count : playlistScenes.length);

                  return (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="text-xs text-[var(--text-secondary)]">Home &gt; YouTube &gt; {title}</div>
                          <div className="text-2xl font-bold text-white">{title}</div>
                          <div className="text-sm text-[var(--text-secondary)]">
                            {totalCountLabel} video{totalCountLabel === 1 ? '' : 's'}
                            {importedAt ? ` • Imported: ${formatDateShort(importedAt)}` : ''}
                            {!isManual && playlistScenes.length !== totalCountLabel ? ` • Imported: ${playlistScenes.length}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isManual && (
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => handleOpenPlaylistOnYouTube(selectedYouTubePlaylistId)}
                            >
                              View on YouTube
                            </button>
                          )}
                          {!isManual && (
                            <button type="button" className="btn-secondary" onClick={() => handleRenamePlaylist(selectedYouTubePlaylistId)}>
                              Rename
                            </button>
                          )}
                          {!isManual && (
                            <button type="button" className="btn-secondary" onClick={() => handleRefreshPlaylist(selectedYouTubePlaylistId)}>
                              Refresh
                            </button>
                          )}
                          <button type="button" className="btn-secondary" onClick={() => handleExportPlaylist(playlistScenes)}>
                            Export
                          </button>
                          {!isManual && (
                            <button type="button" className="btn-danger" onClick={() => handleDeletePlaylist(selectedYouTubePlaylistId)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </div>

                      {thumbnail && (
                        <div className="w-full max-w-3xl aspect-video rounded-xl overflow-hidden border border-[var(--surface-border)] bg-[var(--bg-tertiary)]">
                          <img src={thumbnail} alt={title} className="w-full h-full object-cover" />
                        </div>
                      )}

                      {description && (
                        <div className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{description}</div>
                      )}

                      <div className="flex items-center justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedYouTubePlaylistId(null);
                            setYoutubePlaylistSearch('');
                            setYoutubePlaylistCategory('all');
                          }}
                          className="text-[var(--text-secondary)] hover:text-white"
                        >
                          ← Back to Playlists
                        </button>

                        <div className="flex items-center gap-3">
                          <div className="text-xs px-2 py-1 rounded bg-green-500/15 text-green-300">Available: {availableCount}</div>
                          <div className="text-xs px-2 py-1 rounded bg-red-500/15 text-red-300">Unavailable: {unavailableCount}</div>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row gap-3">
                        <input
                          value={youtubePlaylistSearch}
                          onChange={(e) => setYoutubePlaylistSearch(e.target.value)}
                          className="input flex-1"
                          placeholder="Search within this playlist"
                        />
                        <select
                          value={youtubePlaylistCategory}
                          onChange={(e) => setYoutubePlaylistCategory(e.target.value as any)}
                          className="input md:w-56"
                        >
                          <option value="all">All categories</option>
                          <option value="F/M">F/M</option>
                          <option value="F/F">F/F</option>
                          <option value="M/F">M/F</option>
                          <option value="M/M">M/M</option>
                        </select>
                      </div>

                      {filteredPlaylistScenes.length === 0 ? (
                        <div className="text-center py-16">
                          <p className="text-[var(--text-secondary)] text-lg">No videos match your search/filter.</p>
                        </div>
                      ) : (
                        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4 md:gap-6 lg:gap-8 ${selectedIds.size > 0 ? 'pb-24' : ''}`}>
                          {filteredPlaylistScenes.map((scene) => (
                            <SceneCard
                              key={scene.id}
                              scene={scene}
                              onEdit={handleEdit}
                              onDelete={handleDeleteScene}
                              onCheckStatus={checkSingleVideoStatus}
                              onViewDetails={selectedIds.size === 0 ? setDetailScene : undefined}
                              isSelected={selectedIds.has(scene.id)}
                              onSelect={handleSelectScene}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                (() => {
                  type PlaylistCard = {
                    playlist_id: string;
                    title: string;
                    description?: string;
                    thumbnail?: string;
                    video_count: number;
                    imported_at?: string;
                  };

                  const playlistSceneCounts = scenes
                    .filter((s) => s.platform === 'YouTube' && s.source_type === 'youtube_playlist' && !!s.playlist_id)
                    .reduce<Record<string, number>>((acc, s) => {
                      const id = s.playlist_id as string;
                      acc[id] = (acc[id] || 0) + 1;
                      return acc;
                    }, {});

                  const playlistFirstThumb = scenes
                    .filter((s) => s.platform === 'YouTube' && s.source_type === 'youtube_playlist' && !!s.playlist_id)
                    .reduce<Record<string, string>>((acc, s) => {
                      const id = s.playlist_id as string;
                      if (!acc[id] && s.thumbnail) acc[id] = s.thumbnail;
                      return acc;
                    }, {});

                  const playlistFirstCreated = scenes
                    .filter((s) => s.platform === 'YouTube' && s.source_type === 'youtube_playlist' && !!s.playlist_id)
                    .reduce<Record<string, string>>((acc, s) => {
                      const id = s.playlist_id as string;
                      if (!acc[id]) acc[id] = s.created_at;
                      return acc;
                    }, {});

                  const playlistIdSet = new Set(Object.keys(playlistSceneCounts));

                  const playlistsForCards: PlaylistCard[] = [
                    ...youtubePlaylists.map((p) => ({
                      playlist_id: p.playlist_id,
                      title: p.title,
                      description: p.description,
                      thumbnail: p.thumbnail,
                      video_count: p.video_count,
                      imported_at: p.imported_at,
                    })),
                    ...Array.from(playlistIdSet)
                      .filter((id) => !youtubePlaylists.some((p) => p.playlist_id === id))
                      .map((id) => ({
                        playlist_id: id,
                        title: `Playlist: ${id}`,
                        description: '',
                        thumbnail: playlistFirstThumb[id] || '',
                        video_count: playlistSceneCounts[id] || 0,
                        imported_at: playlistFirstCreated[id] || '',
                      })),
                  ].sort((a, b) => {
                    const aTime = a.imported_at ? new Date(a.imported_at).getTime() : 0;
                    const bTime = b.imported_at ? new Date(b.imported_at).getTime() : 0;
                    return bTime - aTime;
                  });

                  const manualScenes = scenes.filter((s) => s.platform === 'YouTube' && (s.source_type === 'manual' || !s.playlist_id));
                  const playlistVideoScenes = scenes.filter((s) => s.platform === 'YouTube' && s.source_type === 'youtube_playlist' && !!s.playlist_id);

                  const totalPlaylistVideos = playlistVideoScenes.length;
                  const totalPlaylists = playlistsForCards.length;

                  return (
                    <>
                      <div className="mb-6">
                        <h2 className="display">Playlists</h2>
                        <p className="meta">{totalPlaylists} playlist{totalPlaylists === 1 ? '' : 's'} • {totalPlaylistVideos} video{totalPlaylistVideos === 1 ? '' : 's'}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4 md:gap-6 lg:gap-8">
                        <button
                          onClick={() => setSelectedYouTubePlaylistId('__manual__')}
                          className="surface hover:scale-105 transition-transform p-6 text-left"
                        >
                          <div className="w-full aspect-video bg-[var(--bg-tertiary)] rounded-lg mb-4 flex items-center justify-center">
                            <Plus className="w-12 h-12 text-[var(--text-secondary)]" />
                          </div>
                          <h3 className="title">Individual Videos</h3>
                          <p className="meta mt-1">{manualScenes.length} video{manualScenes.length === 1 ? '' : 's'}</p>
                        </button>

                        {playlistsForCards.map((playlist) => (
                          <button
                            key={playlist.playlist_id}
                            onClick={() => setSelectedYouTubePlaylistId(playlist.playlist_id)}
                            className="surface hover:scale-105 transition-transform p-6 text-left"
                          >
                            <div className="w-full aspect-video bg-[var(--bg-tertiary)] rounded-lg mb-4 overflow-hidden">
                              {playlist.thumbnail ? (
                                <img src={playlist.thumbnail} alt={playlist.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-[var(--bg-tertiary)] flex items-center justify-center">
                                  <Youtube className="w-12 h-12 text-[var(--text-secondary)]" />
                                </div>
                              )}
                            </div>
                            <h3 className="title line-clamp-2">{playlist.title}</h3>
                            {playlist.description && (
                              <p className="meta mt-1 line-clamp-2">{playlist.description}</p>
                            )}
                            <p className="meta mt-2">
                              {playlist.video_count} video{playlist.video_count === 1 ? '' : 's'}
                              {playlist.imported_at && ` • Imported: ${formatDateShort(playlist.imported_at)}`}
                            </p>
                          </button>
                        ))}
                      </div>
                    </>
                  );
                })()
              )}
            </>
          ) : activeSection === 'tags' ? (
            <TagManagementPage
              tags={allTags}
              userId={user?.id || ''}
              onCreate={async ({ name, color }) => {
                if (!user) return;
                await tagService.createTag({ user_id: user.id, name, color: color || null });
                await loadTags();
              }}
              onUpdate={async (id, updates) => {
                await tagService.updateTag(id, updates);
                await loadTags();
              }}
              onDelete={async (id) => {
                await tagService.deleteTag(id);
                await loadTags();
              }}
            />
          ) : activeSection === 'profile' ? (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Profile</h1>
                <div className="text-sm text-[var(--text-secondary)]">Account and preferences</div>
              </div>
              <div className="card p-6">
                <div className="text-sm text-[var(--text-secondary)]">Profile page UI is not implemented yet.</div>
              </div>
            </>
          ) : isPlatformPage ? (
            (() => {
              const brand = getPlatformBrand(activeSection as Platform);
              return (
                <div key={activeSection} className="transition-all duration-300">
                  <div className="mb-6">
                    <div className="flex items-center gap-3">
                      <div className={brand.colorClass}>{brand.icon}</div>
                      <div>
                        <h1 className="text-2xl font-bold text-white">{brand.label}</h1>
                        <div className="text-sm text-[var(--text-secondary)]">
                          {platformPageScenes.length} video{platformPageScenes.length === 1 ? '' : 's'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <AdvancedSearch
                    query={platformQuery}
                    onQueryChange={setPlatformQuery}
                    selectedCategories={platformCategories}
                    onToggleCategory={(cat) => {
                      setPlatformCategories((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
                    }}
                    selectedStatuses={platformStatuses}
                    onToggleStatus={(s) => {
                      setPlatformStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
                    }}
                    sortBy={platformSortBy}
                    onSortChange={setPlatformSortBy}
                  />

                  {filteredPlatformScenes.length === 0 ? (
                    <div className="text-center py-16">
                      <p className="text-[var(--text-secondary)] text-lg">
                        {platformPageScenes.length === 0
                          ? 'No videos in this collection yet.'
                          : 'No videos match your search/filters.'}
                      </p>
                    </div>
                  ) : (
                    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4 md:gap-6 lg:gap-8 ${selectedIds.size > 0 ? 'pb-24' : ''}`}>
                      {filteredPlatformScenes.map((scene) => (
                        <SceneCard
                          key={scene.id}
                          scene={scene}
                          onEdit={handleEdit}
                          onDelete={handleDeleteScene}
                          onCheckStatus={checkSingleVideoStatus}
                          onViewDetails={selectedIds.size === 0 ? setDetailScene : undefined}
                          isSelected={selectedIds.has(scene.id)}
                          onSelect={handleSelectScene}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">
                  {activeSection === 'all' ? 'All Scenes' : `${activeSection} Videos`}
                </h1>
                <div className="text-sm text-[var(--text-secondary)]">
                  {activeSection === 'all'
                  ? `${scenes.length} total`
                  : `${scenes.filter((s) => s.platform === activeSection).length} videos`}
              </div>
            </div>
            <FilterBar
              searchQuery={filterState.searchQuery}
              onSearchChange={(query) => updateFilterState({ searchQuery: query })}
              selectedPlatform={filterState.selectedPlatform}
              onPlatformChange={(platform) => updateFilterState({ selectedPlatform: platform })}
              selectedCategory={filterState.selectedCategory}
              onCategoryChange={(category) => updateFilterState({ selectedCategory: category })}
              selectedStatus={filterState.selectedStatus}
              onStatusChange={(status) => updateFilterState({ selectedStatus: status })}
              allTags={allTags}
              selectedTagIds={filterState.selectedTagIds}
              onSelectedTagIdsChange={(tagIds) => updateFilterState({ selectedTagIds: tagIds })}
              tagMatchMode={filterState.tagMatchMode}
              onTagMatchModeChange={(mode) => updateFilterState({ tagMatchMode: mode })}
              sortBy={filterState.sortBy}
              onSortChange={(sort) => updateFilterState({ sortBy: sort })}
              activeFilters={getActiveFilters()}
              onRemoveFilter={(type) => {
                switch (type) {
                  case 'search':
                    updateFilterState({ searchQuery: '' });
                    break;
                  case 'platform':
                    updateFilterState({ selectedPlatform: 'all' });
                    break;
                  case 'category':
                    updateFilterState({ selectedCategory: 'all' });
                    break;
                  case 'status':
                    updateFilterState({ selectedStatus: 'all' });
                    break;
                }
              }}
              onClearAllFilters={clearAllFilters}
              resultsCount={filteredScenes.length}
              totalCount={scenes.length}
              selectedCount={selectedIds.size}
              onSelectAll={handleSelectAll}
            />

            {filteredScenes.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-[var(--text-secondary)] text-lg">
                  {scenes.length === 0
                    ? 'No scenes yet. Add your first scene to get started!'
                    : 'No scenes match your filters.'}
                </p>
              </div>
            ) : (
              <>
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-4 md:gap-6 lg:gap-8 ${selectedIds.size > 0 ? 'pb-24' : ''}`}>
                  {filteredScenes.map((scene) => (
                    <SceneCard
                      key={scene.id}
                      scene={scene}
                      onEdit={handleEdit}
                      onDelete={handleDeleteScene}
                      onCheckStatus={checkSingleVideoStatus}
                      onViewDetails={selectedIds.size === 0 ? setDetailScene : undefined}
                      isSelected={selectedIds.has(scene.id)}
                      onSelect={handleSelectScene}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {showForm && (
        <SceneForm
          scene={editingScene}
          onSubmit={editingScene ? handleUpdateScene : handleAddScene}
          onCancel={handleCancelForm}
          defaultPlatform={defaultPlatformForNewScene}
          allTags={allTags}
          onCreateTag={handleCreateTag}
        />
      )}

      {showYouTubeImport && (
        <YouTubeImport
          onImport={handleYouTubeImport}
          onCancel={() => setShowYouTubeImport(false)}
          onOpenSettings={() => {
            setShowYouTubeImport(false);
            setShowSettings(true);
          }}
        />
      )}

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
        />
      )}

      {detailScene && (
        <SceneDetailModal
          scene={detailScene}
          onClose={() => setDetailScene(undefined)}
          onEdit={() => {
            setDetailScene(undefined);
            handleEdit(detailScene);
          }}
          onDelete={handleDeleteScene}
          onCheckStatus={checkSingleVideoStatus}
          onUpdate={updateSceneDetails}
        />
      )}

      {selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onChangeCategory={() => setShowBulkCategoryModal(true)}
          onChangeStatus={handleBulkStatusChange}
          onBulkTags={() => setShowBulkTagsModal(true)}
          onDelete={handleBulkDelete}
          onExport={handleBulkExport}
          onClearSelection={handleClearSelection}
        />
      )}

      {showBulkTagsModal && (
        <BulkTagsModal
          allTags={allTags}
          onClose={() => setShowBulkTagsModal(false)}
          onCreateTag={handleCreateTag}
          onApply={handleApplyBulkTags}
        />
      )}

      {showBulkCategoryModal && (
        <BulkCategoryModal
          onSelect={handleBulkCategoryChange}
          onClose={() => setShowBulkCategoryModal(false)}
        />
      )}

      {showExportModal && (
        (() => {
          const modalScenes = exportContextScenes || scenes;
          const modalFiltered = exportContextScenes || filteredScenes;
          const modalSelectedIds = exportContextScenes ? new Set<string>() : selectedIds;
          const modalSelectedCount = exportContextScenes ? 0 : selectedIds.size;

          return (
        <ExportModal
          scenes={modalScenes}
          filteredScenes={modalFiltered}
          selectedCount={modalSelectedCount}
          selectedIds={modalSelectedIds}
          onExport={handleExportScenes}
          onClose={() => {
            setShowExportModal(false);
            setExportContextScenes(null);
          }}
        />
          );
        })()
      )}

      {showImportModal && (
        <ImportModal
          existingCount={scenes.length}
          onImport={handleImport}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>

    <CommandPalette
      isOpen={commandPaletteOpen}
      onClose={() => setCommandPaletteOpen(false)}
      scenes={scenes}
      onSelectScene={setDetailScene}
      onNavigate={(section) => setActiveSection(section)}
      onOpenAddScene={() => setShowForm(true)}
      onOpenImport={() => setShowYouTubeImport(true)}
      onOpenSettings={() => setShowSettings(true)}
      onSignOut={() => {
        // TODO: integrate with AuthContext signOut
        console.log('Sign out');
      }}
    />
    </>
  );
}
