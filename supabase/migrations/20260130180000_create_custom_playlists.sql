CREATE TABLE IF NOT EXISTS playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  thumbnail_url text,
  is_youtube_import boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS playlist_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid REFERENCES playlists(id) ON DELETE CASCADE NOT NULL,
  scene_id uuid REFERENCES scenes(id) ON DELETE CASCADE NOT NULL,
  position integer NOT NULL DEFAULT 0
);

ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_scenes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own playlists"
  ON playlists FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playlists"
  ON playlists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playlists"
  ON playlists FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own playlists"
  ON playlists FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own playlist_scenes"
  ON playlist_scenes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM playlists p
      WHERE p.id = playlist_scenes.playlist_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own playlist_scenes"
  ON playlist_scenes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM playlists p
      WHERE p.id = playlist_scenes.playlist_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own playlist_scenes"
  ON playlist_scenes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM playlists p
      WHERE p.id = playlist_scenes.playlist_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM playlists p
      WHERE p.id = playlist_scenes.playlist_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own playlist_scenes"
  ON playlist_scenes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM playlists p
      WHERE p.id = playlist_scenes.playlist_id
        AND p.user_id = auth.uid()
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_playlist_scenes_unique
  ON playlist_scenes(playlist_id, scene_id);

CREATE INDEX IF NOT EXISTS idx_playlists_user_id
  ON playlists(user_id);

CREATE INDEX IF NOT EXISTS idx_playlist_scenes_playlist_id
  ON playlist_scenes(playlist_id);

CREATE INDEX IF NOT EXISTS idx_playlist_scenes_scene_id
  ON playlist_scenes(scene_id);

CREATE INDEX IF NOT EXISTS idx_playlist_scenes_position
  ON playlist_scenes(playlist_id, position);
