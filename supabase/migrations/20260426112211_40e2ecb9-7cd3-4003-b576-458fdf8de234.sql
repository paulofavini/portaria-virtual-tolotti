
-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'operador', 'sindico');
CREATE TYPE public.prioridade_aviso AS ENUM ('normal', 'urgente');
CREATE TYPE public.tipo_mudanca AS ENUM ('entrada', 'saida');
CREATE TYPE public.tipo_chamado AS ENUM ('manutencao', 'ti');
CREATE TYPE public.status_chamado AS ENUM ('pendente', 'em_andamento', 'concluido');

-- 2. PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. CONDOMINIOS
CREATE TABLE public.condominios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  sindico_nome TEXT,
  sindico_telefone TEXT,
  subsindico_nome TEXT,
  subsindico_telefone TEXT,
  conselheiros JSONB DEFAULT '[]'::jsonb,
  zelador_nome TEXT,
  zelador_telefone TEXT,
  limpeza_nome TEXT,
  limpeza_telefone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.condominios ENABLE ROW LEVEL SECURITY;

-- 6. BLOCOS
CREATE TABLE public.blocos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blocos ENABLE ROW LEVEL SECURITY;

-- 7. UNIDADES
CREATE TABLE public.unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bloco_id UUID NOT NULL REFERENCES public.blocos(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;

-- 8. MORADORES
CREATE TABLE public.moradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.moradores ENABLE ROW LEVEL SECURITY;

-- 9. VEICULOS
CREATE TABLE public.veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  morador_id UUID NOT NULL REFERENCES public.moradores(id) ON DELETE CASCADE,
  placa TEXT NOT NULL,
  modelo TEXT,
  cor TEXT,
  vaga TEXT,
  subsolo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;

-- 10. FORNECEDORES
CREATE TABLE public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT,
  contato_nome TEXT,
  numero_cliente TEXT,
  numero_cadastro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

-- 11. AVISOS
CREATE TABLE public.avisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  unidade_id UUID REFERENCES public.unidades(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  data DATE NOT NULL,
  prioridade prioridade_aviso NOT NULL DEFAULT 'normal',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;

-- 12. EVENTOS
CREATE TABLE public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

-- 13. MUDANCAS
CREATE TABLE public.mudancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  tipo tipo_mudanca NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mudancas ENABLE ROW LEVEL SECURITY;

-- 14. OCORRENCIAS
CREATE TABLE public.ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  unidade_id UUID REFERENCES public.unidades(id) ON DELETE SET NULL,
  morador_id UUID REFERENCES public.moradores(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  imagem_url TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;

-- 15. CHAMADOS TECNICOS
CREATE TABLE public.chamados_tecnicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condominio_id UUID NOT NULL REFERENCES public.condominios(id) ON DELETE CASCADE,
  tipo tipo_chamado NOT NULL,
  categoria TEXT NOT NULL,
  descricao TEXT NOT NULL,
  status status_chamado NOT NULL DEFAULT 'pendente',
  data_abertura TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_conclusao TIMESTAMPTZ,
  responsavel TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chamados_tecnicos ENABLE ROW LEVEL SECURITY;

-- 16. RLS POLICIES

-- profiles
CREATE POLICY "Auth users view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Helper macro: read for all auth, write for admin/operador (cadastros estruturais só admin)
-- condominios, blocos, unidades, fornecedores: SELECT all auth, mutation only admin
CREATE POLICY "Auth view condominios" ON public.condominios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage condominios" ON public.condominios FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Auth view blocos" ON public.blocos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage blocos" ON public.blocos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Auth view unidades" ON public.unidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage unidades" ON public.unidades FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Auth view fornecedores" ON public.fornecedores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage fornecedores" ON public.fornecedores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- moradores e veiculos: admin gerencia
CREATE POLICY "Auth view moradores" ON public.moradores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage moradores" ON public.moradores FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Auth view veiculos" ON public.veiculos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage veiculos" ON public.veiculos FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Operacionais (avisos, eventos, mudancas, ocorrencias, chamados): admin + operador podem gerenciar
CREATE POLICY "Auth view avisos" ON public.avisos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operators manage avisos" ON public.avisos FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

CREATE POLICY "Auth view eventos" ON public.eventos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operators manage eventos" ON public.eventos FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

CREATE POLICY "Auth view mudancas" ON public.mudancas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operators manage mudancas" ON public.mudancas FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

CREATE POLICY "Auth view ocorrencias" ON public.ocorrencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operators manage ocorrencias" ON public.ocorrencias FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

CREATE POLICY "Auth view chamados" ON public.chamados_tecnicos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Operators manage chamados" ON public.chamados_tecnicos FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'operador'));

-- 17. Trigger: criar profile automático ao criar user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.email),
    NEW.email
  );
  -- Por padrão, novo usuário recebe papel de operador (admin atribui depois)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operador');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 18. updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_condominios_updated BEFORE UPDATE ON public.condominios FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_moradores_updated BEFORE UPDATE ON public.moradores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_fornecedores_updated BEFORE UPDATE ON public.fornecedores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_chamados_updated BEFORE UPDATE ON public.chamados_tecnicos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes for performance
CREATE INDEX idx_blocos_condominio ON public.blocos(condominio_id);
CREATE INDEX idx_unidades_bloco ON public.unidades(bloco_id);
CREATE INDEX idx_moradores_unidade ON public.moradores(unidade_id);
CREATE INDEX idx_veiculos_morador ON public.veiculos(morador_id);
CREATE INDEX idx_avisos_data ON public.avisos(data);
CREATE INDEX idx_eventos_data ON public.eventos(data);
CREATE INDEX idx_mudancas_data ON public.mudancas(data);
CREATE INDEX idx_ocorrencias_data ON public.ocorrencias(data_hora);
CREATE INDEX idx_chamados_status ON public.chamados_tecnicos(status);
