
-- Tabela de perfis de usuário
CREATE TABLE public.perfis (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  nome TEXT,
  empresa TEXT,
  telefone TEXT,
  avatar_url TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.perfis FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON public.perfis FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Usuários podem inserir seu próprio perfil" ON public.perfis FOR INSERT WITH CHECK (auth.uid() = id);

-- Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfis (id, email, nome, empresa, telefone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'company', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tabela de clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  empresa TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  observacoes TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus clientes" ON public.clientes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar clientes" ON public.clientes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus clientes" ON public.clientes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar seus clientes" ON public.clientes FOR DELETE USING (auth.uid() = user_id);

-- Tabela de serviços
CREATE TABLE public.servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  categoria TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus serviços" ON public.servicos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar serviços" ON public.servicos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus serviços" ON public.servicos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar seus serviços" ON public.servicos FOR DELETE USING (auth.uid() = user_id);

-- Tabela de cobranças
CREATE TABLE public.cobrancas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id),
  servico_id UUID REFERENCES public.servicos(id),
  titulo TEXT NOT NULL,
  descricao TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  valor_parcela NUMERIC,
  data_vencimento DATE NOT NULL,
  data_pagamento TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pendente',
  metodo_pagamento TEXT,
  observacoes TEXT,
  numero_parcelas INTEGER NOT NULL DEFAULT 1,
  parcela_atual INTEGER,
  cobranca_principal_id UUID REFERENCES public.cobrancas(id),
  excluido BOOLEAN NOT NULL DEFAULT false,
  excluido_em TIMESTAMP WITH TIME ZONE,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas cobranças" ON public.cobrancas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar cobranças" ON public.cobrancas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar suas cobranças" ON public.cobrancas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar suas cobranças" ON public.cobrancas FOR DELETE USING (auth.uid() = user_id);

-- Tabela de relação cobrança-serviços
CREATE TABLE public.cobranca_servicos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cobranca_id UUID NOT NULL REFERENCES public.cobrancas(id) ON DELETE CASCADE,
  servico_id UUID NOT NULL REFERENCES public.servicos(id),
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cobranca_servicos ENABLE ROW LEVEL SECURITY;

-- RLS via join com cobrancas
CREATE OR REPLACE FUNCTION public.get_cobranca_user_id(cobranca_uuid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.cobrancas WHERE id = cobranca_uuid
$$;

CREATE POLICY "Usuários podem ver serviços de suas cobranças" ON public.cobranca_servicos FOR SELECT USING (public.get_cobranca_user_id(cobranca_id) = auth.uid());
CREATE POLICY "Usuários podem criar serviços em suas cobranças" ON public.cobranca_servicos FOR INSERT WITH CHECK (public.get_cobranca_user_id(cobranca_id) = auth.uid());
CREATE POLICY "Usuários podem deletar serviços de suas cobranças" ON public.cobranca_servicos FOR DELETE USING (public.get_cobranca_user_id(cobranca_id) = auth.uid());

-- Tabela de boletos
CREATE TABLE public.boletos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id),
  nome_arquivo TEXT NOT NULL,
  url_arquivo TEXT NOT NULL,
  tamanho_arquivo BIGINT,
  tipo_arquivo TEXT,
  valor NUMERIC,
  data_vencimento DATE,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus boletos" ON public.boletos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar boletos" ON public.boletos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar seus boletos" ON public.boletos FOR DELETE USING (auth.uid() = user_id);

-- Tabela de configurações da empresa
CREATE TABLE public.configuracoes_empresa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  nome_empresa TEXT,
  email TEXT,
  telefone TEXT,
  whatsapp_token TEXT,
  notificacoes BOOLEAN DEFAULT true,
  lembretes_automaticos BOOLEAN DEFAULT true,
  dias_lembrete INTEGER DEFAULT 3,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas configurações" ON public.configuracoes_empresa FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem criar suas configurações" ON public.configuracoes_empresa FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar suas configurações" ON public.configuracoes_empresa FOR UPDATE USING (auth.uid() = user_id);

-- Storage bucket para boletos
INSERT INTO storage.buckets (id, name, public) VALUES ('boletos', 'boletos', true);

CREATE POLICY "Usuários podem ver seus boletos" ON storage.objects FOR SELECT USING (bucket_id = 'boletos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Usuários podem fazer upload de boletos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'boletos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Usuários podem deletar seus boletos" ON storage.objects FOR DELETE USING (bucket_id = 'boletos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Trigger para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_perfis_updated_at BEFORE UPDATE ON public.perfis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_servicos_updated_at BEFORE UPDATE ON public.servicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cobrancas_updated_at BEFORE UPDATE ON public.cobrancas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_configuracoes_updated_at BEFORE UPDATE ON public.configuracoes_empresa FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
