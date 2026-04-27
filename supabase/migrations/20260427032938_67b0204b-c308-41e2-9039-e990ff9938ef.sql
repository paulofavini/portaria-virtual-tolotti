ALTER TABLE public.moradores
  ADD COLUMN IF NOT EXISTS vaga text,
  ADD COLUMN IF NOT EXISTS subsolo text;