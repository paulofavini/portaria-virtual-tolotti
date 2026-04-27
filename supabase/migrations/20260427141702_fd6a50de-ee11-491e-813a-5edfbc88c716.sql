-- Adiciona FK eventos.morador_id → moradores.id (necessária para embed do PostgREST)
-- Sem essa FK, a query useEventos com `moradores(nome)` falha e a lista fica vazia.
ALTER TABLE public.eventos
  ADD CONSTRAINT eventos_morador_id_fkey
  FOREIGN KEY (morador_id) REFERENCES public.moradores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_eventos_morador_id ON public.eventos(morador_id);
CREATE INDEX IF NOT EXISTS idx_eventos_data ON public.eventos(data);