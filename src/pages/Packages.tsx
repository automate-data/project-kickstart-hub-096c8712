import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCondominium } from '@/hooks/useCondominium';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Package } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package as PackageIcon, Clock, CheckCircle2, Search, Timer, BellOff, Loader2 } from 'lucide-react';
import { differenceInMinutes, differenceInHours, differenceInDays, startOfDay } from 'date-fns';
import { PickupDialog } from '@/components/PickupDialog';
import { PackageDetailsDialog } from '@/components/PackageDetailsDialog';
import { toast } from 'sonner';
import { PackagePhoto } from '@/components/PackagePhoto';
import { Input } from '@/components/ui/input';

const PAGE_SIZE = 20;

function formatStayDuration(receivedAt: string, pickedUpAt?: string | null): string {
  const start = new Date(receivedAt);
  const end = pickedUpAt ? new Date(pickedUpAt) : new Date();
  const mins = differenceInMinutes(end, start);
  if (mins < 60) return `${mins}min`;
  const hrs = differenceInHours(end, start);
  if (hrs < 24) return `${hrs}h`;
  const days = differenceInDays(end, start);
  return `${days}d`;
}

async function fetchPackagesPage({
  condominiumId,
  status,
  search,
  pageParam = 0,
}: {
  condominiumId: string;
  status: string;
  search: string;
  pageParam?: number;
}) {
  const from = pageParam * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('packages')
    .select(`*, resident:residents(*)`, { count: 'exact' })
    .eq('status', status)
    .eq('condominium_id', condominiumId)
    .order('received_at', { ascending: false })
    .range(from, to);

  // Server-side search not possible with ilike on joined fields,
  // so we fetch the page and let client filter. For search we
  // fetch a larger window to compensate.
  const { data, count, error } = await query;

  if (error) throw error;

  return {
    packages: (data ?? []) as unknown as Package[],
    totalCount: count ?? 0,
    page: pageParam,
  };
}

export default function Packages() {
  const { condominium } = useCondominium();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'pending' | 'picked_up'>('pending');
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [pickupDialogOpen, setPickupDialogOpen] = useState(false);
  const [detailsPackage, setDetailsPackage] = useState<Package | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [pickedUpTodayCount, setPickedUpTodayCount] = useState(0);

  useEffect(() => {
    fetchCounts();
  }, [condominium?.id]);

  const fetchCounts = async () => {
    if (!condominium?.id) {
      setPendingCount(0);
      setPickedUpTodayCount(0);
      return;
    }

    const [pendingRes, pickedUpRes] = await Promise.all([
      supabase
        .from('packages')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('condominium_id', condominium.id),
      supabase
        .from('packages')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'picked_up')
        .eq('condominium_id', condominium.id)
        .gte('picked_up_at', startOfDay(new Date()).toISOString()),
    ]);

    setPendingCount(pendingRes.count ?? 0);
    setPickedUpTodayCount(pickedUpRes.count ?? 0);
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['packages', condominium?.id, filter],
    queryFn: ({ pageParam }) =>
      fetchPackagesPage({
        condominiumId: condominium!.id,
        status: filter,
        search: searchTerm,
        pageParam: pageParam as number,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const fetched = (lastPage.page + 1) * PAGE_SIZE;
      return fetched < lastPage.totalCount ? lastPage.page + 1 : undefined;
    },
    enabled: !!condominium?.id,
  });

  const allPackages = data?.pages.flatMap((p) => p.packages) ?? [];

  const filteredPackages = allPackages.filter((pkg) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const name = pkg.resident?.full_name?.toLowerCase() || '';
    const unit = `${pkg.resident?.block || ''} ${pkg.resident?.apartment || ''}`.toLowerCase();
    const carrier = pkg.carrier?.toLowerCase() || '';
    const tracking = (pkg as any).tracking_code?.toLowerCase() || '';
    return name.includes(term) || unit.includes(term) || carrier.includes(term) || tracking.includes(term);
  });

  const handlePickUpClick = (pkg: Package) => {
    setSelectedPackage(pkg);
    setPickupDialogOpen(true);
  };

  const handleConfirmPickup = async (signatureData: string) => {
    if (!selectedPackage) return;

    const pickedUpAt = new Date().toISOString();

    const { error } = await supabase
      .from('packages')
      .update({
        status: 'picked_up',
        picked_up_at: pickedUpAt,
        picked_up_by: selectedPackage.resident?.full_name || 'Morador',
        signature_data: signatureData,
      })
      .eq('id', selectedPackage.id);

    if (error) {
      toast.error('Erro ao registrar retirada');
      return;
    }

    if (selectedPackage.resident?.phone) {
      try {
        const { data: confirmResult } = await supabase.functions.invoke('send-pickup-confirmation', {
          body: {
            phone: selectedPackage.resident.phone,
            resident_name: selectedPackage.resident.full_name,
            picked_up_at: pickedUpAt,
          },
        });

        await supabase
          .from('packages')
          .update({ pickup_confirmation_sent: confirmResult?.success || false })
          .eq('id', selectedPackage.id);
      } catch (e) {
        console.log('Failed to send pickup confirmation:', e);
      }
    }

    queryClient.invalidateQueries({ queryKey: ['packages'] });
    fetchCounts();
    setSelectedPackage(null);
  };

  const PackageCard = ({ pkg }: { pkg: Package }) => {
    const isPickedUp = pkg.status === 'picked_up';
    return (
      <Card
        className={`overflow-hidden ${isPickedUp ? 'cursor-pointer hover:bg-accent/50 transition-colors' : ''}`}
        onClick={isPickedUp ? () => { setDetailsPackage(pkg); setDetailsDialogOpen(true); } : undefined}
      >
        <CardContent className="p-0">
          <div className="flex">
            <div className="w-24 h-24 flex-shrink-0">
              <PackagePhoto photoUrl={pkg.photo_url} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 p-4 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex items-start gap-1.5">
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {pkg.resident?.full_name || 'Não identificado'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {pkg.resident ? `${pkg.resident.block}/${pkg.resident.apartment}` : '—'}
                    </p>
                  </div>
                  {!isPickedUp && pkg.resident?.whatsapp_enabled === false && (
                    <span title="Morador não notificado" className="mt-0.5">
                      <BellOff className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    </span>
                  )}
                </div>
                {pkg.carrier && (
                  <Badge variant="secondary" className="flex-shrink-0">{pkg.carrier}</Badge>
                )}
              </div>
              {(pkg as any).tracking_code && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{(pkg as any).tracking_code}</p>
              )}
              <div className="flex items-center justify-between mt-2">
                <Badge variant="outline" className="text-xs gap-1">
                  <Timer className="w-3 h-3" />
                  {formatStayDuration(pkg.received_at, pkg.picked_up_at)}
                </Badge>
                {pkg.status === 'pending' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handlePickUpClick(pkg);
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Retirar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Encomendas</h1>
      </div>

      {/* Big number cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-4xl font-bold text-primary">{pendingCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Aguardando retirada</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-4xl font-bold text-primary">{pickedUpTodayCount}</p>
            <p className="text-sm text-muted-foreground mt-1">Retiradas hoje</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por morador, unidade ou transportadora..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs value={filter} onValueChange={(v) => {
        setFilter(v as 'pending' | 'picked_up');
        setSearchTerm('');
      }}>
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1 gap-2">
            <Clock className="w-4 h-4" />
            Aguardando
          </TabsTrigger>
          <TabsTrigger value="picked_up" className="flex-1 gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Retiradas
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-muted rounded" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : allPackages.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <PackageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {filter === 'pending' ? 'Nenhuma encomenda aguardando' : 'Nenhuma encomenda retirada'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredPackages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}

              {/* Load more / end of list */}
              <div className="py-4 text-center">
                {isFetchingNextPage ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                ) : hasNextPage ? (
                  <Button variant="ghost" onClick={() => fetchNextPage()}>
                    Carregar mais
                  </Button>
                ) : allPackages.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Todas as encomendas foram carregadas
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <PickupDialog
        open={pickupDialogOpen}
        onOpenChange={setPickupDialogOpen}
        pkg={selectedPackage}
        onConfirm={handleConfirmPickup}
      />

      <PackageDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        pkg={detailsPackage}
      />
    </div>
  );
}
