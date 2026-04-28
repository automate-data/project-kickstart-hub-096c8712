import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCondominium } from '@/hooks/useCondominium';
import { supabase } from '@/integrations/supabase/client';
import { Package as PackageType } from '@/types';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PackagePhoto } from '@/components/PackagePhoto';
import { Package, Archive, BarChart2, CheckCircle2, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TowerPackage extends PackageType {
  locker_reference?: string | null;
}

export default function TowerAdminDashboard() {
  const { user } = useAuth();
  const { condominium } = useCondominium();
  const navigate = useNavigate();

  const [towerLocationId, setTowerLocationId] = useState<string | null>(null);
  const [towerName, setTowerName] = useState('');
  const [packages, setPackages] = useState<TowerPackage[]>([]);
  const [pickedUpToday, setPickedUpToday] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const towerCount = packages.length;
  const lockerCount = packages.filter(p => p.locker_reference).length;

  // Fetch tower from user_roles
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('location_id')
        .eq('user_id', user.id)
        .eq('role', 'tower_admin')
        .is('deleted_at', null)
        .limit(1)
        .single();

      if (data?.location_id) {
        setTowerLocationId(data.location_id);
        const { data: loc } = await supabase
          .from('locations')
          .select('name')
          .eq('id', data.location_id)
          .single();
        if (loc) setTowerName(loc.name);
      }
    })();
  }, [user]);

  // Fetch pending packages
  const fetchPackages = useCallback(async () => {
    if (!towerLocationId) return;
    setIsLoading(true);

    // Lockers filhos desta torre — pacotes alocados ficam com current_location_id = locker
    const { data: lockerLocs } = await supabase
      .from('locations')
      .select('id, name')
      .eq('parent_id', towerLocationId)
      .eq('type', 'locker');

    const lockerMap = new Map((lockerLocs || []).map(l => [l.id, l.name]));
    const lockerIds = Array.from(lockerMap.keys());
    const locationIds = [towerLocationId, ...lockerIds];

    const { data: pkgs } = await supabase
      .from('packages')
      .select('*, resident:residents(*)')
      .in('current_location_id', locationIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (!pkgs || pkgs.length === 0) {
      setPackages([]);
      setIsLoading(false);
      return;
    }

    // Check locker allocations via package_events para obter a referência (ex: "Armário 08")
    const packageIds = pkgs.map(p => p.id);
    const { data: events } = await supabase
      .from('package_events')
      .select('package_id, to_location_id, notes')
      .in('package_id', packageIds)
      .order('created_at', { ascending: false });

    const lockerAllocations = new Map<string, string>();
    const seen = new Set<string>();
    for (const ev of events || []) {
      if (seen.has(ev.package_id)) continue;
      seen.add(ev.package_id);
      if (ev.to_location_id && lockerMap.has(ev.to_location_id)) {
        let ref = '';
        if (ev.notes) {
          const match = ev.notes.match(/locker_reference:([^,;\n\r]+)/i);
          if (match) ref = match[1].trim();
        }
        lockerAllocations.set(ev.package_id, ref || lockerMap.get(ev.to_location_id) || '');
      }
    }

    // Fallback: pacote já está com current_location_id = locker mesmo sem evento
    for (const p of pkgs) {
      if (!lockerAllocations.has(p.id) && p.current_location_id && lockerMap.has(p.current_location_id)) {
        lockerAllocations.set(p.id, lockerMap.get(p.current_location_id) || '');
      }
    }

    const mapped: TowerPackage[] = pkgs.map(p => ({
      ...p,
      ai_suggestion: p.ai_suggestion as any,
      resident: p.resident || undefined,
      status: p.status as 'pending' | 'picked_up',
      locker_reference: lockerAllocations.get(p.id) || null,
    }));

    setPackages(mapped);
    setIsLoading(false);
  }, [towerLocationId]);

  // Fetch picked up today count
  const fetchPickedUpToday = useCallback(async () => {
    if (!towerLocationId) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from('packages')
      .select('id', { count: 'exact', head: true })
      .eq('current_location_id', towerLocationId)
      .eq('status', 'picked_up')
      .gte('picked_up_at', todayStart.toISOString());

    setPickedUpToday(count || 0);
  }, [towerLocationId]);

  useEffect(() => {
    fetchPackages();
    fetchPickedUpToday();
  }, [fetchPackages, fetchPickedUpToday]);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold">Painel — {towerName || 'Torre'}</h1>

        {/* Counters */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Package className="w-6 h-6 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{towerCount}</p>
              <p className="text-xs text-muted-foreground">Na Torre</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Archive className="w-6 h-6 mx-auto mb-1 text-amber-600" />
              <p className="text-2xl font-bold">{lockerCount}</p>
              <p className="text-xs text-muted-foreground">No Armário</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-green-600" />
              <p className="text-2xl font-bold">{pickedUpToday}</p>
              <p className="text-xs text-muted-foreground">Retiradas Hoje</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending packages */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Encomendas Pendentes</h2>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : packages.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma encomenda pendente na torre</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {packages.map((pkg) => (
                <Card key={pkg.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <PackagePhoto photoUrl={pkg.photo_url} alt="Foto da encomenda" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">
                            {pkg.resident?.full_name || 'Morador não identificado'}
                          </p>
                          {pkg.locker_reference ? (
                            <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 text-xs">
                              Armário {pkg.locker_reference}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Na Torre</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {pkg.resident?.block && pkg.resident?.apartment
                            ? `${condominium?.unit_label || 'Apto'} ${pkg.resident.apartment} — ${condominium?.group_label || 'Bloco'} ${pkg.resident.block}`
                            : '—'}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {pkg.carrier && <span>{pkg.carrier}</span>}
                          <span>
                            {formatDistanceToNow(new Date(pkg.received_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Reports link */}
        <div className="pt-2">
          <Button variant="outline" className="w-full gap-2" onClick={() => navigate('/reports')}>
            <BarChart2 className="w-4 h-4" />
            Ver Relatórios Completos
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
