
-- Eventos: evolução do schema
ALTER TABLE public.eventos
  ALTER COLUMN unidade_id DROP NOT NULL,
  ALTER COLUMN descricao DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS titulo text,
  ADD COLUMN IF NOT EXISTS morador_id uuid,
  ADD COLUMN IF NOT EXISTS horario time,
  ADD COLUMN IF NOT EXISTS local text,
  ADD COLUMN IF NOT EXISTS observacoes text;

-- created_by automático via auth.uid()
ALTER TABLE public.eventos
  ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Tabela de convidados
CREATE TABLE IF NOT EXISTS public.evento_convidados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  documento text,
  presente boolean NOT NULL DEFAULT false,
  horario_checkin timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_evento_convidados_evento ON public.evento_convidados(evento_id);

ALTER TABLE public.evento_convidados ENABLE ROW LEVEL SECURITY;

-- RLS: leitura para todos autenticados, escrita para admin/operador
DROP POLICY IF EXISTS "Auth view evento_convidados" ON public.evento_convidados;
CREATE POLICY "Auth view evento_convidados" ON public.evento_convidados
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Operators manage evento_convidados" ON public.evento_convidados;
CREATE POLICY "Operators manage evento_convidados" ON public.evento_convidados
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

-- Trigger para preencher horario_checkin automaticamente quando presente vira true
CREATE OR REPLACE FUNCTION public.set_convidado_checkin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.presente = true AND (OLD.presente IS DISTINCT FROM true OR NEW.horario_checkin IS NULL) THEN
    NEW.horario_checkin := now();
  ELSIF NEW.presente = false THEN
    NEW.horario_checkin := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_convidado_checkin_ins ON public.evento_convidados;
CREATE TRIGGER trg_convidado_checkin_ins
  BEFORE INSERT ON public.evento_convidados
  FOR EACH ROW
  EXECUTE FUNCTION public.set_convidado_checkin();

DROP TRIGGER IF EXISTS trg_convidado_checkin_upd ON public.evento_convidados;
CREATE TRIGGER trg_convidado_checkin_upd
  BEFORE UPDATE OF presente ON public.evento_convidados
  FOR EACH ROW
  EXECUTE FUNCTION public.set_convidado_checkin();
