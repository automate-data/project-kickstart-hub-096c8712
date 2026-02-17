import { supabase } from '@/integrations/supabase/client';

export type Cliente = { id: string; user_id: string; nome: string; email: string; telefone: string | null; empresa: string | null; endereco: string | null; cidade: string | null; estado: string | null; cep: string | null; observacoes: string | null; criado_em: string; atualizado_em: string; };
export type ClienteInsert = Omit<Cliente, 'id' | 'criado_em' | 'atualizado_em'>;
export type ClienteUpdate = Partial<Omit<Cliente, 'id' | 'user_id' | 'criado_em' | 'atualizado_em'>>;

export type Servico = { id: string; user_id: string; nome: string; descricao: string | null; valor: number; categoria: string | null; ativo: boolean; criado_em: string; atualizado_em: string; };
export type ServicoInsert = Omit<Servico, 'id' | 'criado_em' | 'atualizado_em'>;
export type ServicoUpdate = Partial<Omit<Servico, 'id' | 'user_id' | 'criado_em' | 'atualizado_em'>>;

export type Cobranca = { id: string; user_id: string; cliente_id: string | null; servico_id: string | null; titulo: string; descricao: string | null; valor: number; valor_parcela: number | null; data_vencimento: string; data_pagamento: string | null; status: string; metodo_pagamento: string | null; observacoes: string | null; numero_parcelas: number; parcela_atual: number | null; cobranca_principal_id: string | null; excluido: boolean; excluido_em: string | null; criado_em: string; atualizado_em: string; clientes?: { nome: string; email: string } | null; };
export type CobrancaInsert = Partial<Cobranca>;
export type CobrancaUpdate = Partial<Cobranca>;

export type Boleto = { id: string; user_id: string; cliente_id: string | null; nome_arquivo: string; url_arquivo: string; tamanho_arquivo: number | null; tipo_arquivo: string | null; valor: number | null; data_vencimento: string | null; criado_em: string; };
export type BoletoInsert = Omit<Boleto, 'id' | 'criado_em'>;
export type BoletoUpdate = Partial<BoletoInsert>;

export type ConfiguracaoEmpresa = { id: string; user_id: string; nome_empresa: string | null; email: string | null; telefone: string | null; };
export type CobrancaServico = { id: string; cobranca_id: string; servico_id: string; quantidade: number; valor_unitario: number; valor_total: number; };
export type CobrancaServicoInsert = Omit<CobrancaServico, 'id'>;

const waitForAuth = async (maxAttempts = 10) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw new Error('Erro na verificação de autenticação');
    if (session?.user?.id) return session.user.id;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Usuário não autenticado. Faça login novamente.');
};

export const clientesAPI = {
  async getAll() { const { data, error } = await supabase.from('clientes').select('*').order('criado_em', { ascending: false }); if (error) throw error; return data as Cliente[]; },
  async getById(id: string) { const { data, error } = await supabase.from('clientes').select('*').eq('id', id).single(); if (error) throw error; return data as Cliente; },
  async create(cliente: Omit<ClienteInsert, 'user_id'>) {
    const userId = await waitForAuth();
    const { data, error } = await supabase.from('clientes').insert({ ...cliente, user_id: userId }).select().single();
    if (error) throw error; return data as Cliente;
  },
  async update(id: string, cliente: ClienteUpdate) { const { data, error } = await supabase.from('clientes').update(cliente).eq('id', id).select().single(); if (error) throw error; return data as Cliente; },
  async delete(id: string) { const { error } = await supabase.from('clientes').delete().eq('id', id); if (error) throw error; }
};

export const servicosAPI = {
  async getAll() { const { data, error } = await supabase.from('servicos').select('*').order('criado_em', { ascending: false }); if (error) throw error; return data as Servico[]; },
  async getById(id: string) { const { data, error } = await supabase.from('servicos').select('*').eq('id', id).single(); if (error) throw error; return data as Servico; },
  async create(servico: Omit<ServicoInsert, 'user_id'>) {
    const userId = await waitForAuth();
    const { data, error } = await supabase.from('servicos').insert({ ...servico, user_id: userId }).select().single();
    if (error) throw error; return data as Servico;
  },
  async update(id: string, servico: ServicoUpdate) { const { data, error } = await supabase.from('servicos').update(servico).eq('id', id).select().single(); if (error) throw error; return data as Servico; },
  async delete(id: string) { const { error } = await supabase.from('servicos').delete().eq('id', id); if (error) throw error; }
};

export const cobrancasAPI = {
  async getAll() { const { data, error } = await supabase.from('cobrancas').select('*, clientes:cliente_id (nome, email), servicos:servico_id (nome)').eq('excluido', false).order('criado_em', { ascending: false }); if (error) throw error; return data as Cobranca[]; },
  async getAllDeleted() { const { data, error } = await supabase.from('cobrancas').select('*, clientes:cliente_id (nome, email)').eq('excluido', true).order('excluido_em', { ascending: false }); if (error) throw error; return data as Cobranca[]; },
  async create(cobranca: Omit<CobrancaInsert, 'user_id'>) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('Usuário não autenticado');
    const { data, error } = await supabase.from('cobrancas').insert({ ...cobranca, user_id: session.user.id }).select().single();
    if (error) throw error; return data;
  },
  async update(id: string, cobranca: CobrancaUpdate) { const { data, error } = await supabase.from('cobrancas').update(cobranca).eq('id', id).select().single(); if (error) throw error; return data; },
  async delete(id: string) { const { error } = await supabase.from('cobrancas').delete().eq('id', id); if (error) throw error; },
  async moveToTrash(id: string) { const { error } = await supabase.from('cobrancas').update({ excluido: true, excluido_em: new Date().toISOString() }).eq('id', id); if (error) throw error; },
  async moveMultipleToTrash(ids: string[]) { const { error } = await supabase.from('cobrancas').update({ excluido: true, excluido_em: new Date().toISOString() }).in('id', ids); if (error) throw error; },
  async restore(id: string) { const { error } = await supabase.from('cobrancas').update({ excluido: false, excluido_em: null }).eq('id', id); if (error) throw error; },
  async deletePermanently(id: string) { await supabase.from('cobranca_servicos').delete().eq('cobranca_id', id); const { error } = await supabase.from('cobrancas').delete().eq('id', id); if (error) throw error; },
  async updateMultipleStatus(ids: string[], status: string) { const { error } = await supabase.from('cobrancas').update({ status }).in('id', ids); if (error) throw error; },
  async createWithServicos(cobrancaData: any, servicos: Array<{ servico_id: string; quantidade: number; valor_unitario: number }>, numeroParcelas: number = 1) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('Usuário não autenticado');
    let cobrancaPrincipal;
    if (numeroParcelas === 1) {
      const { data: cobranca, error } = await supabase.from('cobrancas').insert({ ...cobrancaData, user_id: session.user.id, numero_parcelas: 1 }).select().single();
      if (error) throw error;
      cobrancaPrincipal = cobranca;
      const servicosData = servicos.map(s => ({ cobranca_id: cobranca.id, servico_id: s.servico_id, quantidade: s.quantidade, valor_unitario: s.valor_unitario, valor_total: s.quantidade * s.valor_unitario }));
      const { error: sErr } = await supabase.from('cobranca_servicos').insert(servicosData);
      if (sErr) throw sErr;
    } else {
      const valorParcela = Number(cobrancaData.valor) / numeroParcelas;
      const parcelas = [];
      for (let i = 1; i <= numeroParcelas; i++) {
        const dv = new Date(cobrancaData.data_vencimento); dv.setMonth(dv.getMonth() + (i - 1));
        parcelas.push({ user_id: session.user.id, cliente_id: cobrancaData.cliente_id, titulo: `${cobrancaData.titulo} - Parcela ${i}/${numeroParcelas}`, descricao: cobrancaData.descricao, valor: valorParcela, valor_parcela: valorParcela, data_vencimento: dv.toISOString().split('T')[0], status: cobrancaData.status, metodo_pagamento: cobrancaData.metodo_pagamento, observacoes: cobrancaData.observacoes, numero_parcelas: numeroParcelas, parcela_atual: i, cobranca_principal_id: null });
      }
      const { data: parcelasCriadas, error } = await supabase.from('cobrancas').insert(parcelas).select();
      if (error) throw error;
      cobrancaPrincipal = parcelasCriadas![0];
      const servicosData = parcelasCriadas!.flatMap(parcela => servicos.map(s => ({ cobranca_id: parcela.id, servico_id: s.servico_id, quantidade: s.quantidade, valor_unitario: s.valor_unitario / numeroParcelas, valor_total: (s.quantidade * s.valor_unitario) / numeroParcelas })));
      const { error: sErr } = await supabase.from('cobranca_servicos').insert(servicosData);
      if (sErr) throw sErr;
    }
    return cobrancaPrincipal;
  },
};

export const boletosAPI = {
  async getAll() { const { data, error } = await supabase.from('boletos').select('*, clientes:cliente_id (nome, email)').order('criado_em', { ascending: false }); if (error) throw error; return data; },
  async upload(file: File, clienteId: string, valor: number, dataVencimento: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) throw new Error('Usuário não autenticado');
    const fileName = `${session.user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('boletos').upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from('boletos').getPublicUrl(fileName);
    const { data, error } = await supabase.from('boletos').insert({ user_id: session.user.id, cliente_id: clienteId, nome_arquivo: file.name, url_arquivo: publicUrl, tamanho_arquivo: file.size, tipo_arquivo: file.type, valor, data_vencimento: dataVencimento }).select().single();
    if (error) throw error; return data;
  },
  async delete(id: string) { const { error } = await supabase.from('boletos').delete().eq('id', id); if (error) throw error; }
};