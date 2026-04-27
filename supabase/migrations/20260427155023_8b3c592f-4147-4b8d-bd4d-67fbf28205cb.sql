-- Etapa 2: estruturas que dependem dos novos valores do enum

-- 1) Tornar condominio_id opcional (BASE)
ALTER TABLE public.chamados_tecnicos
  ALTER COLUMN condominio_id DROP NOT NULL;

-- 2) Enums novos
DO $$ BEGIN
  CREATE TYPE public.origem_chamado AS ENUM ('sindico','morador','operador','manutencao');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.destino_chamado AS ENUM ('manutencao','ti','terceiros');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Novas colunas
ALTER TABLE public.chamados_tecnicos
  ADD COLUMN IF NOT EXISTS unidade_id uuid REFERENCES public.unidades(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bloco_id uuid REFERENCES public.blocos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origem_solicitante public.origem_chamado,
  ADD COLUMN IF NOT EXISTS destino public.destino_chamado,
  ADD COLUMN IF NOT EXISTS empresa_terceiro text,
  ADD COLUMN IF NOT EXISTS numero_protocolo text,
  ADD COLUMN IF NOT EXISTS prazo timestamptz,
  ADD COLUMN IF NOT EXISTS finalizado_em timestamptz;

-- 4) Default do status para 'aberto'
ALTER TABLE public.chamados_tecnicos
  ALTER COLUMN status SET DEFAULT 'aberto'::status_chamado;

-- 5) Trigger para preencher finalizado_em
CREATE OR REPLACE FUNCTION public.set_chamado_finalizado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('resolvido','cancelado','concluido') THEN
    IF NEW.finalizado_em IS NULL THEN
      NEW.finalizado_em := now();
    END IF;
    IF NEW.data_conclusao IS NULL THEN
      NEW.data_conclusao := now();
    END IF;
  ELSE
    NEW.finalizado_em := NULL;
    NEW.data_conclusao := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chamado_finalizado ON public.chamados_tecnicos;
CREATE TRIGGER trg_chamado_finalizado
  BEFORE INSERT OR UPDATE OF status ON public.chamados_tecnicos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_chamado_finalizado();

-- 6) Índices
CREATE INDEX IF NOT EXISTS idx_chamados_condominio ON public.chamados_tecnicos(condominio_id);
CREATE INDEX IF NOT EXISTS idx_chamados_destino ON public.chamados_tecnicos(destino);
CREATE INDEX IF NOT EXISTS idx_chamados_data_abertura ON public.chamados_tecnicos(data_abertura DESC);