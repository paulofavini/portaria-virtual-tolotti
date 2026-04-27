-- Enums
CREATE TYPE public.origem_liberacao AS ENUM ('morador','sindico','empresa');
CREATE TYPE public.tipo_validade_liberacao AS ENUM ('unica','periodo','permanente');
CREATE TYPE public.status_liberacao AS ENUM ('ativa','expirada','revogada');

-- Table
CREATE TABLE public.liberacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL,

  origem public.origem_liberacao NOT NULL,
  tipo_visita TEXT NOT NULL,

  -- autorizador (preencher conforme origem)
  autorizador_morador_id UUID,
  autorizador_morador_nome TEXT,
  autorizador_unidade_id UUID,
  autorizador_sindico_nome TEXT,
  autorizador_empresa_nome TEXT,

  -- visitante
  visitante_nome TEXT NOT NULL,
  visitante_documento TEXT NOT NULL,
  visitante_empresa TEXT,
  observacoes TEXT,

  palavra_chave TEXT,

  tipo_validade public.tipo_validade_liberacao NOT NULL DEFAULT 'unica',
  data_inicio DATE,
  data_fim DATE,

  status public.status_liberacao NOT NULL DEFAULT 'ativa',
  revogada_em TIMESTAMPTZ,
  revogada_por UUID,
  revogada_motivo TEXT,

  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_liberacoes_condominio ON public.liberacoes(condominio_id);
CREATE INDEX idx_liberacoes_status ON public.liberacoes(status);
CREATE INDEX idx_liberacoes_visitante_nome ON public.liberacoes(visitante_nome);

-- updated_at trigger
CREATE TRIGGER trg_liberacoes_updated_at
BEFORE UPDATE ON public.liberacoes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-status function: marca expirada/ativa baseado em data_fim, sem mexer em revogadas
CREATE OR REPLACE FUNCTION public.fn_liberacao_auto_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'revogada' THEN
    RETURN NEW;
  END IF;

  IF NEW.tipo_validade = 'periodo' AND NEW.data_fim IS NOT NULL AND NEW.data_fim < CURRENT_DATE THEN
    NEW.status := 'expirada';
  ELSE
    IF NEW.status = 'expirada' THEN
      -- mantém expirada apenas se realmente vencida
      IF NEW.tipo_validade = 'periodo' AND NEW.data_fim IS NOT NULL AND NEW.data_fim < CURRENT_DATE THEN
        NEW.status := 'expirada';
      ELSE
        NEW.status := 'ativa';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_liberacoes_auto_status
BEFORE INSERT OR UPDATE ON public.liberacoes
FOR EACH ROW EXECUTE FUNCTION public.fn_liberacao_auto_status();

-- Audit trigger (existing fn_audit_log)
CREATE TRIGGER trg_liberacoes_audit
AFTER INSERT OR UPDATE OR DELETE ON public.liberacoes
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

-- RLS
ALTER TABLE public.liberacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view liberacoes"
ON public.liberacoes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Operators manage liberacoes"
ON public.liberacoes FOR ALL
TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operador'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operador'::app_role));