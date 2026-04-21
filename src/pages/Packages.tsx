import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { insertLog } from '@/lib/logger';
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
  centralLocationId,
  userLocationId,
  pageParam = 0,
}: {
  condominiumId: string;
  status: string;
  search: string;
  centralLocationId?: string | null;
  userLocationId?: string | null;
  pageParam?: number;
}) {
  const from = pageParam * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('packages')
    .select(
      `*, resident:residents(*), events:package_events(*, from_location:locations!from_location_id(name), to_location:locations!to_location_id(name))`,
      { count: 'exact' }
    )
    .eq('condominium_id', condominiumId)
    .order('received_at', { ascending: false })
    .range(from, to);

  if (userLocationId) {
    // Tower-scoped user: only see packages currently at their location
    query = query.eq('status', status).eq('current_location_id', userLocationId);
  } else if (centralLocationId && status === 'pending') {
    // Aguardando na central: pendentes na central OU órfãos (sem location)
    query = query
      .eq('status', 'pending')
      .or(`current_location_id.eq.${centralLocationId},current_location_id.is.null`);
  } else if (centralLocationId && status === 'picked_up') {
    // "Retiradas" da central = saiu da minha custódia (retirado pelo morador OU transferido para bloco)
    query = query.or(
      `status.eq.picked_up,and(status.eq.pending,current_location_id.neq.${centralLocationId})`
    );
  } else {
    query = query.eq('status', status);
  }

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
  const [pendingElsewhereCount, setPendingElsewhereCount] = useState(0);
  const [pickedUpTodayCount, setPickedUpTodayCount] = useState(0);
  const [centralLocationId, setCentralLocationId] = useState<string | null>(null);
  const [isTowerScopedUser, setIsTowerScopedUser] = useState(false);

  // Fetch central location for multi_custody mode + check if user is tower-scoped
  useEffect(() => {
    if (!condominium?.id || condominium.custody_mode !== 'multi_custody') {
      setCentralLocationId(null);
      setIsTowerScopedUser(false);
      return;
    }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const [centralRes, scopedRes] = await Promise.all([
        supabase
          .from('locations')
          .select('id')
          .eq('condominium_id', condominium.id)
          .eq('type', 'central')
          .limit(1)
          .single(),
        user
          ? supabase
              .from('user_roles')
              .select('id')
              .eq('user_id', user.id)
              .eq('condominium_id', condominium.id)
              .not('location_id', 'is', null)
              .is('deleted_at', null)
              .limit(1)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      setCentralLocationId(centralRes.data?.id || null);
      setIsTowerScopedUser((scopedRes.data?.length ?? 0) > 0);
    })();
  }, [condominium?.id, condominium?.custody_mode]);

  useEffect(() => {
    fetchCounts();
  }, [condominium?.id, centralLocationId, isTowerScopedUser]);

  const fetchCounts = async () => {
    if (!condominium?.id) {
      setPendingCount(0);
      setPendingElsewhereCount(0);
      setPickedUpTodayCount(0);
      return;
    }

    let pendingQuery = supabase
      .from('packages')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('condominium_id', condominium.id);

    if (centralLocationId) {
      pendingQuery = pendingQuery.or(
        `current_location_id.eq.${centralLocationId},current_location_id.is.null`
      );
    }

    const elsewhereQuery = centralLocationId && !isTowerScopedUser
      ? supabase
          .from('packages')
          .select('id', { count: 'exact', head: true })
          .eq('condominium_id', condominium.id)
          .eq('status', 'pending')
          .not('current_location_id', 'is', null)
          .neq('current_location_id', centralLocationId)
      : null;

    const todayIso = startOfDay(new Date()).toISOString();

    const pickedUpQuery = centralLocationId
      ? supabase
          .from('packages')
          .select('id', { count: 'exact', head: true })
          .eq('condominium_id', condominium.id)
          .or(
            `and(status.eq.picked_up,picked_up_at.gte.${todayIso}),and(status.eq.pending,current_location_id.neq.${centralLocationId},updated_at.gte.${todayIso})`
          )
      : supabase
          .from('packages')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'picked_up')
          .eq('condominium_id', condominium.id)
          .gte('picked_up_at', todayIso);

    const [pendingRes, pickedUpRes, elsewhereRes] = await Promise.all([
      pendingQuery,
      pickedUpQuery,
      elsewhereQuery ?? Promise.resolve({ count: 0 } as any),
    ]);

    setPendingCount(pendingRes.count ?? 0);
    setPickedUpTodayCount(pickedUpRes.count ?? 0);
    setPendingElsewhereCount(elsewhereRes?.count ?? 0);
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['packages', condominium?.id, filter, centralLocationId],
    queryFn: ({ pageParam }) =>
      fetchPackagesPage({
        condominiumId: condominium!.id,
        status: filter,
        search: searchTerm,
        centralLocationId,
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
    const tracking = pkg.tracking_code?.toLowerCase() || '';
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

    // Log package picked up
    insertLog({
      event_type: 'package_picked_up',
      package_id: selectedPackage.id,
      condominium_id: condominium?.id,
    });

    if (selectedPackage.resident?.phone) {
      try {
        const { data: confirmResult, error: confirmError } = await supabase.functions.invoke('send-pickup-confirmation', {
          body: {
            phone: selectedPackage.resident.phone,
            resident_name: selectedPackage.resident.full_name,
            picked_up_at: pickedUpAt,
            package_id: selectedPackage.id,
            condominium_id: condominium?.id,
          },
        });

        if (confirmError || confirmResult?.error) {
          throw new Error(confirmError?.message || confirmResult?.error || 'Unknown error');
        }

        await supabase
          .from('packages')
          .update({ pickup_confirmation_sent: confirmResult?.success || false })
          .eq('id', selectedPackage.id);
      } catch (e: any) {
        console.error('[Pickup] WhatsApp failed:', e);
      }
    }

    queryClient.invalidateQueries({ queryKey: ['packages'] });
    fetchCounts();
    setSelectedPackage(null);
  };

  const PackageCard = ({ pkg }: { pkg: Package }) => {
    const events = (pkg as any).events as Array<any> | undefined;
    // Transferred-away = pending but not in central anymore (only meaningful in multi_custody)
    const isTransferredAway =
      pkg.status === 'pending' &&
      !!centralLocationId &&
      (pkg as any).current_location_id !== centralLocationId;
    const isPickedUp = pkg.status === 'picked_up';
    const isClickable = isPickedUp || isTransferredAway;

    // Last transfer event leaving the central
    const transferEvent = events
      ?.filter((e) => e.from_location_id === centralLocationId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    const transferredToName = transferEvent?.to_location?.name;

    return (
      <Card
        className={`overflow-hidden ${isClickable ? 'cursor-pointer hover:bg-accent/50 transition-colors' : ''}`}
        onClick={isClickable ? () => { setDetailsPackage(pkg); setDetailsDialogOpen(true); } : undefined}
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
                  {!isClickable && pkg.resident?.whatsapp_enabled === false && (
                    <span title="Morador não notificado" className="mt-0.5">
                      <BellOff className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    </span>
                  )}
                </div>
                {pkg.carrier && (
                  <Badge variant="secondary" className="flex-shrink-0">{pkg.carrier}</Badge>
                )}
              </div>
              {pkg.tracking_code && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{pkg.tracking_code}</p>
              )}
              <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs gap-1">
                  <Timer className="w-3 h-3" />
                  {formatStayDuration(pkg.received_at, pkg.picked_up_at)}
                </Badge>
                {isTransferredAway ? (
                  <Badge className="text-xs gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                    Transferido{transferredToName ? ` para ${transferredToName}` : ''}
                  </Badge>
                ) : isPickedUp ? (
                  <Badge className="text-xs gap-1 bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20 border-green-500/20">
                    Retirada pelo morador
                  </Badge>
                ) : pkg.status === 'pending' ? (
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
                ) : null}
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
            {pendingElsewhereCount > 0 && !isTowerScopedUser && (
              <button
                type="button"
                onClick={() => setFilter('picked_up')}
                className="text-xs text-muted-foreground mt-1 italic hover:text-primary transition-colors underline-offset-2 hover:underline"
              >
                + {pendingElsewhereCount} em outros blocos
              </button>
            )}
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
        centralLocationId={centralLocationId}
      />
    </div>
  );
}
