import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, CheckCircle2, Clock, MessageSquare, AlertTriangle, Users, RefreshCw, LogOut, DollarSign, Brain, Cloud } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, format, subDays } from 'date-fns';
// WhatsApp cost: Twilio $0.0050 + Meta Utility BR $0.0068 = $0.0118/msg
import { ptBR } from 'date-fns/locale';

type Period = '1' | '7' | '30' | '90';

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export default function SuperAdmin() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('30');
  const [condFilter, setCondFilter] = useState<string>('all');

  useEffect(() => {
    toast({ title: `Bem-vindo ao painel de controle, ${user?.user_metadata?.full_name || 'Admin'}!` });
  }, []);

  const startDate = subDays(new Date(), parseInt(period)).toISOString();

  // Fetch condominiums for filter
  const { data: condominiums } = useQuery({
    queryKey: ['sa-condominiums'],
    queryFn: async () => {
      const { data } = await supabase.from('condominiums').select('id, name').order('name');
      return data || [];
    },
  });

  // Global metrics from system_logs
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['sa-logs', period, condFilter],
    queryFn: async () => {
      let q = supabase
        .from('system_logs')
        .select('event_type, condominium_id, created_at')
        .gte('created_at', startDate);
      if (condFilter !== 'all') q = q.eq('condominium_id', condFilter);
      const { data } = await q;
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Condominium stats — built from parallel direct queries (avoids slow view)
  const { data: condStats, isLoading: statsLoading } = useQuery({
    queryKey: ['sa-cond-stats', condFilter],
    queryFn: async () => {
      const condQuery = supabase.from('condominiums').select('id, name');
      const { data: conds } = condFilter !== 'all'
        ? await condQuery.eq('id', condFilter)
        : await condQuery.order('name');
      if (!conds?.length) return [] as any[];

      const condIds = conds.map((c: any) => c.id);

      const [pkgRes, resRes, staffRes] = await Promise.all([
        supabase.from('packages').select('condominium_id, status').in('condominium_id', condIds),
        supabase.from('residents').select('condominium_id').in('condominium_id', condIds).is('deleted_at', null),
        supabase.from('user_roles').select('user_id, condominium_id').in('condominium_id', condIds).is('deleted_at', null),
      ]);

      const pkgs = pkgRes.data || [];
      const residentsArr = resRes.data || [];
      const staffArr = staffRes.data || [];

      return conds.map((c: any) => {
        const cp = pkgs.filter((p: any) => p.condominium_id === c.id);
        const uniqueStaff = new Set(staffArr.filter((u: any) => u.condominium_id === c.id).map((u: any) => u.user_id));
        return {
          condominium_id: c.id,
          condominium_name: c.name,
          packages_pending: cp.filter((p: any) => p.status === 'pending').length,
          packages_picked_up: cp.filter((p: any) => p.status === 'picked_up').length,
          total_residents: residentsArr.filter((r: any) => r.condominium_id === c.id).length,
          total_staff: uniqueStaff.size,
        };
      });
    },
    refetchInterval: 60000,
  });

  // Error logs
  const { data: errorLogs, isLoading: errorsLoading } = useQuery({
    queryKey: ['sa-errors', period, condFilter],
    queryFn: async () => {
      let q = supabase
        .from('system_logs')
        .select('*')
        .in('event_type', ['error', 'whatsapp_failed', 'ai_label_failed'])
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })
        .limit(50);
      if (condFilter !== 'all') q = q.eq('condominium_id', condFilter);
      const { data } = await q;
      return data || [];
    },
    refetchInterval: 60000,
  });

  // User sessions
  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['sa-sessions', period, condFilter],
    queryFn: async () => {
      let q = supabase
        .from('user_sessions')
        .select('*')
        .gte('login_at', startDate)
        .order('login_at', { ascending: false })
        .limit(50);
      if (condFilter !== 'all') q = q.eq('condominium_id', condFilter);
      const { data } = await q;
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Profiles for name resolution
  const { data: profiles } = useQuery({
    queryKey: ['sa-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, email');
      return data || [];
    },
  });

  const getProfileName = (userId: string | null) => {
    if (!userId) return '—';
    const p = profiles?.find((pr: any) => pr.id === userId);
    return p ? (p as any).full_name || (p as any).email : userId.slice(0, 8);
  };

  const getCondName = (condId: string | null) => {
    if (!condId) return '—';
    const c = condominiums?.find((co: any) => co.id === condId);
    return c ? (c as any).name : condId.slice(0, 8);
  };

  // Cost constants (fixed rates)
  // WhatsApp: Twilio $0.0050 + Meta Utility BR $0.0068 = $0.0118
  const WHATSAPP_COST_PER_MSG = 0.0118;
  const AI_COST_PER_CALL = 0.0035;
  const CLOUD_FIXED_MONTHLY = 25.0;

  // Compute metrics
  const metrics = {
    received: logs?.filter(l => (l as any).event_type === 'package_received').length || 0,
    pickedUp: logs?.filter(l => (l as any).event_type === 'package_picked_up').length || 0,
    whatsappSent: logs?.filter(l => (l as any).event_type === 'whatsapp_sent').length || 0,
    errors: logs?.filter(l => ['error', 'whatsapp_failed', 'ai_label_failed'].includes((l as any).event_type)).length || 0,
  };

  // Cost calculations
  // Cloud is always shown at full monthly rate ($25/mês fixo) regardless of period filter.
  // Divide cloud by TOTAL real condominium count (not the filtered subset) so per-condo
  // share is stable when toggling filters.
  const totalCondCount = condominiums?.length || 1;
  const cloudCostPerCond = CLOUD_FIXED_MONTHLY / totalCondCount;
  const whatsappCost = metrics.whatsappSent * WHATSAPP_COST_PER_MSG;
  const aiCost = metrics.received * AI_COST_PER_CALL;
  // Custo Total sempre inclui o Cloud cheio ($25/mês fixo) + custos variáveis do período
  const totalCost = whatsappCost + aiCost + CLOUD_FIXED_MONTHLY;

  // Per-condominium breakdown for the SELECTED period (from logs)
  const condPeriodStats = (() => {
    if (!logs || !condStats) return {} as Record<string, { whatsapp: number; received: number; pickedUp: number; errors: number }>;
    const out: Record<string, { whatsapp: number; received: number; pickedUp: number; errors: number }> = {};
    condStats.forEach((s: any) => {
      const condId = s.condominium_id;
      const condLogs = logs.filter((l: any) => l.condominium_id === condId);
      out[condId] = {
        whatsapp: condLogs.filter((l: any) => l.event_type === 'whatsapp_sent').length,
        received: condLogs.filter((l: any) => l.event_type === 'package_received').length,
        pickedUp: condLogs.filter((l: any) => l.event_type === 'package_picked_up').length,
        errors: condLogs.filter((l: any) => ['error', 'whatsapp_failed', 'ai_label_failed'].includes(l.event_type)).length,
      };
    });
    return out;
  })();

  // Per-condominium cost breakdown (uses selected period)
  const condCosts = (() => {
    if (!condStats) return {} as Record<string, { whatsapp: number; ai: number; cloud: number; total: number }>;
    const costs: Record<string, { whatsapp: number; ai: number; cloud: number; total: number }> = {};
    condStats.forEach((s: any) => {
      const ps = condPeriodStats[s.condominium_id] || { whatsapp: 0, received: 0, pickedUp: 0, errors: 0 };
      const wa = ps.whatsapp * WHATSAPP_COST_PER_MSG;
      const ai = ps.received * AI_COST_PER_CALL;
      costs[s.condominium_id] = { whatsapp: wa, ai, cloud: cloudCostPerCond, total: wa + ai + cloudCostPerCond };
    });
    return costs;
  })();

  // Pending packages count (current snapshot — não depende de período)
  const pendingTotal = condStats?.reduce((sum: number, s: any) => sum + (Number(s.packages_pending) || 0), 0) || 0;

  // Active users (unique user_ids with sessions in period)
  const activeUsers = new Set(sessions?.map((s: any) => s.user_id)).size;

  // Chart data: packages per day
  const chartData = (() => {
    if (!logs) return [];
    const days = parseInt(period);
    const map: Record<string, { date: string; received: number; pickedUp: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
      map[d] = { date: format(subDays(new Date(), i), 'dd/MM'), received: 0, pickedUp: 0 };
    }
    logs.forEach((l: any) => {
      const d = format(new Date(l.created_at), 'yyyy-MM-dd');
      if (map[d]) {
        if (l.event_type === 'package_received') map[d].received++;
        if (l.event_type === 'package_picked_up') map[d].pickedUp++;
      }
    });
    return Object.values(map).reverse();
  })();

  const errorBadgeColor = (type: string) => {
    if (type === 'whatsapp_failed') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (type === 'ai_label_failed') return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-destructive/10 text-destructive border-destructive/20';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <span className="font-semibold">⚙️ Super Admin</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="max-w-[200px] truncate">{user?.user_metadata?.full_name || user?.email}</span>
            <Button variant="ghost" size="icon" onClick={async () => { await signOut(); navigate('/auth', { replace: true }); }} title="Sair">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>
      <div className="container py-6 space-y-6 animate-fade-in pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {(['1', '7', '30', '90'] as Period[]).map(p => (
            <Button key={p} size="sm" variant={period === p ? 'default' : 'outline'} onClick={() => setPeriod(p)}>
              {p === '1' ? 'Hoje' : `${p} dias`}
            </Button>
          ))}
          <Select value={condFilter} onValueChange={setCondFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos os condomínios" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os condomínios</SelectItem>
              {condominiums?.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="icon" variant="ghost" onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['sa-logs'] });
            queryClient.invalidateQueries({ queryKey: ['sa-cond-stats'] });
            queryClient.invalidateQueries({ queryKey: ['sa-errors'] });
            queryClient.invalidateQueries({ queryKey: ['sa-sessions'] });
            queryClient.invalidateQueries({ queryKey: ['sa-profiles'] });
            toast({ title: 'Dados atualizados!' });
          }}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {logsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
          ))
        ) : (
          <>
            <KpiCard icon={<Package className="w-5 h-5 text-primary" />} label="Recebidas" value={metrics.received} />
            <KpiCard icon={<CheckCircle2 className="w-5 h-5 text-primary" />} label="Retiradas" value={metrics.pickedUp} />
            <KpiCard icon={<Clock className="w-5 h-5 text-primary" />} label="Aguardando" value={pendingTotal} />
            <KpiCard icon={<MessageSquare className="w-5 h-5 text-primary" />} label="WhatsApp Enviados" value={metrics.whatsappSent} />
            <KpiCard icon={<AlertTriangle className="w-5 h-5 text-destructive" />} label="Erros" value={metrics.errors} />
            <KpiCard icon={<Users className="w-5 h-5 text-primary" />} label="Usuários Ativos" value={activeUsers} />
          </>
        )}
      </div>

      {/* Cost KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {logsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16" /></CardContent></Card>
          ))
        ) : (
          <>
            <CostCard
              icon={<MessageSquare className="w-5 h-5 text-primary" />}
              label="Custo WhatsApp"
              value={whatsappCost}
              detail={`${metrics.whatsappSent} msgs × $${WHATSAPP_COST_PER_MSG}`}
            />
            <CostCard icon={<Brain className="w-5 h-5 text-primary" />} label="Custo IA" value={aiCost} detail={`${metrics.received} chamadas × $${AI_COST_PER_CALL}`} />
            <CostCard icon={<Cloud className="w-5 h-5 text-primary" />} label="Custo Cloud (mês fixo)" value={CLOUD_FIXED_MONTHLY} detail={`$${cloudCostPerCond.toFixed(2)}/condomínio (${totalCondCount} ativos)`} />
            <CostCard icon={<DollarSign className="w-5 h-5 text-destructive" />} label="Custo Total" value={totalCost} detail="WhatsApp + IA + Cloud (mês)" highlight />
          </>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tendência de Encomendas</CardTitle>
            <p className="text-xs text-muted-foreground">Período: {period === '1' ? 'Hoje' : `Últimos ${period} dias`}{condFilter !== 'all' ? ` · ${getCondName(condFilter)}` : ''}</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="received" name="Recebidas" stroke="hsl(var(--primary))" strokeWidth={2} dot />
                  <Line type="monotone" dataKey="pickedUp" name="Retiradas" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Condominium Stats Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Visão por Condomínio</CardTitle>
          <p className="text-xs text-muted-foreground">
            Atividade no período: {period === '1' ? 'Hoje' : `Últimos ${period} dias`} · Pendentes/Staff/Moradores são snapshot atual
          </p>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <Skeleton className="h-32" />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Condomínio</TableHead>
                      <TableHead className="text-center" title="Encomendas atualmente aguardando retirada (snapshot)">Pendentes*</TableHead>
                      <TableHead className="text-center" title="Encomendas recebidas no período">Recebidas</TableHead>
                      <TableHead className="text-center" title="Encomendas retiradas no período">Retiradas</TableHead>
                      <TableHead className="text-center" title="Mensagens WhatsApp enviadas no período">WhatsApp</TableHead>
                      <TableHead className="text-center">Erros</TableHead>
                      <TableHead className="text-center" title="Funcionários ativos (snapshot)">Staff*</TableHead>
                      <TableHead className="text-center" title="Moradores cadastrados (snapshot)">Moradores*</TableHead>
                      <TableHead className="text-center">💰 Custo no período</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {condStats?.map((s: any) => {
                      const cc = condCosts[s.condominium_id];
                      const ps = condPeriodStats[s.condominium_id] || { whatsapp: 0, received: 0, pickedUp: 0, errors: 0 };
                      return (
                        <TableRow key={s.condominium_id}>
                          <TableCell className="font-medium">{s.condominium_name}</TableCell>
                          <TableCell className="text-center">{s.packages_pending}</TableCell>
                          <TableCell className="text-center">{ps.received}</TableCell>
                          <TableCell className="text-center">{ps.pickedUp}</TableCell>
                          <TableCell className="text-center">{ps.whatsapp}</TableCell>
                          <TableCell className="text-center">
                            {ps.errors > 0 ? (
                              <Badge variant="destructive">{ps.errors}</Badge>
                            ) : '0'}
                          </TableCell>
                          <TableCell className="text-center">{s.total_staff}</TableCell>
                          <TableCell className="text-center">{s.total_residents}</TableCell>
                          <TableCell className="text-center font-medium text-destructive">
                            ${cc?.total?.toFixed(2) || '0.00'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {condStats?.map((s: any) => {
                  const ps = condPeriodStats[s.condominium_id] || { whatsapp: 0, received: 0, pickedUp: 0, errors: 0 };
                  return (
                    <Card key={s.condominium_id}>
                      <CardContent className="p-4">
                        <p className="font-semibold mb-2">{s.condominium_name}</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Pendentes*: <strong>{s.packages_pending}</strong></div>
                          <div>Recebidas: <strong>{ps.received}</strong></div>
                          <div>Retiradas: <strong>{ps.pickedUp}</strong></div>
                          <div>WhatsApp: <strong>{ps.whatsapp}</strong></div>
                          <div>Erros: <strong>{ps.errors}</strong></div>
                          <div>Staff*: <strong>{s.total_staff}</strong></div>
                          <div>Moradores*: <strong>{s.total_residents}</strong></div>
                          <div className="col-span-2 text-destructive font-medium">
                            💰 Custo no período: <strong>${condCosts[s.condominium_id]?.total?.toFixed(2) || '0.00'}</strong>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3">* snapshot atual (não filtrado por período)</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Error Logs */}
      <Card className="border-destructive/30">
        <CardHeader><CardTitle className="text-lg">🚨 Logs de Erro</CardTitle></CardHeader>
        <CardContent>
          {errorsLoading ? (
            <Skeleton className="h-32" />
          ) : errorLogs?.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">Nenhum erro no período selecionado 🎉</p>
          ) : (
            <div className="space-y-3">
              {errorLogs?.map((log: any) => (
                <div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-lg border">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                  </span>
                  <Badge className={errorBadgeColor(log.event_type)} variant="outline">
                    {log.event_type.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-sm">{getCondName(log.condominium_id)}</span>
                  <span className="text-sm text-muted-foreground">{getProfileName(log.user_id)}</span>
                  {log.metadata?.error_message && (
                    <span className="text-xs text-destructive truncate max-w-xs">{log.metadata.error_message}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Sessions */}
      <Card>
        <CardHeader><CardTitle className="text-lg">👥 Sessões de Usuários</CardTitle></CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <Skeleton className="h-32" />
          ) : sessions?.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">Nenhuma sessão no período</p>
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Condomínio</TableHead>
                      <TableHead>Login</TableHead>
                      <TableHead>Logout</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions?.map((s: any) => {
                      const endTs = s.logout_at
                        ? new Date(s.logout_at).getTime()
                        : new Date(s.last_seen_at || s.login_at).getTime();
                      const dur = Math.floor((endTs - new Date(s.login_at).getTime()) / 1000);
                      const lastSeen = new Date(s.last_seen_at || s.login_at).getTime();
                      const isActive = !s.logout_at && (Date.now() - lastSeen) < 5 * 60 * 1000;
                      return (
                        <TableRow key={s.id}>
                          <TableCell>{getProfileName(s.user_id)}</TableCell>
                          <TableCell>{getCondName(s.condominium_id)}</TableCell>
                          <TableCell className="text-sm">{format(new Date(s.login_at), 'dd/MM HH:mm')}</TableCell>
                          <TableCell className="text-sm">
                            {s.logout_at
                              ? format(new Date(s.logout_at), 'dd/MM HH:mm')
                              : isActive
                                ? '—'
                                : `${format(new Date(s.last_seen_at || s.login_at), 'dd/MM HH:mm')} (inativo)`}
                          </TableCell>
                          <TableCell>{formatDuration(dur)}</TableCell>
                          <TableCell>
                            {s.logout_at ? (
                              <Badge variant="secondary">Encerrada</Badge>
                            ) : isActive ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200" variant="outline">Ativo agora</Badge>
                            ) : (
                              <Badge variant="secondary">Inativa</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="md:hidden space-y-3">
                {sessions?.map((s: any) => {
                  const endTs = s.logout_at
                    ? new Date(s.logout_at).getTime()
                    : new Date(s.last_seen_at || s.login_at).getTime();
                  const dur = Math.floor((endTs - new Date(s.login_at).getTime()) / 1000);
                  const lastSeen = new Date(s.last_seen_at || s.login_at).getTime();
                  const isActive = !s.logout_at && (Date.now() - lastSeen) < 5 * 60 * 1000;
                  return (
                    <Card key={s.id}>
                      <CardContent className="p-3 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">{getProfileName(s.user_id)}</span>
                          {s.logout_at ? (
                            <Badge variant="secondary" className="text-xs">Encerrada</Badge>
                          ) : isActive ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs" variant="outline">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Inativa</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{getCondName(s.condominium_id)} · {formatDuration(dur)}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col items-center text-center gap-2">
        {icon}
        <span className="text-3xl font-bold">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardContent>
    </Card>
  );
}

function CostCard({ icon, label, value, detail, highlight, badge }: { icon: React.ReactNode; label: string; value: number; detail: string; highlight?: boolean; badge?: string }) {
  return (
    <Card className={highlight ? 'border-destructive/50 bg-destructive/5' : ''}>
      <CardContent className="p-4 flex flex-col items-center text-center gap-1">
        {icon}
        <span className={`text-2xl font-bold ${highlight ? 'text-destructive' : ''}`}>
          ${value.toFixed(2)}
        </span>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <span className="text-[10px] text-muted-foreground">{detail}</span>
        {badge && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${badge === 'API' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            {badge}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
