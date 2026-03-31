import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCondominium } from '@/hooks/useCondominium';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import { PackagePhoto } from '@/components/PackagePhoto';
import { SignatureCanvas, SignatureCanvasRef } from '@/components/SignatureCanvas';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Loader2,
  Package,
  CheckCircle2,
  ListChecks,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface CentralPackage {
  id: string;
  photo_url: string;
  carrier: string | null;
  created_at: string;
  resident_id: string | null;
  resident?: {
    full_name: string;
    block: string;
    apartment: string;
  } | null;
}

export default function TowerCollect() {
  const { user } = useAuth();
  const { condominium } = useCondominium();
  const navigate = useNavigate();

  const [towerLocationId, setTowerLocationId] = useState<string | null>(null);
  const [towerName, setTowerName] = useState('');
  const [centralLocationId, setCentralLocationId] = useState<string | null>(null);
  const [packages, setPackages] = useState<CentralPackage[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const signatureRef = useRef<SignatureCanvasRef>(null);

  // Fetch tower & central locations
  useEffect(() => {
    if (!user || !condominium) return;
    (async () => {
      // Get user's tower
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('location_id')
        .eq('user_id', user.id)
        .eq('role', 'tower_doorman')
        .is('deleted_at', null)
        .limit(1)
        .single();

      if (roleData?.location_id) {
        setTowerLocationId(roleData.location_id);
        const { data: loc } = await supabase
          .from('locations')
          .select('name')
          .eq('id', roleData.location_id)
          .single();
        if (loc) setTowerName(loc.name);
      }

      // Get central location
      const { data: central } = await supabase
        .from('locations')
        .select('id')
        .eq('condominium_id', condominium.id)
        .eq('type', 'central')
        .limit(1)
        .single();

      if (central) setCentralLocationId(central.id);
    })();
  }, [user, condominium]);

  // Fetch packages at central
  const fetchPackages = useCallback(async () => {
    if (!centralLocationId) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from('packages')
      .select('id, photo_url, carrier, created_at, resident:residents(full_name, block, apartment)')
      .eq('current_location_id', centralLocationId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching central packages:', error);
    }

    setPackages((data as CentralPackage[]) || []);
    setIsLoading(false);
  }, [centralLocationId]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  // Selection helpers
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === packages.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(packages.map(p => p.id)));
    }
  };

  const allSelected = packages.length > 0 && selected.size === packages.length;

  // Transfer
  const handleConfirmTransfer = async () => {
    if (!towerLocationId || !centralLocationId || !user || selected.size === 0) return;

    const signatureData = signatureRef.current?.getSignatureData() || null;

    setIsTransferring(true);
    try {
      const ids = Array.from(selected);

      // Update current_location_id for all selected packages
      const { error: updateErr } = await supabase
        .from('packages')
        .update({ current_location_id: towerLocationId })
        .in('id', ids);

      if (updateErr) throw updateErr;

      // Insert package_events for each
      const events = ids.map(pkgId => ({
        package_id: pkgId,
        from_location_id: centralLocationId,
        to_location_id: towerLocationId,
        transferred_by: user.id,
        signature_data: signatureData,
        notes: `Transferido da central para ${towerName}`,
      }));

      const { error: evErr } = await supabase
        .from('package_events')
        .insert(events);

      if (evErr) throw evErr;

      // Send WhatsApp notification to each resident with a phone
      const selectedPkgs = packages.filter(p => ids.includes(p.id));
      for (const pkg of selectedPkgs) {
        if (pkg.resident_id) {
          try {
            const { data: residentData } = await supabase
              .from('residents')
              .select('phone, full_name, whatsapp_enabled')
              .eq('id', pkg.resident_id)
              .single();

            if (residentData?.phone && residentData.whatsapp_enabled) {
              await supabase.functions.invoke('send-transfer-notification', {
                body: {
                  resident_phone: residentData.phone,
                  resident_name: residentData.full_name,
                  tower_name: towerName,
                },
              });
            }
          } catch (notifErr) {
            console.error('Transfer notification error:', notifErr);
          }
        }
      }

      toast.success(`${ids.length} encomenda(s) transferida(s) para ${towerName}`);
      setDialogOpen(false);
      navigate('/tower-dashboard');
    } catch (err) {
      console.error('Transfer error:', err);
      toast.error('Erro ao transferir encomendas');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tower-dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Coletar da Central</h1>
            <p className="text-sm text-muted-foreground">
              Selecione as encomendas para transferir para {towerName || 'sua torre'}
            </p>
          </div>
        </div>

        {/* Select all */}
        {packages.length > 0 && (
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" className="gap-2" onClick={toggleAll}>
              <ListChecks className="w-4 h-4" />
              {allSelected ? 'Desmarcar tudo' : 'Selecionar tudo'}
            </Button>
            <span className="text-sm text-muted-foreground">
              {packages.length} encomenda(s)
            </span>
          </div>
        )}

        {/* Package list */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : packages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Nenhuma encomenda aguardando na central.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {packages.map(pkg => {
              const isChecked = selected.has(pkg.id);
              return (
                <Card
                  key={pkg.id}
                  className={`cursor-pointer transition-colors ${isChecked ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                  onClick={() => toggleSelect(pkg.id)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleSelect(pkg.id)}
                        onClick={e => e.stopPropagation()}
                      />
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <PackagePhoto photoUrl={pkg.photo_url} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">
                          {pkg.resident?.full_name || 'Não identificado'}
                        </p>
                        {pkg.resident && (
                          <p className="text-xs text-muted-foreground">
                            Bloco {pkg.resident.block} - Apto {pkg.resident.apartment}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {pkg.carrier && <span>{pkg.carrier}</span>}
                          <span>
                            aguardando {formatDistanceToNow(new Date(pkg.created_at), { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 safe-area-inset-bottom z-50">
          <div className="container flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              {selected.size} encomenda(s) selecionada(s)
            </span>
            <Button className="gap-2" onClick={() => setDialogOpen(true)}>
              <CheckCircle2 className="w-4 h-4" />
              Confirmar Transferência
            </Button>
          </div>
        </div>
      )}

      {/* Transfer confirmation dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center">Confirmar Transferência</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Transferir <span className="font-semibold text-foreground">{selected.size}</span> encomenda(s) da Central para <span className="font-semibold text-foreground">{towerName}</span>
            </p>
            <div className="space-y-2">
              <p className="text-center text-sm text-muted-foreground">
                Assine para confirmar o recebimento
              </p>
              <SignatureCanvas ref={signatureRef} onSignatureChange={setHasSignature} />
            </div>
            <Button
              size="lg"
              className="w-full gap-2"
              disabled={!hasSignature || isTransferring}
              onClick={handleConfirmTransfer}
            >
              {isTransferring ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
