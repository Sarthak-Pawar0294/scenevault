export type Platform = 'YouTube' | 'JioHotstar' | 'Zee5' | 'SonyLIV' | 'Other';
export type Category = 'F/M' | 'F/F' | 'M/F' | 'M/M';
export type Status = 'available' | 'unavailable' | 'private';
export type SortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc';
export type SourceType = 'manual' | 'youtube_playlist';

export interface Tag {
  id: string;
  user_id?: string | null;
  name: string;
  color?: string | null;
  created_at?: string;
}

export interface SceneTag {
  scene_id: string;
  tag_id: string;
  created_at?: string;
}

export interface Scene {
  id: string;
  user_id: string;
  title: string;
  platform: Platform;
  category: Category;
  tags?: Tag[];
  url?: string;
  thumbnail?: string;
  timestamp?: string;
  notes?: string;
  status: Status;
  source_type: SourceType;
  playlist_id?: string;
  video_id?: string;
  channel_name?: string;
  upload_date?: string;
  created_at: string;
  updated_at: string;
}

export interface SceneFormData {
  title: string;
  platform: Platform;
  category: Category;
  url?: string;
  thumbnail?: string;
  timestamp?: string;
  notes?: string;
  status: Status;
  tagIds?: string[];
}

export interface YouTubePlaylist {
  id: string;
  user_id: string;
  playlist_id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  video_count: number;
  default_category?: Category;
  imported_at: string;
  last_checked?: string;
  updated_at: string;
}

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  thumbnail_url?: string;
  is_youtube_import: boolean;
  created_at: string;
}

export interface PlaylistScene {
  id: string;
  playlist_id: string;
  scene_id: string;
  position: number;
}

export interface PlaylistSceneRow extends PlaylistScene {
  scene: Scene;
}

export interface Stats {
  total: number;
  available: number;
  unavailable: number;
  byPlatform: Record<Platform, number>;
  byCategory: Record<Category, number>;
}
