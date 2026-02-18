ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own scenes" ON public.scenes;

CREATE POLICY "Users can insert own scenes"
  ON public.scenes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
