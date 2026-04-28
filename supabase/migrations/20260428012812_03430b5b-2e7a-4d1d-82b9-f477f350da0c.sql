-- Tabela arquivos
CREATE TABLE public.arquivos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  condominio_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL,
  url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  tipo TEXT,
  tamanho BIGINT,
  criado_por UUID,
  criado_por_nome TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  deletado_em TIMESTAMPTZ,
  deletado_por UUID,
  deletado_por_nome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_arquivos_condominio ON public.arquivos(condominio_id) WHERE ativo = true;

ALTER TABLE public.arquivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view arquivos"
  ON public.arquivos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators manage arquivos"
  ON public.arquivos FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

CREATE TRIGGER arquivos_updated_at
  BEFORE UPDATE ON public.arquivos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tabela arquivo_logs
CREATE TABLE public.arquivo_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  arquivo_id UUID NOT NULL,
  acao TEXT NOT NULL,
  usuario_id UUID,
  nome_usuario TEXT,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_arquivo_logs_arquivo ON public.arquivo_logs(arquivo_id);

ALTER TABLE public.arquivo_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view arquivo_logs"
  ON public.arquivo_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators insert arquivo_logs"
  ON public.arquivo_logs FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role));

-- Storage bucket (privado, acesso via URL assinada)
INSERT INTO storage.buckets (id, name, public)
VALUES ('condominio-arquivos', 'condominio-arquivos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth view condominio-arquivos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'condominio-arquivos');

CREATE POLICY "Operators upload condominio-arquivos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'condominio-arquivos'
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
  );

CREATE POLICY "Operators delete condominio-arquivos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'condominio-arquivos'
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
  );
