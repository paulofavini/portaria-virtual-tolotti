-- Indexes for fast operational search
CREATE INDEX IF NOT EXISTS idx_liberacoes_visitante_nome_lower
  ON public.liberacoes (lower(visitante_nome) text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_liberacoes_documento_lower
  ON public.liberacoes (lower(visitante_documento) text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_liberacoes_palavra_chave_lower
  ON public.liberacoes (lower(palavra_chave) text_pattern_ops)
  WHERE palavra_chave IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_liberacoes_data_fim
  ON public.liberacoes (data_fim)
  WHERE tipo_validade = 'periodo';

-- Quick-access registration table
CREATE TABLE public.liberacao_acessos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  liberacao_id UUID NOT NULL REFERENCES public.liberacoes(id) ON DELETE CASCADE,
  liberado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  liberado_por UUID DEFAULT auth.uid(),
  observacao TEXT
);

CREATE INDEX idx_liberacao_acessos_liberacao ON public.liberacao_acessos(liberacao_id);
CREATE INDEX idx_liberacao_acessos_liberado_em ON public.liberacao_acessos(liberado_em DESC);

ALTER TABLE public.liberacao_acessos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view liberacao_acessos"
ON public.liberacao_acessos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Operators register liberacao_acessos"
ON public.liberacao_acessos FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'operador'::app_role));

CREATE POLICY "Admins delete liberacao_acessos"
ON public.liberacao_acessos FOR DELETE
TO authenticated
USING (has_role(auth.uid(),'admin'::app_role));

-- Audit trigger
CREATE TRIGGER trg_liberacao_acessos_audit
AFTER INSERT OR DELETE ON public.liberacao_acessos
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();