DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'scenes' AND column_name = 'playlist_position'
  ) THEN
    ALTER TABLE scenes ADD COLUMN playlist_position integer;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_scenes_playlist_position ON scenes(user_id, playlist_id, playlist_position);
