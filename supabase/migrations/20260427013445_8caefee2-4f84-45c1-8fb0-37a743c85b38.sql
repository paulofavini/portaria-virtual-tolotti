-- Status enum
DO $$ BEGIN
  CREATE TYPE public.status_ocorrencia AS ENUM ('em_andamento', 'finalizada');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE public.ocorrencias
  ADD COLUMN IF NOT EXISTS nome_pessoa text,
  ADD COLUMN IF NOT EXISTS documento text,
  ADD COLUMN IF NOT EXISTS status public.status_ocorrencia NOT NULL DEFAULT 'em_andamento',
  ADD COLUMN IF NOT EXISTS finalizada_em timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_ocorrencias_condo_data ON public.ocorrencias(condominio_id, data_hora DESC);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_status ON public.ocorrencias(status);