DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mudancas_morador_id_fkey') THEN
    ALTER TABLE public.mudancas
      ADD CONSTRAINT mudancas_morador_id_fkey
      FOREIGN KEY (morador_id) REFERENCES public.moradores(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mudancas_unidade_id_fkey') THEN
    ALTER TABLE public.mudancas
      ADD CONSTRAINT mudancas_unidade_id_fkey
      FOREIGN KEY (unidade_id) REFERENCES public.unidades(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mudancas_condominio_id_fkey') THEN
    ALTER TABLE public.mudancas
      ADD CONSTRAINT mudancas_condominio_id_fkey
      FOREIGN KEY (condominio_id) REFERENCES public.condominios(id) ON DELETE CASCADE;
  END IF;
END $$;