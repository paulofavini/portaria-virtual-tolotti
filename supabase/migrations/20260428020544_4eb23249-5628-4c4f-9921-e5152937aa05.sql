
-- MORADORES: write restricted to admin only
DROP POLICY IF EXISTS "Operators manage moradores" ON public.moradores;
CREATE POLICY "Admins manage moradores" ON public.moradores
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- VEICULOS: admin only
DROP POLICY IF EXISTS "Operators manage veiculos" ON public.veiculos;
CREATE POLICY "Admins manage veiculos" ON public.veiculos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- UNIDADES: admin only
DROP POLICY IF EXISTS "Operators manage unidades" ON public.unidades;
CREATE POLICY "Admins manage unidades" ON public.unidades
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- BLOCOS: admin only
DROP POLICY IF EXISTS "Operators manage blocos" ON public.blocos;
CREATE POLICY "Admins manage blocos" ON public.blocos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- CONDOMINIO INFO OPERACIONAL: admin only (structural/sensitive data)
DROP POLICY IF EXISTS "Operators manage info_operacional" ON public.condominio_info_operacional;
CREATE POLICY "Admins manage info_operacional" ON public.condominio_info_operacional
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- CONDOMINIO CONTATO UTIL: admin only
DROP POLICY IF EXISTS "Operators manage contato_util" ON public.condominio_contato_util;
CREATE POLICY "Admins manage contato_util" ON public.condominio_contato_util
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- CONDOMINIO RAMAL INTERNO: admin only
DROP POLICY IF EXISTS "Operators manage ramal_interno" ON public.condominio_ramal_interno;
CREATE POLICY "Admins manage ramal_interno" ON public.condominio_ramal_interno
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ARQUIVOS: split ALL policy — operadores can insert/update; only admin can delete
DROP POLICY IF EXISTS "Operators manage arquivos" ON public.arquivos;

CREATE POLICY "Operators insert arquivos" ON public.arquivos
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

CREATE POLICY "Operators update arquivos" ON public.arquivos
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

CREATE POLICY "Admins delete arquivos" ON public.arquivos
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
