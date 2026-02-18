import { supabase } from '../lib/supabase';
import { Category, Platform, Status, YouTubePlaylist } from '../types';

export const youtubeService = {
  async fetchPlaylists(userId: string) {
    const { data, error } = await supabase
      .from('youtube_playlists')
      .select('*')
      .eq('user_id', userId)
      .order('imported_at', { ascending: false });

    if (error) throw error;
    return (data || []) as YouTubePlaylist[];
  },

  async createPlaylist(playlist: Omit<YouTubePlaylist, 'id' | 'imported_at'>) {
    const { data, error } = await supabase.from('youtube_playlists').upsert(playlist, { onConflict: 'user_id,playlist_id' }).select().single();
    if (error) throw error;
    return data as YouTubePlaylist;
  },

  async updatePlaylist(playlistId: string, updates: Partial<YouTubePlaylist>) {
    const { data, error } = await supabase
      .from('youtube_playlists')
      .update(updates)
      .eq('playlist_id', playlistId)
      .select()
      .single();
    if (error) throw error;
    return data as YouTubePlaylist;
  },

  async deletePlaylist(playlistId: string) {
    const { error } = await supabase.from('youtube_playlists').delete().eq('playlist_id', playlistId);
    if (error) throw error;
  },

  async checkVideoAvailability(videoId: string): Promise<'available' | 'unavailable'> {
    try {
      const response = await fetch(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
      return response.ok ? 'available' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  },

  async fetchVideoPrivacyStatusBatch(videoIds: string[], apiKey: string): Promise<Record<string, string>> {
    const ids = (videoIds || []).map((v) => String(v || '').trim()).filter(Boolean);
    if (ids.length === 0) return {};
    if (!apiKey) throw new Error('YouTube API key not configured. Go to Settings.');
    if (ids.length > 50) throw new Error('Too many video IDs for one request (max 50).');

    const parseYouTubeError = async (res: Response) => {
      const rawText = await res.text().catch(() => '');
      const parsed = (() => {
        try {
          return JSON.parse(rawText || '{}');
        } catch {
          return {};
        }
      })() as any;
      const message = parsed?.error?.message || `YouTube API request failed (${res.status})`;
      return { message };
    };

    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'status');
    url.searchParams.set('id', ids.join(','));
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      const { message } = await parseYouTubeError(response);
      const lower = String(message || '').toLowerCase();
      if (response.status === 403 && lower.includes('quota')) {
        throw new Error('YouTube API quota exceeded. Please try again tomorrow.');
      }
      if (response.status === 403) {
        throw new Error('Invalid YouTube API key. Please check your API key in Settings.');
      }
      throw new Error(message || 'Failed to check video status');
    }

    const data: any = await response.json().catch(() => ({}));
    const items: any[] = Array.isArray(data?.items) ? data.items : [];
    const map: Record<string, string> = {};
    for (const it of items) {
      const id = String(it?.id || '').trim();
      if (!id) continue;
      const privacy = String(it?.status?.privacyStatus || '').trim();
      if (privacy) map[id] = privacy;
    }
    return map;
  },

  async importPlaylist(
    playlistUrlOrId: string,
    category: Category,
    apiKey: string,
    userId: string
  ): Promise<{ playlistTitle: string; addedCount: number }> {
    const chunk = <T,>(arr: T[], size: number) => {
      const out: T[][] = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };

    const raw = String(playlistUrlOrId || '').trim();
    if (!raw) throw new Error('Invalid playlist URL');
    if (!apiKey) throw new Error('Please add YouTube API key in Settings');
    if (!userId || typeof userId !== 'string') throw new Error('Missing userId');

    const extractPlaylistId = (value: string): string | null => {
      const v = value.trim();
      const looksLikeId = /^[A-Za-z0-9_-]{10,}$/.test(v) && !v.includes('http') && !v.includes('youtube');
      if (looksLikeId) return v;

      const listMatch = v.match(/[?&]list=([A-Za-z0-9_-]{10,})/);
      if (listMatch?.[1]) return listMatch[1];

      try {
        const u = new URL(v);
        const list = u.searchParams.get('list');
        if (list) return list;
      } catch {
        return null;
      }

      return null;
    };

    const playlistId = extractPlaylistId(raw);
    if (!playlistId) throw new Error('Invalid playlist URL');

    const parseYouTubeError = async (res: Response) => {
      const rawText = await res.text().catch(() => '');
      const parsed = (() => {
        try {
          return JSON.parse(rawText || '{}');
        } catch {
          return {};
        }
      })() as any;
      const message = parsed?.error?.message || `YouTube API request failed (${res.status})`;
      return { message };
    };

    const playlistInfoUrl = new URL('https://www.googleapis.com/youtube/v3/playlists');
    playlistInfoUrl.searchParams.set('part', 'snippet');
    playlistInfoUrl.searchParams.set('id', playlistId);
    playlistInfoUrl.searchParams.set('key', apiKey);

    const playlistInfoRes = await fetch(playlistInfoUrl.toString());
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

    const playlistMeta: any = await playlistInfoRes.json().catch(() => ({}));
    const playlistItem = playlistMeta?.items?.[0];
    const snippet = playlistItem?.snippet || {};
    const playlistTitleFromApi = String(snippet?.title || '').trim() || `Playlist: ${playlistId}`;
    const playlistDescriptionFromApi = String(snippet?.description || '').trim();
    const playlistThumbnailFromApi =
      snippet?.thumbnails?.medium?.url ||
      snippet?.thumbnails?.default?.url ||
      snippet?.thumbnails?.high?.url ||
      '';

    const allItems: Array<{
      title: string;
      videoId: string;
      thumbnail: string;
      channelName: string;
      uploadDate: string;
      url: string;
      position: number | null;
    }> = [];

    let pageToken: string | null = null;
    let hasMore = true;

    while (hasMore) {
      const playlistItemsUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      playlistItemsUrl.searchParams.set('part', 'snippet');
      playlistItemsUrl.searchParams.set('playlistId', playlistId);
      playlistItemsUrl.searchParams.set('maxResults', '50');
      playlistItemsUrl.searchParams.set('key', apiKey);
      if (pageToken) playlistItemsUrl.searchParams.set('pageToken', pageToken);

      const response = await fetch(playlistItemsUrl.toString());
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
      const rawItems: any[] = data.items || [];

      const items = rawItems.map((item: any) => {
        const s = item?.snippet || {};
        const videoId = s?.resourceId?.videoId || '';
        const position = Number(s?.position);
        return {
          title: s?.title || 'Untitled',
          videoId,
          thumbnail: s?.thumbnails?.medium?.url || s?.thumbnails?.default?.url || '',
          channelName: s?.channelTitle || 'Unknown Channel',
          uploadDate: s?.publishedAt || new Date().toISOString(),
          url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
          position: Number.isFinite(position) ? position : null,
        };
      });

      allItems.push(...items);
      pageToken = data.nextPageToken || null;
      hasMore = pageToken !== null;
    }

    if (allItems.length === 0) {
      throw new Error('No videos found in this playlist.');
    }

    if (!playlistId) {
      throw new Error('Missing playlistId');
    }

    console.log('[YouTube Import] Checking existing videos:', {
      userId,
      platform: 'YouTube',
      playlistId,
    });

    const existingVideosQuery = supabase
      .from('scenes')
      .select('video_id')
      .eq('user_id', userId)
      .eq('platform', 'YouTube')
      .eq('playlist_id', playlistId)
      .not('video_id', 'is', null);

    let existingVideoIds = new Set<string>();
    {
      const { data: existingRows, error: existingErr } = await existingVideosQuery;
      if (existingErr) {
        const message = String((existingErr as any)?.message || '');
        const code = String((existingErr as any)?.code || '');
        const looksLikeMissingColumn =
          code === '42703' || message.toLowerCase().includes('column') || message.toLowerCase().includes('video_id');
        if (!looksLikeMissingColumn) throw existingErr;
        console.warn('[YouTube Import] Skipping duplicate video check (video_id column may be missing):', {
          message,
          code,
        });
      } else {
        existingVideoIds = new Set((existingRows || []).map((r: any) => r.video_id).filter(Boolean));
      }
    }

    const scenesToInsert = allItems
      .filter((item) => item.videoId && !existingVideoIds.has(item.videoId))
      .map((item) => ({
        user_id: userId,
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
        playlist_position: item.position,
      }));

    if (scenesToInsert.length > 0) {
      const batches = chunk(scenesToInsert, 200);

      for (let i = 0; i < batches.length; i += 1) {
        const batch = batches[i];
        const { error } = await supabase.from('scenes').insert(batch).select();
        if (!error) continue;

        const message = String((error as any)?.message || '');
        const details = (error as any)?.details;
        const hint = (error as any)?.hint;
        const code = String((error as any)?.code || '');

        console.error('[YouTube Import] Scenes insert failed:', {
          message,
          details,
          hint,
          code,
          firstRow: batch[0],
          count: batch.length,
          batchIndex: i,
          batchCount: batches.length,
        });

        const looksLikeMissingColumn =
          code === '42703' || message.toLowerCase().includes('column') || message.toLowerCase().includes('does not exist');
        if (!looksLikeMissingColumn) throw error;

        const fallbackBatch = batch.map((s) => {
          const { video_id, channel_name, upload_date, playlist_position, ...rest } = s as any;
          return rest;
        });

        console.warn('[YouTube Import] Retrying scenes insert without YouTube metadata columns:', {
          removedFields: ['video_id', 'channel_name', 'upload_date', 'playlist_position'],
          firstRow: fallbackBatch[0],
          count: fallbackBatch.length,
          batchIndex: i,
          batchCount: batches.length,
        });

        const { error: retryErr } = await supabase.from('scenes').insert(fallbackBatch).select();
        if (retryErr) {
          console.error('[YouTube Import] Scenes insert retry failed:', {
            message: (retryErr as any)?.message,
            details: (retryErr as any)?.details,
            hint: (retryErr as any)?.hint,
            code: (retryErr as any)?.code,
          });
          throw retryErr;
        }
      }
    }

    const { data: existingPlaylist, error: playlistReadErr } = await supabase
      .from('youtube_playlists')
      .select('*')
      .eq('user_id', userId)
      .eq('playlist_id', playlistId)
      .maybeSingle();
    if (playlistReadErr) throw playlistReadErr;

    const upsertPayload: any = {
      user_id: userId,
      playlist_id: playlistId,
      title: playlistTitleFromApi,
      description: playlistDescriptionFromApi,
      thumbnail: playlistThumbnailFromApi || (existingPlaylist as any)?.thumbnail || '',
      video_count: allItems.length,
      updated_at: new Date().toISOString(),
    };

    if (!existingPlaylist) {
      upsertPayload.imported_at = new Date().toISOString();
    }

    const { error: playlistError } = await supabase
      .from('youtube_playlists')
      .upsert(upsertPayload, { onConflict: 'user_id,playlist_id' });
    if (playlistError) throw playlistError;

    return {
      playlistTitle: playlistTitleFromApi,
      addedCount: scenesToInsert.length,
    };
  },
};
