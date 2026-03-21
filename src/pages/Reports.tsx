import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCondominium } from '@/hooks/useCondominium';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, PackageCheck, Clock, Truck, Download, Loader2 } from 'lucide-react';
import { format, subDays, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type PeriodDays = '7' | '30' | '90';

export default function Reports() {
  const { condominium } = useCondominium();
  const [period, setPeriod] = useState<PeriodDays>('30');

  const startDate = useMemo(() => subDays(new Date(), Number(period)).toISOString(), [period]);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['reports-packages', condominium?.id, period],
    queryFn: async () => {
      if (!condominium?.id) return [];
      const { data, error } = await supabase
        .from('packages')
        .select('*, resident:residents(full_name, block, apartment)')
        .eq('condominium_id', condominium.id)
        .gte('received_at', startDate)
        .order('received_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!condominium?.id,
  });

  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['reports-pending', condominium?.id],
    queryFn: async () => {
      if (!condominium?.id) return 0;
      const { count, error } = await supabase
        .from('packages')
        .select('*', { count: 'exact', head: true })
        .eq('condominium_id', condominium.id)
        .eq('status', 'pending');
      if (error) throw error;
      return count || 0;
    },
    enabled: !!condominium?.id,
  });

  const stats = useMemo(() => {
    const received = packages.length;
    const pickedUp = packages.filter(p => p.status === 'picked_up');
    const pickedUpCount = pickedUp.length;

    let avgHours = 0;
    if (pickedUp.length > 0) {
      const totalHours = pickedUp.reduce((sum, p) => {
        if (p.picked_up_at && p.received_at) {
          return sum + differenceInHours(new Date(p.picked_up_at), new Date(p.received_at));
        }
        return sum;
      }, 0);
      avgHours = Math.round(totalHours / pickedUp.length);
    }

    return { received, pickedUpCount, avgHours };
  }, [packages]);

  const topCarriers = useMemo(() => {
    const counts: Record<string, number> = {};
    packages.forEach(p => {
      const carrier = p.carrier || 'Não informada';
      counts[carrier] = (counts[carrier] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [packages]);

  const handleExportCSV = () => {
    const headers = ['Data Recebimento', 'Morador', 'Bloco', 'Apartamento', 'Transportadora', 'Status', 'Data Retirada'];
    const rows = packages.map(p => {
      const resident = p.resident as any;
      return [
        format(new Date(p.received_at), 'dd/MM/yyyy HH:mm'),
        resident?.full_name || 'Não identificado',
        resident?.block || '-',
        resident?.apartment || '-',
        p.carrier || '-',
        p.status === 'picked_up' ? 'Retirada' : 'Pendente',
        p.picked_up_at ? format(new Date(p.picked_up_at), 'dd/MM/yyyy HH:mm') : '-',
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-encomendas-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const periodLabels: Record<PeriodDays, string> = {
    '7': 'Últimos 7 dias',
    '30': 'Últimos 30 dias',
    '90': 'Últimos 90 dias',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground text-sm">Visão geral das encomendas do condomínio</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodDays)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{periodLabels['7']}</SelectItem>
              <SelectItem value="30">{periodLabels['30']}</SelectItem>
              <SelectItem value="90">{periodLabels['90']}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={packages.length === 0} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Recebidas</CardTitle>
                <Package className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.received}</div>
                <p className="text-xs text-muted-foreground">{periodLabels[period]}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Retiradas</CardTitle>
                <PackageCheck className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pickedUpCount}</div>
                <p className="text-xs text-muted-foreground">{periodLabels[period]}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingCount}</div>
                <p className="text-xs text-muted-foreground">Total atual</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Tempo médio</CardTitle>
                <Truck className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgHours}h</div>
                <p className="text-xs text-muted-foreground">Permanência na portaria</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top 10 Transportadoras</CardTitle>
            </CardHeader>
            <CardContent>
              {topCarriers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma encomenda no período</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transportadora</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCarriers.map(([name, count], i) => (
                      <TableRow key={name}>
                        <TableCell className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{i + 1}º</Badge>
                          {name}
                        </TableCell>
                        <TableCell className="text-right font-medium">{count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
