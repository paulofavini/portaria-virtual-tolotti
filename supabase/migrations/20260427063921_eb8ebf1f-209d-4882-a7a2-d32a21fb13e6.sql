ALTER TABLE public.mudancas ADD COLUMN IF NOT EXISTS morador_id uuid;
CREATE INDEX IF NOT EXISTS idx_mudancas_morador_id ON public.mudancas(morador_id);
CREATE INDEX IF NOT EXISTS idx_mudancas_data ON public.mudancas(data);