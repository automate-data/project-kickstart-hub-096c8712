import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
interface DashboardStats { clientesAtivos: number; cobrancasPendentes: number; cobrancasPagas: number; valorPendente: number; valorPago: number; receitaMes: number; }
export const useDashboardStats = () => useQuery({
  queryKey: ['dashboard-stats'],
  queryFn: async (): Promise<DashboardStats> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");
    const { count: clientesCount } = await supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    const { data: cobrancasData } = await supabase.from('cobrancas').select('status, valor').eq('user_id', user.id);
    const cobrancasPendentes = cobrancasData?.filter(c => c.status === 'pendente').length || 0;
    const cobrancasPagas = cobrancasData?.filter(c => c.status === 'pago').length || 0;
    const valorPendente = cobrancasData?.filter(c => c.status === 'pendente').reduce((s, c) => s + Number(c.valor || 0), 0) || 0;
    const valorPago = cobrancasData?.filter(c => c.status === 'pago').reduce((s, c) => s + Number(c.valor || 0), 0) || 0;
    return { clientesAtivos: clientesCount || 0, cobrancasPendentes, cobrancasPagas, valorPendente, valorPago, receitaMes: valorPago };
  },
  refetchInterval: 30000,
});