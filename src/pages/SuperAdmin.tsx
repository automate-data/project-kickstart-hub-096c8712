import { useState, useEffect } from 'react';
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
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  // Condominium stats
  const { data: condStats, isLoading: statsLoading } = useQuery({
    queryKey: ['sa-cond-stats', condFilter],
    queryFn: async () => {
      let q = supabase.from('condominium_stats' as any).select('*');
      if (condFilter !== 'all') q = q.eq('condominium_id', condFilter);
      const { data } = await q;
      return (data || []) as any[];
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
  const whatsappCost = metrics.whatsappSent * WHATSAPP_COST_PER_MSG;
  const aiCost = metrics.received * AI_COST_PER_CALL;
  const activeCondCount = condStats?.length || 1;
  const cloudCostPerCond = CLOUD_FIXED_MONTHLY / activeCondCount;
  const totalCost = whatsappCost + aiCost + CLOUD_FIXED_MONTHLY;

  // Per-condominium cost breakdown
  const condCosts = (() => {
    if (!logs || !condStats) return {};
    const costs: Record<string, { whatsapp: number; ai: number; cloud: number; total: number }> = {};
    condStats.forEach((s: any) => {
      const condId = s.condominium_id;
      const condLogs = logs.filter((l: any) => l.condominium_id === condId);
      const wa = condLogs.filter((l: any) => l.event_type === 'whatsapp_sent').length * WHATSAPP_COST_PER_MSG;
      const ai = condLogs.filter((l: any) => l.event_type === 'package_received').length * AI_COST_PER_CALL;
      costs[condId] = { whatsapp: wa, ai, cloud: cloudCostPerCond, total: wa + ai + cloudCostPerCond };
    });
    return costs;
  })();

  // Pending packages count (current)
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
            <Button variant="ghost" size="icon" onClick={() => { window.location.href = '/'; }}>
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
            <CostCard icon={<Cloud className="w-5 h-5 text-primary" />} label="Custo Cloud (fixo/mês)" value={CLOUD_FIXED_MONTHLY} detail={`$${cloudCostPerCond.toFixed(2)}/condomínio`} />
            <CostCard icon={<DollarSign className="w-5 h-5 text-destructive" />} label="Custo Total" value={totalCost} detail="WhatsApp + IA + Cloud" highlight />
          </>
        )}
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Tendência de Encomendas</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="received" name="Recebidas" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="pickedUp" name="Retiradas" stroke="hsl(142, 76%, 36%)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Condominium Stats Table */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Visão por Condomínio</CardTitle></CardHeader>
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
                      <TableHead className="text-center">Pendentes</TableHead>
                      <TableHead className="text-center">Retiradas</TableHead>
                      <TableHead className="text-center">WhatsApp</TableHead>
                      <TableHead className="text-center">Erros</TableHead>
                      <TableHead className="text-center">Staff</TableHead>
                      <TableHead className="text-center">Moradores</TableHead>
                      <TableHead className="text-center">💰 Custo Est.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {condStats?.map((s: any) => {
                      const cc = condCosts[s.condominium_id];
                      return (
                        <TableRow key={s.condominium_id}>
                          <TableCell className="font-medium">{s.condominium_name}</TableCell>
                          <TableCell className="text-center">{s.packages_pending}</TableCell>
                          <TableCell className="text-center">{s.packages_picked_up}</TableCell>
                          <TableCell className="text-center">{s.whatsapp_sent_30d}</TableCell>
                          <TableCell className="text-center">
                            {Number(s.errors_30d) > 0 ? (
                              <Badge variant="destructive">{s.errors_30d}</Badge>
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
                {condStats?.map((s: any) => (
                  <Card key={s.condominium_id}>
                    <CardContent className="p-4">
                      <p className="font-semibold mb-2">{s.condominium_name}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Pendentes: <strong>{s.packages_pending}</strong></div>
                        <div>Retiradas: <strong>{s.packages_picked_up}</strong></div>
                        <div>WhatsApp: <strong>{s.whatsapp_sent_30d}</strong></div>
                        <div>Erros: <strong>{s.errors_30d}</strong></div>
                        <div>Staff: <strong>{s.total_staff}</strong></div>
                        <div>Moradores: <strong>{s.total_residents}</strong></div>
                        <div className="col-span-2 text-destructive font-medium">
                          💰 Custo Est.: <strong>${condCosts[s.condominium_id]?.total?.toFixed(2) || '0.00'}</strong>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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
                      const dur = s.logout_at
                        ? Math.floor((new Date(s.logout_at).getTime() - new Date(s.login_at).getTime()) / 1000)
                        : Math.floor((Date.now() - new Date(s.login_at).getTime()) / 1000);
                      return (
                        <TableRow key={s.id}>
                          <TableCell>{getProfileName(s.user_id)}</TableCell>
                          <TableCell>{getCondName(s.condominium_id)}</TableCell>
                          <TableCell className="text-sm">{format(new Date(s.login_at), 'dd/MM HH:mm')}</TableCell>
                          <TableCell className="text-sm">{s.logout_at ? format(new Date(s.logout_at), 'dd/MM HH:mm') : '—'}</TableCell>
                          <TableCell>{formatDuration(dur)}</TableCell>
                          <TableCell>
                            {s.logout_at ? (
                              <Badge variant="secondary">Encerrada</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800 border-green-200" variant="outline">Ativo agora</Badge>
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
                  const dur = s.logout_at
                    ? Math.floor((new Date(s.logout_at).getTime() - new Date(s.login_at).getTime()) / 1000)
                    : Math.floor((Date.now() - new Date(s.login_at).getTime()) / 1000);
                  return (
                    <Card key={s.id}>
                      <CardContent className="p-3 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">{getProfileName(s.user_id)}</span>
                          {s.logout_at ? (
                            <Badge variant="secondary" className="text-xs">Encerrada</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs" variant="outline">Ativo</Badge>
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
