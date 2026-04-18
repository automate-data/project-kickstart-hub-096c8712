import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCondominium } from '@/hooks/useCondominium';
import { supabase } from '@/integrations/supabase/client';
import { Package as PackageType } from '@/types';
import AppLayout from '@/components/layout/AppLayout';
import { PickupDialog } from '@/components/PickupDialog';
import { LockerDialog } from '@/components/custody/CustodyDialogs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PackagePhoto } from '@/components/PackagePhoto';
import {
  ArrowDownToLine,
  Package,
  Archive,
  Loader2,
  CheckCircle2,
  LocateFixed,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface TowerPackage extends PackageType {
  locker_reference?: string | null;
  locker_location_name?: string | null;
}

export default function TowerDashboard() {
  const { user } = useAuth();
  const { condominium } = useCondominium();
  const navigate = useNavigate();

  const [towerLocationId, setTowerLocationId] = useState<string | null>(null);
  const [towerName, setTowerName] = useState<string>('');
  const [hasLockers, setHasLockers] = useState(false);
  const [packages, setPackages] = useState<TowerPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lockerPickupLoading, setLockerPickupLoading] = useState<string | null>(null);

  // Pickup dialog
  const [pickupPkg, setPickupPkg] = useState<PackageType | null>(null);
  const [pickupOpen, setPickupOpen] = useState(false);

  // Locker dialog
  const [lockerPkg, setLockerPkg] = useState<PackageType | null>(null);
  const [lockerOpen, setLockerOpen] = useState(false);

  // Counters
  const lockerCount = packages.filter(p => p.locker_reference).length;
  const blockCount = packages.length - lockerCount;

  // Fetch user's tower location
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('location_id')
        .eq('user_id', user.id)
        .eq('role', 'tower_doorman')
        .is('deleted_at', null)
        .limit(1)
        .single();

      if (data?.location_id) {
        setTowerLocationId(data.location_id);

        // Get tower name
        const { data: loc } = await supabase
          .from('locations')
          .select('name')
          .eq('id', data.location_id)
          .single();
        if (loc) setTowerName(loc.name);

        // Check for lockers under this tower
        const { data: lockers } = await supabase
          .from('locations')
          .select('id')
          .eq('parent_id', data.location_id)
          .eq('type', 'locker')
          .limit(1);
        setHasLockers((lockers && lockers.length > 0) || false);
      }
    })();
  }, [user]);

  // Fetch packages at tower location
  const fetchPackages = useCallback(async () => {
    if (!towerLocationId) return;
    setIsLoading(true);

    const { data: pkgs, error } = await supabase
      .from('packages')
      .select('*, resident:residents(*)')
      .eq('current_location_id', towerLocationId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tower packages:', error);
      setIsLoading(false);
      return;
    }

    if (!pkgs || pkgs.length === 0) {
      setPackages([]);
      setIsLoading(false);
      return;
    }

    // For each package, check latest package_event for locker allocation
    const packageIds = pkgs.map(p => p.id);
    const { data: events } = await supabase
      .from('package_events')
      .select('package_id, to_location_id, notes')
      .in('package_id', packageIds)
      .order('created_at', { ascending: false });

    // Get locker locations for reference
    const { data: lockerLocs } = await supabase
      .from('locations')
      .select('id, name')
      .eq('parent_id', towerLocationId)
      .eq('type', 'locker');

    const lockerMap = new Map((lockerLocs || []).map(l => [l.id, l.name]));

    // Build a map of latest event per package that has a locker destination
    const lockerAllocations = new Map<string, { reference: string; lockerName: string }>();
    const seen = new Set<string>();
    for (const ev of events || []) {
      if (seen.has(ev.package_id)) continue;
      seen.add(ev.package_id);
      if (ev.to_location_id && lockerMap.has(ev.to_location_id)) {
        // Extract locker reference from notes (format: "locker_reference:X")
        let ref = '';
        if (ev.notes) {
          const match = ev.notes.match(/locker_reference:(.+)/);
          if (match) ref = match[1].trim();
        }
        lockerAllocations.set(ev.package_id, {
          reference: ref || lockerMap.get(ev.to_location_id) || '',
          lockerName: lockerMap.get(ev.to_location_id) || '',
        });
      }
    }

    const mapped: TowerPackage[] = pkgs.map(p => {
      const alloc = lockerAllocations.get(p.id);
      return {
        ...p,
        ai_suggestion: p.ai_suggestion as any,
        resident: p.resident || undefined,
        status: p.status as 'pending' | 'picked_up',
        locker_reference: alloc?.reference || null,
        locker_location_name: alloc?.lockerName || null,
      };
    });

    setPackages(mapped);
    setIsLoading(false);
  }, [towerLocationId]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  // Handle pickup
  const handlePickup = async (signatureData: string) => {
    if (!pickupPkg || !user) return;

    const pickedUpAt = new Date().toISOString();

    const { error } = await supabase
      .from('packages')
      .update({
        status: 'picked_up',
        picked_up_at: pickedUpAt,
        picked_up_by: pickupPkg.resident?.full_name || 'Morador',
        signature_data: signatureData,
      })
      .eq('id', pickupPkg.id);

    if (error) {
      toast.error('Erro ao registrar retirada');
      throw error;
    }

    // Send WhatsApp pickup confirmation
    if (pickupPkg.resident?.phone) {
      try {
        const { data: confirmResult, error: confirmError } = await supabase.functions.invoke('send-pickup-confirmation', {
          body: {
            phone: pickupPkg.resident.phone,
            resident_name: pickupPkg.resident.full_name,
            picked_up_at: pickedUpAt,
            package_id: pickupPkg.id,
            condominium_id: condominium?.id,
          },
        });

        if (confirmError || confirmResult?.error) {
          throw new Error(confirmError?.message || confirmResult?.error || 'Unknown error');
        }

        await supabase
          .from('packages')
          .update({ pickup_confirmation_sent: confirmResult?.success || false })
          .eq('id', pickupPkg.id);
      } catch (e: any) {
        console.error('[TowerDashboard] WhatsApp pickup confirmation failed:', e);
      }
    }

    toast.success('Retirada registrada com sucesso!');
    setPickupPkg(null);
    fetchPackages();
  };

  // Handle locker pickup (no signature needed)
  const handleLockerPickup = async (pkg: TowerPackage) => {
    if (!user) return;

    const confirmed = window.confirm(
      `Confirmar que a encomenda de ${pkg.resident?.full_name || 'morador'} foi retirada do armário ${pkg.locker_reference}?`
    );
    if (!confirmed) return;

    setLockerPickupLoading(pkg.id);
    const pickedUpAt = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('packages')
        .update({
          status: 'picked_up',
          picked_up_at: pickedUpAt,
          picked_up_by: pkg.resident?.full_name || 'Morador',
        })
        .eq('id', pkg.id);

      if (error) {
        toast.error('Erro ao registrar retirada');
        return;
      }

      // Send WhatsApp pickup confirmation
      if (pkg.resident?.phone) {
        try {
          const { data: confirmResult, error: confirmError } = await supabase.functions.invoke('send-pickup-confirmation', {
            body: {
              phone: pkg.resident.phone,
              resident_name: pkg.resident.full_name,
              picked_up_at: pickedUpAt,
              package_id: pkg.id,
              condominium_id: condominium?.id,
              locker_reference: pkg.locker_reference,
            },
          });

          if (confirmError || confirmResult?.error) {
            console.error('[TowerDashboard] WhatsApp pickup confirmation failed:', confirmError?.message || confirmResult?.error);
          } else {
            await supabase
              .from('packages')
              .update({ pickup_confirmation_sent: confirmResult?.success || false })
              .eq('id', pkg.id);
          }
        } catch (e: any) {
          console.error('[TowerDashboard] WhatsApp pickup confirmation error:', e);
        }
      }

      toast.success('Retirada confirmada com sucesso!');
      fetchPackages();
    } finally {
      setLockerPickupLoading(null);
    }
  };

  const handleLockerConfirm = async (lockerReference: string, sendWhatsApp: boolean) => {
    if (!lockerPkg || !user || !towerLocationId) return;

    // Find the locker location under this tower
    const { data: lockerLocs } = await supabase
      .from('locations')
      .select('id')
      .eq('parent_id', towerLocationId)
      .eq('type', 'locker')
      .limit(1);

    const lockerId = lockerLocs?.[0]?.id || null;

    // Insert package_event
    const { error: eventErr } = await supabase.from('package_events').insert({
      package_id: lockerPkg.id,
      from_location_id: towerLocationId,
      to_location_id: lockerId,
      transferred_by: user.id,
      notes: `locker_reference:${lockerReference}`,
    });

    if (eventErr) {
      toast.error('Erro ao registrar alocação no armário');
      throw eventErr;
    }

    // Send WhatsApp notification if enabled
    if (sendWhatsApp && lockerPkg.resident?.phone && lockerPkg.resident?.whatsapp_enabled) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        const now = new Date();
        const datetime = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

        const { data: result, error: fnErr } = await supabase.functions.invoke('send-locker-notification', {
          body: {
            resident_phone: lockerPkg.resident.phone,
            resident_name: lockerPkg.resident.full_name,
            tower_name: towerName,
            locker_reference: lockerReference,
            registered_by: profile?.full_name || 'Portaria',
            datetime,
          },
        });

        if (fnErr || result?.error) {
          console.error('[TowerDashboard] Locker WhatsApp failed:', fnErr?.message || result?.error);
        }
      } catch (e: any) {
        console.error('[TowerDashboard] Locker WhatsApp error:', e);
      }
    }

    toast.success(`Encomenda alocada no armário ${lockerReference}`);
    setLockerOpen(false);
    setLockerPkg(null);
    fetchPackages();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{towerName || 'Painel da Torre'}</h1>
          <p className="text-muted-foreground text-sm">Gerencie as encomendas do seu Bloco</p>
        </div>

        {/* Section 1 — Counter cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center gap-2">
              <Package className="w-8 h-8 text-primary" />
              <span className="text-3xl font-bold text-foreground">{blockCount}</span>
              <span className="text-sm text-muted-foreground">No Bloco</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex flex-col items-center gap-2">
              <Archive className="w-8 h-8 text-amber-500" />
              <span className="text-3xl font-bold text-foreground">{lockerCount}</span>
              <span className="text-sm text-muted-foreground">No Armário</span>
            </CardContent>
          </Card>
        </div>

        {/* Section 2 — Collect from central button */}
        <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
          <CardContent className="pt-6 flex flex-col items-center gap-3">
            <Button
              size="lg"
              className="w-full max-w-sm gap-3 text-base"
              onClick={() => navigate('/tower-collect')}
            >
              <ArrowDownToLine className="w-5 h-5" />
              Coletar Encomendas da Central
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Transfira encomendas aguardando na portaria central para seu Bloco
            </p>
          </CardContent>
        </Card>

        {/* Section 3 — Package list */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Encomendas no Bloco</h2>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : packages.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>Nenhuma encomenda na torre no momento</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {packages.map(pkg => (
                <Card key={pkg.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <PackagePhoto photoUrl={pkg.photo_url} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {pkg.resident?.full_name || 'Não identificado'}
                            </p>
                            {pkg.resident && (
                              <p className="text-xs text-muted-foreground">
                                Bloco {pkg.resident.block} - Apto {pkg.resident.apartment}
                              </p>
                            )}
                          </div>
                          {pkg.locker_reference ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 flex-shrink-0">
                              No Armário — posição {pkg.locker_reference}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 flex-shrink-0">
                              No Bloco
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {pkg.carrier && <span>{pkg.carrier}</span>}
                          <span>
                            {formatDistanceToNow(new Date(pkg.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          {pkg.locker_reference ? (
                            <Button
                              size="sm"
                              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                              disabled={lockerPickupLoading === pkg.id}
                              onClick={() => handleLockerPickup(pkg)}
                            >
                              {lockerPickupLoading === pkg.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              Confirmar Retirada
                            </Button>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                className="gap-1.5"
                                onClick={() => {
                                  setPickupPkg(pkg);
                                  setPickupOpen(true);
                                }}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Retirar
                              </Button>
                              {hasLockers && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5"
                                  onClick={() => {
                                    setLockerPkg(pkg);
                                    setLockerOpen(true);
                                  }}
                                >
                                  <LocateFixed className="w-3.5 h-3.5" />
                                  Alocar em Armário
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <PickupDialog
        open={pickupOpen}
        onOpenChange={setPickupOpen}
        pkg={pickupPkg}
        onConfirm={handlePickup}
      />

      <LockerDialog
        open={lockerOpen}
        onOpenChange={setLockerOpen}
        pkg={lockerPkg}
        towerName={towerName}
        onConfirm={handleLockerConfirm}
      />
    </AppLayout>
  );
}
