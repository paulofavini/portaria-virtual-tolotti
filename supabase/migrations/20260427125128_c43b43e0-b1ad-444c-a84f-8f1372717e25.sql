
-- 1. Informações operacionais (1:1 com condomínio)
CREATE TABLE public.condominio_info_operacional (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  condominio_id UUID NOT NULL UNIQUE,
  ramal_principal TEXT,
  senha_guarita TEXT,
  senha_portao_terreo TEXT,
  senha_portao_subsolo TEXT,
  senha_bicicletario TEXT,
  senha_academia TEXT,
  senha_clausura TEXT,
  wifi_rede TEXT,
  wifi_senha TEXT,
  ddns TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.condominio_info_operacional ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view info_operacional"
ON public.condominio_info_operacional FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operators manage info_operacional"
ON public.condominio_info_operacional FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

CREATE TRIGGER trg_info_operacional_updated_at
BEFORE UPDATE ON public.condominio_info_operacional
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Histórico de senhas
CREATE TABLE public.condominio_senha_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  condominio_id UUID NOT NULL,
  campo TEXT NOT NULL,
  valor_antigo TEXT,
  valor_novo TEXT,
  alterado_por UUID,
  alterado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_senha_hist_condo ON public.condominio_senha_historico(condominio_id, alterado_em DESC);

ALTER TABLE public.condominio_senha_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view senha_historico"
ON public.condominio_senha_historico FOR SELECT TO authenticated USING (true);

-- Trigger que registra alterações de senha
CREATE OR REPLACE FUNCTION public.log_senha_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  campos TEXT[] := ARRAY['senha_guarita','senha_portao_terreo','senha_portao_subsolo','senha_bicicletario','senha_academia','senha_clausura','wifi_senha'];
  c TEXT;
  old_val TEXT;
  new_val TEXT;
BEGIN
  FOREACH c IN ARRAY campos LOOP
    EXECUTE format('SELECT ($1).%I, ($2).%I', c, c) INTO old_val, new_val USING OLD, NEW;
    IF old_val IS DISTINCT FROM new_val THEN
      INSERT INTO public.condominio_senha_historico (condominio_id, campo, valor_antigo, valor_novo, alterado_por)
      VALUES (NEW.condominio_id, c, old_val, new_val, auth.uid());
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_senha_changes
AFTER UPDATE ON public.condominio_info_operacional
FOR EACH ROW EXECUTE FUNCTION public.log_senha_changes();

-- 3. Contatos úteis
CREATE TABLE public.condominio_contato_util (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  condominio_id UUID NOT NULL,
  tipo TEXT NOT NULL,
  empresa TEXT,
  telefone TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID DEFAULT auth.uid()
);

CREATE INDEX idx_contato_util_condo ON public.condominio_contato_util(condominio_id);

ALTER TABLE public.condominio_contato_util ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view contato_util"
ON public.condominio_contato_util FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operators manage contato_util"
ON public.condominio_contato_util FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

CREATE TRIGGER trg_contato_util_updated_at
BEFORE UPDATE ON public.condominio_contato_util
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Ramais internos
CREATE TABLE public.condominio_ramal_interno (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  condominio_id UUID NOT NULL,
  numero TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID DEFAULT auth.uid()
);

CREATE INDEX idx_ramal_interno_condo ON public.condominio_ramal_interno(condominio_id);

ALTER TABLE public.condominio_ramal_interno ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view ramal_interno"
ON public.condominio_ramal_interno FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operators manage ramal_interno"
ON public.condominio_ramal_interno FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

CREATE TRIGGER trg_ramal_interno_updated_at
BEFORE UPDATE ON public.condominio_ramal_interno
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
