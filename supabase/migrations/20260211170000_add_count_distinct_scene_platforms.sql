DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'count_distinct_scene_platforms'
  ) THEN
    CREATE FUNCTION public.count_distinct_scene_platforms(p_user_id uuid)
    RETURNS integer
    LANGUAGE sql
    STABLE
    AS $$
      SELECT COUNT(DISTINCT platform)::integer
      FROM public.scenes
      WHERE user_id = p_user_id;
    $$;
  END IF;
END $$;
