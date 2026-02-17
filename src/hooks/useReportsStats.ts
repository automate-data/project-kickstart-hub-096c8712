import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
export const useReportsStats = () => useQuery({
  queryKey: ['reportsStats'],
  queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');
    const { count: totalClientes } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    const { data: cobrancas } = await supabase.from('cobrancas').select('valor, status, data_pagamento').eq('user_id', user.id);
    const totalRevenue = cobrancas?.filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.valor), 0) || 0;
    const pendingAmount = cobrancas?.filter(c => c.status === 'pendente').reduce((s, c) => s + Number(c.valor), 0) || 0;
    const totalCobrancas = cobrancas?.length || 0;
    const cobrancasPagas = cobrancas?.filter(c => c.status === 'pago').length || 0;
    const conversionRate = totalCobrancas > 0 ? Math.round((cobrancasPagas / totalCobrancas) * 100) : 0;
    return { totalRevenue, pendingAmount, paidAmount: totalRevenue, totalClientes: totalClientes || 0, servicesCompleted: cobrancasPagas, messagesSent: 0, conversionRate, monthlyData: [] };
  },
  refetchInterval: 30000,
});