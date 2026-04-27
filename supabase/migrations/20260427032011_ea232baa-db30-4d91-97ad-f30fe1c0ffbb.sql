ALTER TABLE public.moradores
  ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();