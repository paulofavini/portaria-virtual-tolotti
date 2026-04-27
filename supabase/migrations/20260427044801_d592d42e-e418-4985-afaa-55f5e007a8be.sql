-- ============================================
-- MÓDULO 1: ORIENTAÇÕES
-- ============================================

CREATE TYPE public.tipo_orientacao AS ENUM ('informativo', 'alerta', 'urgente');
CREATE TYPE public.origem_orientacao AS ENUM ('interna', 'sindico', 'morador');

CREATE TABLE public.orientacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  tipo public.tipo_orientacao NOT NULL DEFAULT 'informativo',
  origem public.origem_orientacao,
  fixado BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orientacoes ENABLE ROW LEVEL SECURITY;

-- Todos autenticados visualizam
CREATE POLICY "Auth view orientacoes"
ON public.orientacoes FOR SELECT
TO authenticated
USING (true);

-- Admin: tudo
CREATE POLICY "Admins manage orientacoes"
ON public.orientacoes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Operador: insere
CREATE POLICY "Operadores insert orientacoes"
ON public.orientacoes FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'operador')
  AND created_by = auth.uid()
);

-- Operador: edita as próprias
CREATE POLICY "Operadores update own orientacoes"
ON public.orientacoes FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'operador')
  AND created_by = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'operador')
  AND created_by = auth.uid()
);

-- Operador: exclui as próprias
CREATE POLICY "Operadores delete own orientacoes"
ON public.orientacoes FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'operador')
  AND created_by = auth.uid()
);

-- ============================================
-- MÓDULO 2: SOLICITAÇÕES
-- ============================================

CREATE TYPE public.tipo_solicitacao AS ENUM ('tag', 'controle', 'imagens', 'acesso', 'outros');
CREATE TYPE public.status_solicitacao AS ENUM ('pendente', 'em_andamento', 'concluido', 'cancelado');

CREATE TABLE public.solicitacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  unidade_id UUID REFERENCES public.unidades(id) ON DELETE SET NULL,
  morador_nome TEXT,
  tipo public.tipo_solicitacao NOT NULL,
  descricao TEXT NOT NULL,
  status public.status_solicitacao NOT NULL DEFAULT 'pendente',
  pago BOOLEAN NOT NULL DEFAULT false,
  valor NUMERIC(10,2),
  data_solicitacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_conclusao TIMESTAMPTZ,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;

-- Todos autenticados visualizam
CREATE POLICY "Auth view solicitacoes"
ON public.solicitacoes FOR SELECT
TO authenticated
USING (true);

-- Admin/Operador gerenciam
CREATE POLICY "Operators manage solicitacoes"
ON public.solicitacoes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

-- Apenas admin pode excluir (sobrepõe via política DELETE específica)
CREATE POLICY "Admins delete solicitacoes"
ON public.solicitacoes FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger: auto-set data_conclusao quando status = concluido
CREATE OR REPLACE FUNCTION public.set_solicitacao_conclusao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'concluido' AND (OLD.status IS DISTINCT FROM 'concluido' OR NEW.data_conclusao IS NULL) THEN
    NEW.data_conclusao := now();
  ELSIF NEW.status <> 'concluido' THEN
    NEW.data_conclusao := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_solicitacoes_conclusao
BEFORE INSERT OR UPDATE ON public.solicitacoes
FOR EACH ROW EXECUTE FUNCTION public.set_solicitacao_conclusao();

CREATE INDEX idx_orientacoes_ativo_fixado ON public.orientacoes(ativo, fixado, created_at DESC);
CREATE INDEX idx_solicitacoes_status ON public.solicitacoes(status, created_at DESC);
CREATE INDEX idx_solicitacoes_condominio ON public.solicitacoes(condominio_id);