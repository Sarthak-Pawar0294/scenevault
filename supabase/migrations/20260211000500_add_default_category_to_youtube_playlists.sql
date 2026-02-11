DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'youtube_playlists' AND column_name = 'default_category'
  ) THEN
    ALTER TABLE youtube_playlists ADD COLUMN default_category text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_youtube_playlists_default_category ON youtube_playlists(default_category);
