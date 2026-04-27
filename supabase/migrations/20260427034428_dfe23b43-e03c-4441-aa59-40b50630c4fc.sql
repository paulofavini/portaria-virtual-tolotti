ALTER TABLE public.avisos
  ADD COLUMN IF NOT EXISTS fixado boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_avisos_fixado_created
  ON public.avisos (fixado DESC, created_at DESC);