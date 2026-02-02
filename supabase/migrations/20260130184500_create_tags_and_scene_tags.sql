/*
  Adds multi-tag system (Option A):
  - tags (user-owned + global seeded tags)
  - scene_tags junction table
  NOTE: category remains on scenes.
*/

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS scene_tags (
  scene_id uuid REFERENCES scenes(id) ON DELETE CASCADE NOT NULL,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (scene_id, tag_id)
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE scene_tags ENABLE ROW LEVEL SECURITY;

-- Tags policies:
-- - Read: own tags + global tags (user_id IS NULL)
-- - Write: only own tags
CREATE POLICY "Users can view tags"
  ON tags FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert own tags"
  ON tags FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tags"
  ON tags FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own tags"
  ON tags FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- scene_tags policies: user can manage tags only for scenes they own
CREATE POLICY "Users can view own scene_tags"
  ON scene_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM scenes s
      WHERE s.id = scene_tags.scene_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own scene_tags"
  ON scene_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM scenes s
      WHERE s.id = scene_tags.scene_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own scene_tags"
  ON scene_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM scenes s
      WHERE s.id = scene_tags.scene_id
        AND s.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_scene_tags_tag_id ON scene_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_scene_tags_scene_id ON scene_tags(scene_id);

-- Seed global tags (readable by all users, not editable/deletable due to RLS)
INSERT INTO tags (user_id, name, color)
VALUES
  (NULL, 'F/M', '#ef4444'),
  (NULL, 'F/F', '#ec4899'),
  (NULL, 'M/F', '#3b82f6'),
  (NULL, 'M/M', '#a855f7'),
  (NULL, 'Favorites', '#f59e0b'),
  (NULL, 'Action', '#22c55e'),
  (NULL, 'Drama', '#64748b')
ON CONFLICT (user_id, name) DO NOTHING;
