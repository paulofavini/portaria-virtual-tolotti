-- Add titulo, tipo, ativo columns to avisos
DO $$ BEGIN
  CREATE TYPE public.tipo_aviso AS ENUM ('informativo', 'urgente', 'manutencao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.avisos
  ADD COLUMN IF NOT EXISTS titulo text,
  ADD COLUMN IF NOT EXISTS tipo public.tipo_aviso NOT NULL DEFAULT 'informativo',
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- Backfill titulo from descricao for existing rows
UPDATE public.avisos
SET titulo = COALESCE(NULLIF(titulo, ''), LEFT(descricao, 80))
WHERE titulo IS NULL OR titulo = '';

-- Default created_by to authenticated user
ALTER TABLE public.avisos
  ALTER COLUMN created_by SET DEFAULT auth.uid();