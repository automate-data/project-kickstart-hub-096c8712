import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCondominium } from '@/hooks/useCondominium';
import { Package as PackageType, Location } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package as PackageIcon, Camera, Clock, CheckCircle2, BellOff, Boxes } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PackagePhoto } from '@/components/PackagePhoto';
import { LockerDialog } from '@/components/custody/CustodyDialogs';
import { toast } from 'sonner';
import { insertLog } from '@/lib/logger';

export default function Dashboard() {
  const { condominium } = useCondominium();
  const [pendingPackages, setPendingPackages] = useState<PackageType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [centralLocationId, setCentralLocationId] = useState<string | null>(null);
  const [lockers, setLockers] = useState<Location[]>([]);
  const [allocatePkg, setAllocatePkg] = useState<PackageType | null>(null);
  const [allocateOpen, setAllocateOpen] = useState(false);

  const isSimpleLocker = condominium?.custody_mode === 'simple_locker';

  useEffect(() => { fetchPendingPackages(); }, [condominium?.id]);

  useEffect(() => {
    if (!condominium?.id || !isSimpleLocker) return;
    (async () => {
      const { data: locs } = await supabase
        .from('locations')
        .select('*')
        .eq('condominium_id', condominium.id);
      if (locs) {
        const central = (locs as Location[]).find(l => l.type === 'central');
        setCentralLocationId(central?.id || null);
        setLockers((locs as Location[]).filter(l => l.type === 'locker'));
      }
    })();
  }, [condominium?.id, isSimpleLocker]);

  const fetchPendingPackages = async () => {
    if (!condominium?.id) {
      setPendingPackages([]);
      setIsLoading(false);
      return;
    }

    let query = supabase
      .from('packages')
      .select(`*, resident:residents(*)`)
      .eq('status', 'pending')
      .eq('condominium_id', condominium.id)
      .order('received_at', { ascending: false })
      .limit(10);

    // In multi_custody/simple_locker modes, only show packages at central location
    if (condominium.custody_mode === 'multi_custody' || condominium.custody_mode === 'simple_locker') {
      const { data: central } = await supabase
        .from('locations')
        .select('id')
        .eq('condominium_id', condominium.id)
        .eq('type', 'central')
        .limit(1)
        .single();

      if (central) {
        query = query.eq('current_location_id', central.id);
      }
    }

    const { data } = await query;
    if (data) setPendingPackages(data as unknown as PackageType[]);
    setIsLoading(false);
  };

  const handleAllocateClick = (pkg: PackageType, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAllocatePkg(pkg);
    setAllocateOpen(true);
  };

  const handleConfirmAllocation = async (lockerReference: string, sendWhatsApp: boolean) => {
    if (!allocatePkg || !centralLocationId) return;

    // Encontra locker pelo nome OU cria virtual: usamos o primeiro locker e armazenamos referência nas notes
    // Para simple_locker preferimos achar locker cujo nome termine com a referência
    const ref = lockerReference.trim();
    const matched = lockers.find(l => {
      const n = l.name.toLowerCase();
      return n === ref.toLowerCase() || n.endsWith(` ${ref.toLowerCase()}`);
    });
    const targetLocker = matched || lockers[0];

    if (!targetLocker) {
      toast.error('Nenhum armário cadastrado. Configure em Configurações Avançadas.');
      return;
    }

    const { error: updErr } = await supabase
      .from('packages')
      .update({ current_location_id: targetLocker.id })
      .eq('id', allocatePkg.id);

    if (updErr) {
      toast.error('Erro ao alocar encomenda');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('package_events').insert({
      package_id: allocatePkg.id,
      from_location_id: centralLocationId,
      to_location_id: targetLocker.id,
      transferred_by: user?.id,
      notes: `locker_reference:${ref}`,
    } as any);

    insertLog({
      event_type: 'package_allocated_to_locker',
      package_id: allocatePkg.id,
      condominium_id: condominium?.id,
      metadata: { locker_reference: ref },
    });

    if (sendWhatsApp && allocatePkg.resident?.phone && allocatePkg.resident?.whatsapp_enabled !== false) {
      try {
        await supabase.functions.invoke('send-locker-notification', {
          body: {
            resident_phone: allocatePkg.resident.phone,
            resident_name: allocatePkg.resident.full_name,
            tower_name: 'Portaria',
            locker_reference: ref,
          },
        });
      } catch (e) {
        console.error('[Locker] WhatsApp failed:', e);
      }
    }

    toast.success(`Encomenda alocada no armário ${ref}`);
    setAllocateOpen(false);
    setAllocatePkg(null);
    fetchPendingPackages();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col items-center py-8">
        <Link to="/receive">
          <Button size="lg" className="h-32 w-32 rounded-3xl flex flex-col gap-2 shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <Camera className="w-10 h-10" />
            <span className="text-lg font-semibold">Receber</span>
          </Button>
        </Link>
        <p className="text-muted-foreground mt-4 text-center">Toque para registrar nova encomenda</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-warning" />Aguardando retirada
          </h2>
          <Badge variant="secondary" className="text-sm">{pendingPackages.length}</Badge>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="flex gap-4"><div className="w-16 h-16 bg-muted rounded-lg" /><div className="flex-1 space-y-2"><div className="h-4 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2" /></div></div></CardContent></Card>
            ))}
          </div>
        ) : pendingPackages.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><CheckCircle2 className="w-12 h-12 text-success mx-auto mb-3" /><p className="text-muted-foreground">Todas as encomendas foram retiradas!</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {pendingPackages.map((pkg) => (
              <Card key={pkg.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Link to="/packages" className="flex gap-4 flex-1 min-w-0">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <PackagePhoto photoUrl={pkg.photo_url} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-1.5">
                          <p className="font-medium truncate">{pkg.resident?.full_name || 'Morador não identificado'}</p>
                          {pkg.resident?.whatsapp_enabled === false && (
                            <span title="Morador não notificado" className="mt-0.5 flex-shrink-0">
                              <BellOff className="w-4 h-4 text-amber-500" />
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{pkg.resident ? `${pkg.resident.block} - ${pkg.resident.apartment}` : '—'}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(pkg.received_at), { addSuffix: true, locale: ptBR })}</p>
                      </div>
                    </Link>
                    {isSimpleLocker ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="self-center gap-1.5 flex-shrink-0"
                        onClick={(e) => handleAllocateClick(pkg, e)}
                      >
                        <Boxes className="w-4 h-4" />
                        Alocar
                      </Button>
                    ) : (
                      <PackageIcon className="w-5 h-5 text-muted-foreground flex-shrink-0 self-center" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {pendingPackages.length > 0 && (
          <Link to="/packages" className="block"><Button variant="outline" className="w-full">Ver todas as encomendas</Button></Link>
        )}
      </div>

      <LockerDialog
        open={allocateOpen}
        onOpenChange={setAllocateOpen}
        pkg={allocatePkg}
        towerName="Portaria"
        onConfirm={handleConfirmAllocation}
      />
    </div>
  );
}
