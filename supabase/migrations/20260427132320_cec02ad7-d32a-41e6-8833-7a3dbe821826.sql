-- =========================================
-- Audit log infrastructure
-- =========================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK (action IN ('create','update','delete')),
  module TEXT NOT NULL,
  record_id TEXT,
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  user_id UUID,
  user_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_module ON public.audit_log (module);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log (user_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view audit_log" ON public.audit_log;
CREATE POLICY "Admins view audit_log"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No INSERT/UPDATE/DELETE policies: only the SECURITY DEFINER trigger writes here.

-- =========================================
-- Generic audit trigger
-- =========================================
CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_email TEXT;
  v_module TEXT := TG_TABLE_NAME;
  v_old JSONB;
  v_new JSONB;
  v_key TEXT;
  v_old_val TEXT;
  v_new_val TEXT;
  v_record_id TEXT;
BEGIN
  BEGIN
    SELECT email INTO v_email FROM public.profiles WHERE id = v_user;
  EXCEPTION WHEN OTHERS THEN
    v_email := NULL;
  END;

  IF (TG_OP = 'INSERT') THEN
    v_new := to_jsonb(NEW);
    v_record_id := COALESCE(v_new->>'id','');
    INSERT INTO public.audit_log(action, module, record_id, field, old_value, new_value, user_id, user_email)
    VALUES ('create', v_module, v_record_id, NULL, NULL, NULL, v_user, v_email);
    RETURN NEW;

  ELSIF (TG_OP = 'UPDATE') THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := COALESCE(v_new->>'id','');
    FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_key IN ('updated_at','created_at') THEN CONTINUE; END IF;
      v_old_val := v_old->>v_key;
      v_new_val := v_new->>v_key;
      IF v_old_val IS DISTINCT FROM v_new_val THEN
        INSERT INTO public.audit_log(action, module, record_id, field, old_value, new_value, user_id, user_email)
        VALUES ('update', v_module, v_record_id, v_key, v_old_val, v_new_val, v_user, v_email);
      END IF;
    END LOOP;
    RETURN NEW;

  ELSIF (TG_OP = 'DELETE') THEN
    v_old := to_jsonb(OLD);
    v_record_id := COALESCE(v_old->>'id','');
    INSERT INTO public.audit_log(action, module, record_id, field, old_value, new_value, user_id, user_email)
    VALUES ('delete', v_module, v_record_id, NULL, NULL, NULL, v_user, v_email);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- =========================================
-- Attach trigger to key tables
-- =========================================
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'condominios','moradores','fornecedores','avisos','eventos','mudancas',
    'ocorrencias','chamados_tecnicos','solicitacoes','user_roles',
    'condominio_info_operacional','condominio_contato_util','condominio_ramal_interno'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I;', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();',
      t, t
    );
  END LOOP;
END $$;