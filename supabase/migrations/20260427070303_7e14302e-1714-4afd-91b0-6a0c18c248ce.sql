
ALTER TABLE public.ocorrencias
  ADD COLUMN IF NOT EXISTS bloco_id uuid,
  ADD COLUMN IF NOT EXISTS reclamante_morador_id uuid,
  ADD COLUMN IF NOT EXISTS reclamante_nome text,
  ADD COLUMN IF NOT EXISTS reclamado_morador_id uuid,
  ADD COLUMN IF NOT EXISTS reclamado_nome text,
  ADD COLUMN IF NOT EXISTS sindico_ciente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS emerson_ciente boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS providencia text;

CREATE INDEX IF NOT EXISTS idx_ocorrencias_data_hora ON public.ocorrencias (data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_created_at ON public.ocorrencias (created_at DESC);
