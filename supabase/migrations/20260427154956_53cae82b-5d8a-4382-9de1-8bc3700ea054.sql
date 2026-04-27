-- Etapa 1: apenas adicionar novos valores ao enum (precisa commit antes de usar)
ALTER TYPE public.status_chamado ADD VALUE IF NOT EXISTS 'aberto';
ALTER TYPE public.status_chamado ADD VALUE IF NOT EXISTS 'aguardando_terceiro';
ALTER TYPE public.status_chamado ADD VALUE IF NOT EXISTS 'resolvido';
ALTER TYPE public.status_chamado ADD VALUE IF NOT EXISTS 'cancelado';