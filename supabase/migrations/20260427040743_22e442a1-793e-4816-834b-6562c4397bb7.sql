ALTER TABLE public.avisos
  ADD COLUMN IF NOT EXISTS data_expiracao timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_avisos_data_expiracao
  ON public.avisos (data_expiracao);