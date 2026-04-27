-- Permitir admin + operador gerenciar dados operacionais

DROP POLICY IF EXISTS "Admins manage moradores" ON public.moradores;
CREATE POLICY "Operators manage moradores"
ON public.moradores
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

DROP POLICY IF EXISTS "Admins manage unidades" ON public.unidades;
CREATE POLICY "Operators manage unidades"
ON public.unidades
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

DROP POLICY IF EXISTS "Admins manage blocos" ON public.blocos;
CREATE POLICY "Operators manage blocos"
ON public.blocos
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

DROP POLICY IF EXISTS "Admins manage veiculos" ON public.veiculos;
CREATE POLICY "Operators manage veiculos"
ON public.veiculos
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));