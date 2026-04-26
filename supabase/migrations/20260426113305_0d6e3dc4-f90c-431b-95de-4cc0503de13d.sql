-- Create public storage bucket for occurrence images
INSERT INTO storage.buckets (id, name, public)
VALUES ('ocorrencias', 'ocorrencias', true)
ON CONFLICT (id) DO NOTHING;

-- Public read of ocorrencias images
CREATE POLICY "Public read ocorrencias images"
ON storage.objects FOR SELECT
USING (bucket_id = 'ocorrencias');

-- Authenticated operators/admins can upload
CREATE POLICY "Operators upload ocorrencias images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ocorrencias'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operador'::app_role))
);

-- Authenticated operators/admins can update/delete their bucket files
CREATE POLICY "Operators update ocorrencias images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ocorrencias'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operador'::app_role))
);

CREATE POLICY "Operators delete ocorrencias images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ocorrencias'
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'operador'::app_role))
);

-- Allow admins to delete profiles (so admin user delete cascades cleanly)
CREATE POLICY "Admins delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));