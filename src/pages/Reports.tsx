import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCondominium } from '@/hooks/useCondominium';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, PackageCheck, Clock, Truck, Download, Loader2, AlertTriangle } from 'lucide-react';
import { format, subDays, differenceInHours, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type PeriodDays = '7' | '30' | '90';

const periodLabels: Record<PeriodDays, string> = {
  '7': 'Últimos 7 dias',
  '30': 'Últimos 30 dias',
  '90': 'Últimos 90 dias',
};

// ─── CSV helper ───
function downloadCSV(headers: string[], rows: string[][], filename: string) {
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Period filter component ───
function PeriodFilter({ period, setPeriod, onExport, disableExport }: {
  period: PeriodDays; setPeriod: (v: PeriodDays) => void;
  onExport?: () => void; disableExport?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Select value={period} onValueChange={(v) => setPeriod(v as PeriodDays)}>
        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="7">{periodLabels['7']}</SelectItem>
          <SelectItem value="30">{periodLabels['30']}</SelectItem>
          <SelectItem value="90">{periodLabels['90']}</SelectItem>
        </SelectContent>
      </Select>
      {onExport && (
        <Button variant="outline" size="sm" onClick={onExport} disabled={disableExport} className="gap-2">
          <Download className="w-4 h-4" />Exportar CSV
        </Button>
      )}
    </div>
  );
}

// ════════════════════════════════════════
//  ADMIN REPORTS
// ════════════════════════════════════════
function AdminReports({ condominiumId, period, startDate }: { condominiumId: string; period: PeriodDays; startDate: string }) {
  // Fetch all packages in period
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['admin-reports-packages', condominiumId, period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*, resident:residents(full_name, block, apartment, condominium_id)')
        .eq('condominium_id', condominiumId)
        .gte('received_at', startDate)
        .order('received_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch locations (towers)
  const { data: towers = [] } = useQuery({
    queryKey: ['admin-reports-towers', condominiumId],
    queryFn: async () => {
      const { data } = await supabase
        .from('locations')
        .select('id, name')
        .eq('condominium_id', condominiumId)
        .eq('type', 'tower');
      return data || [];
    },
  });

  // Fetch package_events for tower doorman pickups
  const { data: transferEvents = [] } = useQuery({
    queryKey: ['admin-reports-transfers', condominiumId, period],
    queryFn: async () => {
      if (towers.length === 0) return [];
      const towerIds = towers.map(t => t.id);
      const { data } = await supabase
        .from('package_events')
        .select('transferred_by, to_location_id, created_at')
        .in('to_location_id', towerIds)
        .not('transferred_by', 'is', null)
        .gte('created_at', startDate);
      return data || [];
    },
    enabled: towers.length > 0,
  });

  // Fetch profiles for transferred_by
  const transferUserIds = useMemo(() => [...new Set(transferEvents.map(e => e.transferred_by).filter(Boolean))], [transferEvents]);
  const { data: transferProfiles = [] } = useQuery({
    queryKey: ['admin-reports-transfer-profiles', transferUserIds],
    queryFn: async () => {
      if (transferUserIds.length === 0) return [];
      const { data } = await supabase.from('profiles').select('id, full_name').in('id', transferUserIds);
      return data || [];
    },
    enabled: transferUserIds.length > 0,
  });

  // ─── 1. Volume by week chart ───
  const volumeChartData = useMemo(() => {
    const weeks = new Map<string, number>();
    packages.forEach(p => {
      const weekStart = startOfWeek(new Date(p.received_at), { weekStartsOn: 1 });
      const key = format(weekStart, 'dd/MM');
      weeks.set(key, (weeks.get(key) || 0) + 1);
    });
    return Array.from(weeks.entries()).map(([name, total]) => ({ name, total }));
  }, [packages]);

  // ─── 2. Pickups by tower doorman ───
  const towerMap = useMemo(() => new Map(towers.map(t => [t.id, t.name])), [towers]);
  const profileMap = useMemo(() => new Map(transferProfiles.map(p => [p.id, p.full_name])), [transferProfiles]);

  const doormanPickups = useMemo(() => {
    const map = new Map<string, { name: string; tower: string; count: number; lastAt: string }>();
    transferEvents.forEach(ev => {
      const key = `${ev.transferred_by}-${ev.to_location_id}`;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        if (ev.created_at > existing.lastAt) existing.lastAt = ev.created_at;
      } else {
        map.set(key, {
          name: profileMap.get(ev.transferred_by!) || 'Desconhecido',
          tower: towerMap.get(ev.to_location_id!) || '—',
          count: 1,
          lastAt: ev.created_at || '',
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [transferEvents, profileMap, towerMap]);

  // ─── 3. Avg time per tower ───
  const avgTimePerTower = useMemo(() => {
    const pickedUp = packages.filter(p => p.status === 'picked_up' && p.picked_up_at && p.current_location_id);
    const groups = new Map<string, { totalH: number; count: number }>();
    pickedUp.forEach(p => {
      const h = differenceInHours(new Date(p.picked_up_at!), new Date(p.received_at));
      const existing = groups.get(p.current_location_id!);
      if (existing) { existing.totalH += h; existing.count++; }
      else groups.set(p.current_location_id!, { totalH: h, count: 1 });
    });
    return Array.from(groups.entries())
      .filter(([id]) => towerMap.has(id))
      .map(([id, { totalH, count }]) => ({
        tower: towerMap.get(id) || '—',
        avgHours: Math.round(totalH / count),
        total: count,
      }));
  }, [packages, towerMap]);

  // ─── 4. Pending per tower ───
  const { data: allPending = [] } = useQuery({
    queryKey: ['admin-reports-pending-towers', condominiumId],
    queryFn: async () => {
      const { data } = await supabase
        .from('packages')
        .select('id, current_location_id, received_at')
        .eq('condominium_id', condominiumId)
        .eq('status', 'pending');
      return data || [];
    },
  });

  const pendingPerTower = useMemo(() => {
    const groups = new Map<string, { count: number; hasOld: boolean }>();
    const now = new Date();
    allPending.forEach(p => {
      if (!p.current_location_id || !towerMap.has(p.current_location_id)) return;
      const existing = groups.get(p.current_location_id) || { count: 0, hasOld: false };
      existing.count++;
      if (differenceInHours(now, new Date(p.received_at)) > 48) existing.hasOld = true;
      groups.set(p.current_location_id, existing);
    });
    return Array.from(groups.entries()).map(([id, v]) => ({
      tower: towerMap.get(id) || '—',
      count: v.count,
      hasOld: v.hasOld,
    }));
  }, [allPending, towerMap]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Volume chart */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Volume por Período</CardTitle></CardHeader>
        <CardContent>
          {volumeChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma encomenda no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={volumeChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Bar dataKey="total" name="Encomendas" className="fill-primary" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Pickups by tower doorman */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Retiradas por Porteiro de Torre</CardTitle></CardHeader>
        <CardContent>
          {doormanPickups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sem dados no período</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Porteiro</TableHead>
                  <TableHead>Torre</TableHead>
                  <TableHead className="text-right">Retiradas</TableHead>
                  <TableHead className="text-right">Última retirada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doormanPickups.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell>{d.name}</TableCell>
                    <TableCell>{d.tower}</TableCell>
                    <TableCell className="text-right font-medium">{d.count}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {d.lastAt ? format(new Date(d.lastAt), 'dd/MM HH:mm') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Avg time per tower */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Tempo Médio de Permanência por Torre</CardTitle></CardHeader>
        <CardContent>
          {avgTimePerTower.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sem dados no período</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Torre</TableHead>
                  <TableHead className="text-right">Tempo médio (horas)</TableHead>
                  <TableHead className="text-right">Total de encomendas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {avgTimePerTower.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell>{t.tower}</TableCell>
                    <TableCell className="text-right font-medium">{t.avgHours}h</TableCell>
                    <TableCell className="text-right">{t.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pending per tower */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Encomendas Pendentes por Torre</CardTitle></CardHeader>
        <CardContent>
          {pendingPerTower.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma encomenda pendente nas torres</p>
          ) : (
            <div className="space-y-2">
              {pendingPerTower.map((t, i) => (
                <div key={i} className={`flex items-center justify-between p-3 rounded-lg border ${t.hasOld ? 'border-amber-300 bg-amber-500/5' : 'border-border'}`}>
                  <div className="flex items-center gap-2">
                    {t.hasOld && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                    <span className="font-medium">{t.tower}</span>
                  </div>
                  <Badge variant={t.hasOld ? 'outline' : 'secondary'} className={t.hasOld ? 'border-amber-400 text-amber-700' : ''}>
                    {t.count} pendente{t.count !== 1 ? 's' : ''}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════
//  TOWER ADMIN REPORTS
// ════════════════════════════════════════
function TowerAdminReports({ condominiumId, towerLocationId, period, startDate }: {
  condominiumId: string; towerLocationId: string; period: PeriodDays; startDate: string;
}) {
  // Fetch tower packages
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['tower-admin-reports-packages', towerLocationId, period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*, resident:residents(full_name, block, apartment)')
        .eq('current_location_id', towerLocationId)
        .gte('received_at', startDate)
        .order('received_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch package_events for this tower
  const { data: events = [] } = useQuery({
    queryKey: ['tower-admin-reports-events', towerLocationId, period],
    queryFn: async () => {
      const { data } = await supabase
        .from('package_events')
        .select('transferred_by, created_at, package_id')
        .eq('to_location_id', towerLocationId)
        .not('transferred_by', 'is', null)
        .gte('created_at', startDate);
      return data || [];
    },
  });

  // Profiles for transferred_by
  const userIds = useMemo(() => [...new Set(events.map(e => e.transferred_by).filter(Boolean))], [events]);
  const { data: profiles = [] } = useQuery({
    queryKey: ['tower-admin-reports-profiles', userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
      return data || [];
    },
    enabled: userIds.length > 0,
  });

  // ─── 1. Volume chart ───
  const volumeChartData = useMemo(() => {
    const weeks = new Map<string, number>();
    packages.forEach(p => {
      const weekStart = startOfWeek(new Date(p.received_at), { weekStartsOn: 1 });
      const key = format(weekStart, 'dd/MM');
      weeks.set(key, (weeks.get(key) || 0) + 1);
    });
    return Array.from(weeks.entries()).map(([name, total]) => ({ name, total }));
  }, [packages]);

  // ─── 2. Doorman performance ───
  const profileMap = useMemo(() => new Map(profiles.map(p => [p.id, p.full_name])), [profiles]);

  const doormanPerformance = useMemo(() => {
    // Group events by transferred_by
    const map = new Map<string, { count: number; lastAt: string }>();
    events.forEach(ev => {
      const uid = ev.transferred_by!;
      const existing = map.get(uid);
      if (existing) {
        existing.count++;
        if (ev.created_at && ev.created_at > existing.lastAt) existing.lastAt = ev.created_at;
      } else {
        map.set(uid, { count: 1, lastAt: ev.created_at || '' });
      }
    });

    // Avg delivery time: for picked_up packages, avg(picked_up_at - received_at)
    // Group by... we don't have transferred_by on packages, so just show overall per doorman
    return Array.from(map.entries()).map(([uid, v]) => ({
      name: profileMap.get(uid) || 'Desconhecido',
      pickups: v.count,
      lastActivity: v.lastAt,
    })).sort((a, b) => b.pickups - a.pickups);
  }, [events, profileMap]);

  // ─── 3. Full package list ───
  const handleExportCSV = () => {
    const headers = ['Morador', 'Apto', 'Chegou em', 'Status', 'Retirado em'];
    const rows = packages.map(p => {
      const res = p.resident as any;
      return [
        res?.full_name || 'Não identificado',
        res?.apartment || '-',
        format(new Date(p.received_at), 'dd/MM/yyyy HH:mm'),
        p.status === 'picked_up' ? 'Retirada' : 'Pendente',
        p.picked_up_at ? format(new Date(p.picked_up_at), 'dd/MM/yyyy HH:mm') : '-',
      ];
    });
    downloadCSV(headers, rows, `relatorio-bloco-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Volume chart */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Volume do Bloco por Período</CardTitle></CardHeader>
        <CardContent>
          {volumeChartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma encomenda no período</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={volumeChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Bar dataKey="total" name="Encomendas" className="fill-primary" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Doorman performance */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Performance dos Porteiros do Bloco</CardTitle></CardHeader>
        <CardContent>
          {doormanPerformance.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Sem dados no período</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Porteiro</TableHead>
                  <TableHead className="text-right">Retiradas</TableHead>
                  <TableHead className="text-right">Última atividade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doormanPerformance.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell>{d.name}</TableCell>
                    <TableCell className="text-right font-medium">{d.pickups}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {d.lastActivity ? format(new Date(d.lastActivity), 'dd/MM HH:mm') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Full package list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Encomendas do Bloco</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={packages.length === 0} className="gap-2">
            <Download className="w-4 h-4" />CSV
          </Button>
        </CardHeader>
        <CardContent>
          {packages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma encomenda no período</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Morador</TableHead>
                  <TableHead>Apto</TableHead>
                  <TableHead>Chegou em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Retirado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map(p => {
                  const res = p.resident as any;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{res?.full_name || '—'}</TableCell>
                      <TableCell>{res?.apartment || '—'}</TableCell>
                      <TableCell className="text-sm">{format(new Date(p.received_at), 'dd/MM HH:mm')}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'picked_up' ? 'default' : 'secondary'}>
                          {p.status === 'picked_up' ? 'Retirada' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {p.picked_up_at ? format(new Date(p.picked_up_at), 'dd/MM HH:mm') : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════
//  SIMPLE / DOORMAN REPORTS (existing)
// ════════════════════════════════════════
function SimpleReports({ condominiumId, period, startDate }: { condominiumId: string; period: PeriodDays; startDate: string }) {
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['reports-packages', condominiumId, period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*, resident:residents(full_name, block, apartment)')
        .eq('condominium_id', condominiumId)
        .gte('received_at', startDate)
        .order('received_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['reports-pending', condominiumId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('packages')
        .select('*', { count: 'exact', head: true })
        .eq('condominium_id', condominiumId)
        .eq('status', 'pending');
      if (error) throw error;
      return count || 0;
    },
  });

  const stats = useMemo(() => {
    const received = packages.length;
    const pickedUp = packages.filter(p => p.status === 'picked_up');
    let avgHours = 0;
    if (pickedUp.length > 0) {
      const totalHours = pickedUp.reduce((sum, p) => {
        if (p.picked_up_at && p.received_at) return sum + differenceInHours(new Date(p.picked_up_at), new Date(p.received_at));
        return sum;
      }, 0);
      avgHours = Math.round(totalHours / pickedUp.length);
    }
    return { received, pickedUpCount: pickedUp.length, avgHours };
  }, [packages]);

  const topCarriers = useMemo(() => {
    const counts: Record<string, number> = {};
    packages.forEach(p => { const c = p.carrier || 'Não informada'; counts[c] = (counts[c] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [packages]);

  const handleExportCSV = () => {
    const headers = ['Data Recebimento', 'Morador', 'Bloco', 'Apartamento', 'Transportadora', 'Status', 'Data Retirada'];
    const rows = packages.map(p => {
      const res = p.resident as any;
      return [
        format(new Date(p.received_at), 'dd/MM/yyyy HH:mm'),
        res?.full_name || 'Não identificado', res?.block || '-', res?.apartment || '-',
        p.carrier || '-', p.status === 'picked_up' ? 'Retirada' : 'Pendente',
        p.picked_up_at ? format(new Date(p.picked_up_at), 'dd/MM/yyyy HH:mm') : '-',
      ];
    });
    downloadCSV(headers, rows, `relatorio-encomendas-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={packages.length === 0} className="gap-2">
          <Download className="w-4 h-4" />Exportar CSV
        </Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Recebidas</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.received}</div><p className="text-xs text-muted-foreground">{periodLabels[period]}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Retiradas</CardTitle>
            <PackageCheck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.pickedUpCount}</div><p className="text-xs text-muted-foreground">{periodLabels[period]}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{pendingCount}</div><p className="text-xs text-muted-foreground">Total atual</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Tempo médio</CardTitle>
            <Truck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.avgHours}h</div><p className="text-xs text-muted-foreground">Permanência na portaria</p></CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-lg">Top 10 Transportadoras</CardTitle></CardHeader>
        <CardContent>
          {topCarriers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma encomenda no período</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Transportadora</TableHead><TableHead className="text-right">Quantidade</TableHead></TableRow></TableHeader>
              <TableBody>
                {topCarriers.map(([name, count], i) => (
                  <TableRow key={name}>
                    <TableCell className="flex items-center gap-2"><Badge variant="secondary" className="text-xs">{i + 1}º</Badge>{name}</TableCell>
                    <TableCell className="text-right font-medium">{count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ════════════════════════════════════════
//  MAIN EXPORT
// ════════════════════════════════════════
export default function Reports() {
  const { condominium } = useCondominium();
  const { user, role } = useAuth();
  const [period, setPeriod] = useState<PeriodDays>('30');
  const [towerLocationId, setTowerLocationId] = useState<string | null>(null);

  const startDate = useMemo(() => subDays(new Date(), Number(period)).toISOString(), [period]);
  const isMultiCustody = condominium?.custody_mode === 'multi_custody';

  // For tower_admin, fetch their tower
  useEffect(() => {
    if (role !== 'tower_admin' || !user) return;
    (async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('location_id')
        .eq('user_id', user.id)
        .eq('role', 'tower_admin')
        .is('deleted_at', null)
        .limit(1)
        .single();
      if (data?.location_id) setTowerLocationId(data.location_id);
    })();
  }, [role, user]);

  const subtitle = role === 'tower_admin'
    ? 'Relatórios do seu bloco'
    : isMultiCustody && role === 'admin'
      ? 'Visão geral de todas as torres'
      : 'Visão geral das encomendas do condomínio';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>
        <PeriodFilter period={period} setPeriod={setPeriod} />
      </div>

      {!condominium?.id ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : role === 'tower_admin' && towerLocationId ? (
        <TowerAdminReports condominiumId={condominium.id} towerLocationId={towerLocationId} period={period} startDate={startDate} />
      ) : role === 'admin' && isMultiCustody ? (
        <AdminReports condominiumId={condominium.id} period={period} startDate={startDate} />
      ) : (
        <SimpleReports condominiumId={condominium.id} period={period} startDate={startDate} />
      )}
    </div>
  );
}
