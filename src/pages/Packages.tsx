import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCondominium } from '@/hooks/useCondominium';
import { Package } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package as PackageIcon, Clock, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PickupDialog } from '@/components/PickupDialog';
import { toast } from 'sonner';
import { PackagePhoto } from '@/components/PackagePhoto';

export default function Packages() {
  const { condominium } = useCondominium();
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'picked_up'>('pending');
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [pickupDialogOpen, setPickupDialogOpen] = useState(false);

  useEffect(() => {
    fetchPackages();
  }, [filter, condominium?.id]);

  const fetchPackages = async () => {
    if (!condominium?.id) {
      setPackages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data } = await supabase
      .from('packages')
      .select(`*, resident:residents(*)`)
      .eq('status', filter)
      .eq('condominium_id', condominium.id)
      .order('received_at', { ascending: false });

    if (data) {
      setPackages(data as unknown as Package[]);
    }
    setIsLoading(false);
  };

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

    fetchPackages();
    setSelectedPackage(null);
  };

  const PackageCard = ({ pkg }: { pkg: Package }) => (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex">
          <div className="w-24 h-24 flex-shrink-0">
            <PackagePhoto photoUrl={pkg.photo_url} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 p-4 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {pkg.resident?.full_name || 'Não identificado'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {pkg.resident ? `${pkg.resident.block}/${pkg.resident.apartment}` : '—'}
                </p>
              </div>
              {pkg.carrier && (
                <Badge variant="secondary" className="flex-shrink-0">{pkg.carrier}</Badge>
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                {pkg.status === 'picked_up' && pkg.picked_up_at
                  ? format(new Date(pkg.picked_up_at), "dd/MM 'às' HH:mm", { locale: ptBR })
                  : formatDistanceToNow(new Date(pkg.received_at), { addSuffix: true, locale: ptBR })}
              </p>
              {pkg.status === 'pending' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Encomendas</h1>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'pending' | 'picked_up')}>
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
          ) : packages.length === 0 ? (
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
              {packages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
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
    </div>
  );
}
