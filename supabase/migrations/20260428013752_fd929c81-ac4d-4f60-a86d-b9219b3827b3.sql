
CREATE TABLE IF NOT EXISTS public.usuarios_condominios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  condominio_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, condominio_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_condominios_usuario ON public.usuarios_condominios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_condominios_condominio ON public.usuarios_condominios(condominio_id);

ALTER TABLE public.usuarios_condominios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage usuarios_condominios"
  ON public.usuarios_condominios
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view own usuarios_condominios"
  ON public.usuarios_condominios
  FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Helper para filtros server-side
CREATE OR REPLACE FUNCTION public.user_has_condominio(_user_id uuid, _condominio_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios_condominios
    WHERE usuario_id = _user_id AND condominio_id = _condominio_id
  )
$$;
